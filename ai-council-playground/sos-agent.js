async function assessSOSWithAI(sosSignals, classification) {
    if (!sosSignals || sosSignals.length === 0) return [];
    
    console.log("🆘 SOS Agent: Analyzing incoming distress signals...");

    const prompt = `
    You are the SOS Triage AI for an emergency response system.
    Review the incoming distress signals from guests and the current fire zones.
    
    SOS Signals: ${JSON.stringify(sosSignals)}
    Fire Zones: ${JSON.stringify(classification.fire_sections)}
    
    Output a JSON array of triage assessments. Each must have:
    - guest_id
    - status (TRAPPED, INJURED, PANICKED, SAFE)
    - recommended_action (short specific action)
    - priority (CRITICAL, HIGH, MEDIUM)
    
    Output ONLY a valid JSON array or an object containing an array.
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
        let content = data.choices[0].message.content;
        
        let parsed = JSON.parse(content);
        if (!Array.isArray(parsed)) {
            parsed = parsed.assessments || Object.values(parsed)[0];
        }
        
        return parsed || [];
    } catch (e) {
        console.error("SOS Agent Error:", e.message);
        return sosSignals.map(s => ({
            guest_id: s.guest_id,
            status: "TRAPPED",
            recommended_action: "Dispatch rescue team",
            priority: "CRITICAL"
        }));
    }
}

module.exports = { assessSOSWithAI };
