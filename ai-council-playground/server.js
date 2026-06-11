require('dotenv').config();
const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { classifyZonesWithAI, calculateEvacuationRoutes, resolveGuestRoutes } = require('./spatial-agent');
const { assignPersonnelWithAI } = require('./personnel-agent');
const { synthesizeVerdictWithAI } = require('./synthesizer-agent');
const { assessSOSWithAI } = require('./sos-agent');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));

// Store latest state
let latestState = null;
let hotelData = null;
let activeSOS = []; // Store incoming distress signals

// Broadcast to all connected clients
function broadcast(data) {
    wss.clients.forEach(client => {
        if (client.readyState === 1) {
            client.send(JSON.stringify(data));
        }
    });
}

// Run the full AI pipeline
async function runPipeline() {
    const hotelData = JSON.parse(fs.readFileSync('hotel-sections.json', 'utf8'));
    const sensorData = JSON.parse(fs.readFileSync('mock-data.json', 'utf8'));

    console.log("\n🔥 Running AI Pipeline...");
    const classification = await classifyZonesWithAI(sensorData, hotelData);
    const evacuationPlan = calculateEvacuationRoutes(hotelData, classification);
    const guestRoutes = resolveGuestRoutes(hotelData, evacuationPlan);

    const sosAssessments = await assessSOSWithAI(activeSOS, classification);
    const personnelAssignments = await assignPersonnelWithAI(sensorData, classification, sosAssessments);
    const councilVerdict = await synthesizeVerdictWithAI(classification, guestRoutes, personnelAssignments, sosAssessments);

    latestState = {
        timestamp: new Date().toISOString(),
        hotel: hotelData,
        sensors: sensorData,
        classification,
        evacuationPlan,
        guestRoutes,
        sosAssessments,
        personnelAssignments,
        councilVerdict
    };

    console.log("✅ Pipeline complete. Broadcasting to dashboard...");
    broadcast({ type: "UPDATE", data: latestState });
    return latestState;
}

// API: Get current state
app.get('/api/state', async (req, res) => {
    if (!latestState) await runPipeline();
    res.json(latestState);
});

// API: Trigger re-analysis (called by YOLO when fire detected)
app.post('/api/trigger', async (req, res) => {
    console.log("🚨 TRIGGER received from CCTV/YOLO!");
    
    // If YOLO sends sensor updates, merge them
    if (req.body && req.body.new_sensor) {
        const sensorData = JSON.parse(fs.readFileSync('mock-data.json', 'utf8'));
        const exists = sensorData.sensors.some(s => s.id === req.body.new_sensor.id);
        if (!exists) {
            sensorData.sensors.push(req.body.new_sensor);
            fs.writeFileSync('mock-data.json', JSON.stringify(sensorData, null, 2));
            console.log(`   Added sensor: ${req.body.new_sensor.id} at ${req.body.new_sensor.location}`);
        }
    }

    const state = await runPipeline();
    res.json({ status: "ok", state });
});

// API: Simulate fire in a section (for testing from the UI)
app.post('/api/simulate-fire', async (req, res) => {
    const { section_id, severity } = req.body;
    const sensorData = JSON.parse(fs.readFileSync('mock-data.json', 'utf8'));

    const newSensors = [
        {
            id: `SIM-SMOKE-${section_id}`,
            section_id: section_id,
            location: `Simulated fire in ${section_id}`,
            type: "smoke",
            status: severity || "CRITICAL"
        },
        {
            id: `SIM-TEMP-${section_id}`,
            section_id: section_id,
            location: `Simulated fire in ${section_id}`,
            type: "temperature",
            reading_celsius: 250,
            status: severity || "CRITICAL"
        }
    ];

    for (const s of newSensors) {
        const exists = sensorData.sensors.some(x => x.id === s.id);
        if (!exists) sensorData.sensors.push(s);
    }

    fs.writeFileSync('mock-data.json', JSON.stringify(sensorData, null, 2));
    console.log(`🔥 SIMULATED FIRE in ${section_id}`);

    const state = await runPipeline();
    res.json({ status: "ok", state: latestState });
});

app.post('/api/trigger-sos', async (req, res) => {
    const { guest_id, room, message } = req.body;
    activeSOS.push({ guest_id, room, message, time: new Date().toISOString() });
    await runPipeline();
    res.json({ status: "ok", state: latestState });
});

// Resets everything to Safe
app.post('/api/reset', async (req, res) => {
    activeSOS = [];
    hotelData = JSON.parse(fs.readFileSync(path.join(__dirname, 'floor_2_config.json'), 'utf-8'));
    const sensorData = {
        incident_id: "FIRE-2026-001",
        timestamp: new Date().toISOString(),
        property: "Grand Hotel Main Building",
        trigger: "smoke_detector",
        sensors: [
            { id: "S1", section_id: "F2-SA", location: "Floor 2 North Wing Corridor", type: "smoke", status: "CLEAR" },
            { id: "S2", section_id: "F2-SA", location: "Floor 2 North Wing Corridor", type: "temperature", reading_celsius: 22, status: "CLEAR" },
            { id: "S3", section_id: "F2-SA", location: "Near Exit E4 (North Stairwell)", type: "smoke", status: "CLEAR" },
            { id: "S4", section_id: "F2-SB", location: "Floor 2 South Wing Corridor", type: "smoke", status: "CLEAR" },
            { id: "S5", section_id: "F2-SB", location: "Near Exit E6 (South Fire Escape)", type: "smoke", status: "CLEAR" },
            { id: "S6", section_id: "F1-SA", location: "Ground North Wing", type: "smoke", status: "CLEAR" },
            { id: "S7", section_id: "F1-SB", location: "Ground South Wing", type: "smoke", status: "CLEAR" },
            { id: "S8", section_id: "F3-SA", location: "Floor 3 North Wing", type: "smoke", status: "CLEAR" },
            { id: "S9", section_id: "F3-SB", location: "Floor 3 South Wing", type: "smoke", status: "CLEAR" }
        ]
    };
    fs.writeFileSync('mock-data.json', JSON.stringify(sensorData, null, 2));
    console.log("🔄 Scenario reset to all-clear.");
    const state = await runPipeline();
    res.json({ status: "ok", state });
});

// Serve Editor UI
app.get('/editor', (req, res) => {
    res.sendFile(path.join(__dirname, 'editor.html'));
});

// Serve Guest Mobile App
app.get('/guest', (req, res) => {
    res.sendFile(path.join(__dirname, 'guest-app.html'));
});

// API: AI Auto-Map (Simulated Vision Model for Floor Plans)
app.post('/api/auto-map', (req, res) => {
    // Note: Groq recently decommissioned their Llama 3.2 Vision models.
    // For this prototype, we simulate the Vision AI detecting standard hotel elements.
    console.log("🤖 Llama Vision Simulation: Analyzing floor plan layout...");
    setTimeout(() => {
        res.json({
            status: "ok",
            items: [
                { type: 'section', id: 'S1', name: 'North Wing', x: 0.1, y: 0.1, w: 0.8, h: 0.35 },
                { type: 'section', id: 'S2', name: 'South Wing', x: 0.1, y: 0.55, w: 0.8, h: 0.35 },
                { type: 'corridor', id: 'C1', name: 'Main Hallway', x: 0.2, y: 0.45, w: 0.6, h: 0.1 },
                { type: 'room', id: 'R1', name: 'Room 201', x: 0.15, y: 0.15, w: 0.15, h: 0.25 },
                { type: 'room', id: 'R2', name: 'Room 202', x: 0.35, y: 0.15, w: 0.15, h: 0.25 },
                { type: 'room', id: 'R3', name: 'Room 203', x: 0.15, y: 0.6, w: 0.15, h: 0.25 },
                { type: 'room', id: 'R4', name: 'Room 204', x: 0.35, y: 0.6, w: 0.15, h: 0.25 },
                { type: 'exit', id: 'E1', name: 'West Fire Exit', x: 0.05, y: 0.5, w: 0, h: 0 },
                { type: 'exit', id: 'E2', name: 'East Main Exit', x: 0.95, y: 0.5, w: 0, h: 0 }
            ]
        });
    }, 1500); // simulate API delay
});

// API: AI Pathfinding
app.post('/api/ai-path', async (req, res) => {
    const { graph, routable, startIdx, endIdx } = req.body;
    
    console.log(`🤖 Llama Pathfinding: Calculating route from ${routable[startIdx].id} to ${routable[endIdx].id}`);
    
    // We send the graph data to Llama 3.3 to determine the best path
    const prompt = `
    You are an emergency evacuation AI. Find the shortest path from start node to end node.
    Nodes: ${JSON.stringify(routable.map((r, i) => ({ idx: i, id: r.id, type: r.type })))}
    Edges (Adjacency List with distances): ${JSON.stringify(graph)}
    Start Node Index: ${startIdx}
    End Node Index: ${endIdx}
    
    Output ONLY a valid JSON array of node indices representing the path in order. Example: [0, 2, 4]
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
                response_format: { type: "json_object" } // we ask for JSON array, but JSON object is safer for APIs
            })
        });
        
        const data = await aiResponse.json();
        let content = data.choices[0].message.content;
        
        // Extract array from possible JSON object wrapper if needed
        let pathIndices = [];
        try {
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed)) pathIndices = parsed;
            else if (parsed.path) pathIndices = parsed.path;
            else pathIndices = Object.values(parsed)[0]; // fallback
        } catch (e) {
            // fallback to Dijkstra if AI formats badly
            console.log("AI format error, falling back to local calculation.");
            pathIndices = [startIdx, endIdx]; // dummy fallback
        }
        
        console.log(`   ⚡ AI calculated path: ${pathIndices.join(' -> ')}`);
        res.json({ status: "ok", path: pathIndices });
    } catch (e) {
        console.error("AI Pathfinding error:", e);
        res.status(500).json({ error: e.message });
    }
});

// API: Upload/save floor plan configuration from the editor
app.post('/api/upload-floor', (req, res) => {
    const config = req.body;
    const filename = `floor_${config.floor}_config.json`;
    fs.writeFileSync(filename, JSON.stringify(config, null, 2));
    console.log(`📐 Floor plan saved: ${filename}`);
    console.log(`   Property: ${config.property}`);
    console.log(`   Floor: ${config.floor}`);
    console.log(`   Sections: ${config.sections?.length || 0}`);
    console.log(`   Exits: ${config.exits?.length || 0}`);
    console.log(`   Rooms: ${config.rooms?.length || 0}`);
    res.json({ status: "ok", filename });
});

// Serve the visualizer
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'visualizer.html'));
});

// WebSocket connection
wss.on('connection', (ws) => {
    console.log("📡 Dashboard connected via WebSocket");
    if (latestState) {
        ws.send(JSON.stringify({ type: "UPDATE", data: latestState }));
    }
});

const PORT = 3333;
server.listen(PORT, async () => {
    console.log(`\n${"═".repeat(50)}`);
    console.log(`  🏨 CrisisRespond AI Visualizer`);
    console.log(`  🌐 Open: http://localhost:${PORT}`);
    console.log(`  📡 WebSocket: ws://localhost:${PORT}`);
    console.log(`  🔥 Trigger API: POST http://localhost:${PORT}/api/trigger`);
    console.log(`${"═".repeat(50)}\n`);
    await runPipeline();
});
