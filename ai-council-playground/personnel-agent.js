const fs = require('fs');

async function assignPersonnelWithAI(sensorData, classification, sosAssessments) {
    console.log("👮 Personnel Agent: Deploying staff based on crisis zones...");
    
    // Mock personnel list
    const personnel = [
        { id: "P1", role: "Fire Warden", status: "Available", location: "Ground Floor" },
        { id: "P2", role: "Security Team Alpha", status: "Available", location: "Lobby" },
        { id: "P3", role: "Medical Staff", status: "Available", location: "Clinic" },
        { id: "P4", role: "Maintenance", status: "Available", location: "Basement" }
    ];

    const prompt = `
    You are the Personnel Management AI for an emergency response system.
    Review the current zone classifications and assign tasks to available personnel.
    
    Available Personnel: ${JSON.stringify(personnel)}
    Zone Status: ${JSON.stringify(classification)}
    Active Sensors: ${JSON.stringify(sensorData.sensors.filter(s => s.status === 'CRITICAL'))}
    Active SOS Signals: ${JSON.stringify(sosAssessments)}
    
    Output a JSON array of task assignments. Each assignment must have:
    - personnel_id
    - role
    - assigned_zone
    - task_description (short, action-oriented)
    - priority (HIGH, MEDIUM, LOW)
    
    Output ONLY a valid JSON array or object containing an array.
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
                temperature: 0.2,
                response_format: { type: "json_object" }
            })
        });
        
        const data = await aiResponse.json();
        let content = data.choices[0].message.content;
        
        let parsed = JSON.parse(content);
        if (!Array.isArray(parsed)) {
            // Check if it's wrapped in an object like { "assignments": [...] }
            parsed = parsed.assignments || Object.values(parsed)[0];
        }
        
        return parsed || [];
    } catch (e) {
        console.error("Personnel Agent Error:", e.message);
        // Fallback assignments
        return [
            { personnel_id: "P1", role: "Fire Warden", assigned_zone: "ALL", task_description: "Evacuate building immediately", priority: "HIGH" }
        ];
    }
}

module.exports = { assignPersonnelWithAI };
