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
  const apiKey = process.env.LLM_API_KEY;
  const baseUrl = process.env.LLM_BASE_URL || 'https://api.groq.com/openai/v1';
  const model = process.env.LLM_MODEL || 'llama-3.3-70b-versatile';

  if (!apiKey) {
    logger.warn('LLM_API_KEY not set. Using fallback enrichment.');
    return FALLBACK_ENRICHMENT;
  }

  const systemPrompt = `
    You are an expert Emergency Response AI for a premium property management system.
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
    }
  `;

  const userPrompt = `
    CONTEXT:
    Property Context (Floor Plan Data): ${JSON.stringify(aggregatedState.propertyContext || {})}
    Active Users: ${aggregatedState.activeUsersCount || 0}
    Detections: ${JSON.stringify(aggregatedState.lastEvents || [])}
    Incident Description: ${aggregatedState.description || 'Fire detected'}
  `;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout for enrichment

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      })
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error(`LLM API Error (${response.status}): ${errorBody}`);
      throw new Error(`LLM API returned ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Clean potential markdown if the model ignored the system prompt
    const cleanJson = content.replace(/```json|```/g, '').trim();
    const enrichment = JSON.parse(cleanJson) as EnrichmentData;

    // Persist to database
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

    logger.info(`Incident ${incidentId} enriched by ${model}. Severity: ${enrichment.severity}`);
    return enrichment;

  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      logger.warn(`LLM enrichment timed out for incident ${incidentId}. Using fallback.`);
    } else {
      logger.error(`LLM enrichment failed for incident ${incidentId}:`, error);
    }

    // Fallback: Still update DB so the UI has something
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
