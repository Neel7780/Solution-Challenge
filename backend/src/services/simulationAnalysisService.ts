import logger from '../utils/logger';
import { query } from '../database/connection';
import { GoogleGenerativeAI } from '@google/generative-ai';

/* ─── Types ─── */

export interface AgentSnapshot {
  id: string | number;
  name: string;
  x: number;
  y: number;
  status: 'idle' | 'evacuating' | 'trapped' | 'safe' | 'dead';
  health: number;
  mode: 'manual' | 'ai';
}

export interface FireSnapshot {
  x: number;
  y: number;
  intensity: number;      // 0.0 – 1.0
  spread_radius: number;
}

export interface SimulationMetrics {
  evacuated: number;
  trapped: number;
  casualties: number;
  avg_evacuation_time: number;  // seconds
  fire_coverage_pct: number;    // 0–100
  blocked_exits: string[];
  total_agents: number;
}

export interface SimulationSnapshot {
  timestamp: number;
  agents: AgentSnapshot[];
  fires: FireSnapshot[];
  metrics: SimulationMetrics;
}

export interface SimulationAnalysisRequest {
  snapshot: SimulationSnapshot;
  propertyId: number;
  simulationDuration: number;   // seconds since sim started
  userId?: number;
}

export interface SimulationAnalysisResult {
  severity: 'low' | 'medium' | 'high' | 'critical';
  evacuationEfficiency: number;         // 0–100
  bottlenecks: string[];
  predictedCasualties: number;
  recommendations: string[];
  narrativeSummary: string;
  riskScore: number;                    // 0–100
  timestamp: string;
}

/* ─── Fallback ─── */

const FALLBACK_ANALYSIS: SimulationAnalysisResult = {
  severity: 'high',
  evacuationEfficiency: 50,
  bottlenecks: ['Unable to determine — AI analysis unavailable'],
  predictedCasualties: 0,
  recommendations: ['Ensure all exits are clearly marked', 'Conduct regular evacuation drills'],
  narrativeSummary: 'AI analysis could not be completed. Manual review recommended.',
  riskScore: 75,
  timestamp: new Date().toISOString(),
};

/* ─── Core Analysis Function ─── */

export const analyzeSimulation = async (req: SimulationAnalysisRequest): Promise<SimulationAnalysisResult> => {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';

  if (!apiKey) {
    logger.warn('GEMINI_API_KEY not set. Using fallback simulation analysis.');
    return FALLBACK_ANALYSIS;
  }

  const { snapshot, propertyId, simulationDuration } = req;

  const systemPrompt = `You are an expert Emergency Response Simulation Analyst for a crisis management platform.
You are analyzing a FIRE EVACUATION SIMULATION of a hotel property. The simulation is a 2D top-down view showing rooms, corridors, fire locations, and people (agents).

STRICT RULES:
1. Respond ONLY with valid JSON. No markdown, no explanations outside JSON.
2. Analyze evacuation efficiency, bottlenecks, and risk factors.
3. Provide actionable, concrete recommendations (not generic advice).
4. severity MUST be one of: "low", "medium", "high", "critical"
5. riskScore is 0–100 (0 = no risk, 100 = catastrophic)
6. evacuationEfficiency is 0–100 (100 = perfect evacuation)

JSON STRUCTURE:
{
  "severity": "low" | "medium" | "high" | "critical",
  "evacuationEfficiency": number,
  "bottlenecks": ["string"],
  "predictedCasualties": number,
  "recommendations": ["string"],
  "narrativeSummary": "string",
  "riskScore": number
}`;

  const userPrompt = `SIMULATION STATE (Duration: ${simulationDuration}s, Property ID: ${propertyId}):

AGENTS (${snapshot.agents.length} total):
${snapshot.agents.map(a => `- ${a.name} [${a.id}]: position=(${a.x},${a.y}), status=${a.status}, health=${a.health}%, mode=${a.mode}`).join('\n')}

FIRE SOURCES (${snapshot.fires.length} active):
${snapshot.fires.map(f => `- position=(${f.x},${f.y}), intensity=${(f.intensity * 100).toFixed(0)}%, spread_radius=${f.spread_radius}`).join('\n')}

METRICS:
- Evacuated: ${snapshot.metrics.evacuated}/${snapshot.metrics.total_agents}
- Trapped: ${snapshot.metrics.trapped}
- Casualties: ${snapshot.metrics.casualties}
- Average Evacuation Time: ${snapshot.metrics.avg_evacuation_time.toFixed(1)}s
- Fire Coverage: ${snapshot.metrics.fire_coverage_pct.toFixed(1)}%
- Blocked Exits: ${snapshot.metrics.blocked_exits.length > 0 ? snapshot.metrics.blocked_exits.join(', ') : 'None'}

Analyze this simulation snapshot and provide your structured assessment.`;


  const executeWithRetry = async (attempt = 1): Promise<any> => {
    try {
      const client = new GoogleGenerativeAI(apiKey);
      const genModel = client.getGenerativeModel({ model });

      return await Promise.race([
        genModel.generateContent({
          contents: [
            { role: 'user', parts: [{ text: systemPrompt + '\n\n' + userPrompt }] }
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2048
          }
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 60000)
        )
      ]);
    } catch (error: any) {
      const isTransient = error.message?.includes('503') || error.message?.includes('high demand') || error.message === 'Timeout';
      if (attempt < 3 && isTransient) {
        const delay = attempt * 2000;
        logger.warn(`Gemini analysis transient error (attempt ${attempt}), retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return executeWithRetry(attempt + 1);
      }
      throw error;
    }
  };

  try {
    logger.debug(`Sending simulation analysis request to Gemini for property ${propertyId}. Agents: ${snapshot.agents.length}, Fires: ${snapshot.fires.length}`);

    const result = await executeWithRetry();

    const response = await result.response;
    const content = response.text();
    
    if (!content) {
      logger.error(`Empty response from Gemini for property ${propertyId}`);
      throw new Error('No content in response');
    }

    logger.debug(`Gemini response content for property ${propertyId}: ${content.substring(0, 200)}...`);
    const cleanJson = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .replace(/\n\s*\n/g, ' ')
      .trim();
    const analysis = JSON.parse(cleanJson) as SimulationAnalysisResult;
    analysis.timestamp = new Date().toISOString();

    logger.info(`Simulation analysis complete for property ${propertyId}. Risk: ${analysis.riskScore}, Severity: ${analysis.severity}`);
    return analysis;

  } catch (error: any) {
      if (error.message === 'Timeout') {
        logger.warn(`Gemini simulation analysis timed out for property ${propertyId}. Using fallback.`);
    } else {
        logger.error(`Gemini simulation analysis failed for property ${propertyId}: ${error.message || JSON.stringify(error)}`);
    }
    return { ...FALLBACK_ANALYSIS, timestamp: new Date().toISOString() };
  }
};

/* ─── Persist Simulation Run ─── */

export const saveSimulationRun = async (
  propertyId: number,
  userId: number | null,
  snapshot: SimulationSnapshot,
  analysis: SimulationAnalysisResult,
  durationSeconds: number,
): Promise<number | null> => {
  try {
    const result = await query(
      `INSERT INTO simulation_runs 
       (property_id, started_by, duration_seconds, final_snapshot, ai_analysis,
        evacuation_efficiency, risk_score, total_agents, casualties, evacuated, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'completed')
       RETURNING id`,
      [
        propertyId,
        userId || null,  // Use NULL if userId is not provided
        durationSeconds,
        JSON.stringify(snapshot),
        JSON.stringify(analysis),
        analysis.evacuationEfficiency,
        analysis.riskScore,
        snapshot.metrics.total_agents,
        snapshot.metrics.casualties,
        snapshot.metrics.evacuated,
      ]
    );
    logger.info(`Simulation run saved: ID ${result.rows[0].id}`);
    return result.rows[0].id;
  } catch (error) {
    logger.error('Failed to save simulation run:', error);
    return null;
  }
};

/* ─── Fetch History ─── */

export const getSimulationHistory = async (propertyId: number, limit = 20) => {
  try {
    const result = await query(
      `SELECT id, property_id, started_by, started_at, duration_seconds,
              evacuation_efficiency, risk_score, total_agents, casualties, evacuated, status,
              (ai_analysis->>'severity') as severity,
              (ai_analysis->>'narrativeSummary') as summary
       FROM simulation_runs
       WHERE property_id = $1
       ORDER BY started_at DESC
       LIMIT $2`,
      [propertyId, limit]
    );
    return result.rows;
  } catch (error) {
    logger.error('Failed to fetch simulation history:', error);
    return [];
  }
};
