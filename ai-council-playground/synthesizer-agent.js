async function synthesizeVerdictWithAI(classification, guestRoutes, personnelAssignments, sosAssessments) {
    console.log("⚖️ Synthesizer Agent: Consolidating council verdict...");

    const prompt = `
    You are the Chief AI Synthesizer for an emergency response council. 
    You receive inputs from the Spatial Agent (Evacuation/Zones) and the Personnel Agent (Staff Assignments).
    Your job is to synthesize these into a single executive verdict.
    
    Inputs:
    1. Spatial Classifications: ${JSON.stringify(classification)}
    2. Recommended Guest Routes: ${JSON.stringify(guestRoutes)}
    3. Personnel Assignments: ${JSON.stringify(personnelAssignments)}
    4. Active SOS Signals: ${JSON.stringify(sosAssessments)}
    
    Output ONLY a JSON object with:
    - overall_severity (CRITICAL, WARNING, ALL_CLEAR)
    - executive_summary (2-3 sentences summarizing the situation and actions taken)
    - action_required_by_authorities (boolean - whether to call external fire department/police)
    `;

    try {
        const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1,
                response_format: { type: "json_object" }
            })
        });
        
        const data = await aiResponse.json();
        return JSON.parse(data.choices[0].message.content);
    } catch (e) {
        console.error("Synthesizer Agent Error:", e.message);
        return {
            overall_severity: "CRITICAL",
            executive_summary: "Emergency detected. Initiating standard evacuation and personnel response.",
            action_required_by_authorities: true
        };
    }
}

module.exports = { synthesizeVerdictWithAI };
