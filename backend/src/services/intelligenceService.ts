import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '../utils/logger';
import { query } from '../database/connection';

export interface EnrichmentData {
  severity: 'low' | 'medium' | 'high' | 'critical';
  massAlertMessage: string;
  responderActionPlan: string;
  evacuationRoutes?: {
    guestEmergencyPlan: string[];
    staffEvacuationPlan: string[];
    safeExits: string[];
    tips: string[];
  };
}

const FALLBACK_ENRICHMENT: EnrichmentData = {
  severity: 'high',
  massAlertMessage: "EMERGENCY DETECTED. Please evacuate immediately via the nearest safe exit and follow all staff instructions.",
  responderActionPlan: "1. Dispatch emergency teams to the affected area. 2. Begin full property evacuation protocols. 3. Verify all zones are clear.",
  evacuationRoutes: {
    guestEmergencyPlan: [
      "Stay calm and alert.",
      "Follow the illuminated exit signs.",
      "Do not use elevators.",
      "Once outside, proceed to the designated assembly point."
    ],
    staffEvacuationPlan: [
      "Security: Clear the North wing and assist elderly occupants.",
      "Staff: Proceed to assembly point and conduct headcount.",
      "Responders: Deploy fire suppression systems in Zone 2."
    ],
    safeExits: ["Main Entrance", "North Stairwell", "South Fire Escape"],
    tips: [
      "Stay low to the ground if there is smoke.",
      "Touch doors with the back of your hand before opening.",
      "If you are trapped, seal the door with wet cloths."
    ]
  }
};

export const enrichIncident = async (incidentId: number, aggregatedState: any): Promise<EnrichmentData> => {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';

  if (!apiKey) {
    logger.warn('GEMINI_API_KEY not set. Using fallback enrichment.');
    return FALLBACK_ENRICHMENT;
  }

  const systemPrompt = `You are an expert Emergency Response AI for a premium property management system.
Analyze the crisis data and provide structured intelligence.

STRICT RULES:
1. Respond ONLY with valid JSON.
2. Do not include any explanations, preambles, or markdown formatting outside the JSON.
3. SEVERITY MUST be one of: "low", "medium", "high", "critical".
4. massAlertMessage should be concise and instructional for occupants.
5. responderActionPlan should be clear, bulleted steps for security teams.
6. evacuationRoutes MUST be based on the provided floor_plan_data (if available).

JSON STRUCTURE:
{
  "severity": "low" | "medium" | "high" | "critical",
  "massAlertMessage": "string",
  "responderActionPlan": "string",
  "evacuationRoutes": {
    "guestEmergencyPlan": ["string"],
    "staffEvacuationPlan": ["string"],
    "safeExits": ["string"],
    "tips": ["string"]
  }
}`;

  const userPrompt = `CONTEXT:
Property Context (Floor Plan Data): ${JSON.stringify(aggregatedState.propertyContext || {})}
Active Users: ${aggregatedState.activeUsersCount || 0}
Detections: ${JSON.stringify(aggregatedState.lastEvents || [])}
Incident Description: ${aggregatedState.description || 'Fire detected'}

Respond with ONLY a valid JSON object, no markdown or additional text.`;

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
            temperature: 0.2,
            maxOutputTokens: 1024
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
        logger.warn(`Gemini enrichment transient error (attempt ${attempt}), retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return executeWithRetry(attempt + 1);
      }
      throw error;
    }
  };

  try {
    const result = await executeWithRetry();

    const content = result?.response?.text?.();
    if (!content) {
      throw new Error('No content in response');
    }

    const cleanJson = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .replace(/\n\s*\n/g, ' ')
      .trim();
    const enrichment = JSON.parse(cleanJson) as EnrichmentData;

    await query(
      `UPDATE incidents 
       SET severity = $1, 
           mass_alert_message = $2, 
           responder_action_plan = $3,
           evacuation_routes = $4
       WHERE id = $5`,
      [
        enrichment.severity,
        enrichment.massAlertMessage,
        enrichment.responderActionPlan,
        enrichment.evacuationRoutes ? JSON.stringify(enrichment.evacuationRoutes) : null,
        incidentId
      ]
    );

    logger.info(`Incident ${incidentId} enriched by Gemini. Severity: ${enrichment.severity}`);
    return enrichment;

  } catch (error: any) {
    if (error.message === 'Timeout') {
      logger.warn(`Gemini enrichment timed out for incident ${incidentId}. Using fallback.`);
    } else {
      logger.error(`Gemini enrichment failed for incident ${incidentId}:`, error.message);
    }

    await query(
      `UPDATE incidents 
       SET severity = $1, 
           mass_alert_message = $2, 
           responder_action_plan = $3,
           evacuation_routes = $4
       WHERE id = $5`,
      [
        FALLBACK_ENRICHMENT.severity,
        FALLBACK_ENRICHMENT.massAlertMessage,
        FALLBACK_ENRICHMENT.responderActionPlan,
        JSON.stringify(FALLBACK_ENRICHMENT.evacuationRoutes),
        incidentId
      ]
    );

    return FALLBACK_ENRICHMENT;
  }
};
