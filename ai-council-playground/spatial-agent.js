require('dotenv').config();
const fs = require('fs');
const https = require('https');

// ============================================================
// SPATIAL AGENT v3 — Section-Based Evacuation System
// Model: Llama 3.3 70B via Groq (Free Cloud API)
// ============================================================

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MODEL_NAME = "llama-3.3-70b-versatile";

if (!GROQ_API_KEY) {
    console.error("ERROR: Add GROQ_API_KEY to your .env file");
    process.exit(1);
}

// ============================================================
// AI LAYER: Groq + Llama 3.3 classifies zones (runs ONCE)
// ============================================================
function callGroq(systemPrompt, userPrompt) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({
            model: MODEL_NAME,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.1,
            max_tokens: 512,
            response_format: { type: "json_object" }
        });

        const options = {
            hostname: "api.groq.com",
            path: "/openai/v1/chat/completions",
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${GROQ_API_KEY}`
            }
        };

        const req = https.request(options, (res) => {
            let data = "";
            res.on("data", (chunk) => { data += chunk; });
            res.on("end", () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.error) {
                        reject(new Error(parsed.error.message));
                        return;
                    }
                    const content = parsed.choices[0].message.content;
                    resolve(JSON.parse(content));
                } catch (e) {
                    reject(new Error("Failed to parse Groq response: " + data.substring(0, 300)));
                }
            });
        });

        req.on("error", (e) => reject(e));
        req.write(payload);
        req.end();
    });
}

async function classifyZonesWithAI(sensorData, hotelData) {
    const systemPrompt = `You are a fire safety zone classifier for an Enterprise Crisis Management System.
Your ONLY job is to read sensor data and classify which building sections have fire, which exits are blocked, and which exits are safe.

RULES:
1. If a sensor in a section reads CRITICAL for smoke or temperature > 100C, that section has fire.
2. If an exit is IN or ADJACENT to a fire section and sensors near it are CRITICAL or WARNING, mark it BLOCKED.
3. All other exits are SAFE.
4. Severity is CRITICAL if more than half the exits on any floor are blocked, HIGH if any fire exists, LOW otherwise.
5. Respond with ONLY valid JSON matching the exact structure requested.`;

    const userPrompt = `Classify this crisis situation.

HOTEL EXITS:
${JSON.stringify(hotelData.exits, null, 2)}

FLOOR SECTIONS:
${JSON.stringify(hotelData.floors, null, 2)}

LIVE SENSOR DATA:
${JSON.stringify(sensorData.sensors, null, 2)}

Respond with ONLY this JSON:
{
  "fire_sections": ["section IDs with fire"],
  "blocked_exits": ["exit IDs that are blocked"],
  "safe_exits": ["exit IDs that are safe"],
  "severity": "LOW or MEDIUM or HIGH or CRITICAL",
  "reasoning": "one sentence explanation"
}`;

    try {
        console.log(`   Using model: ${MODEL_NAME} (via Groq Cloud)`);
        const startTime = Date.now();
        const result = await callGroq(systemPrompt, userPrompt);
        const elapsed = Date.now() - startTime;
        console.log(`   ⚡ AI responded in ${elapsed}ms`);

        if (!result.fire_sections || !result.blocked_exits || !result.safe_exits) {
            throw new Error("AI response missing required fields");
        }
        return result;
    } catch (error) {
        console.error(`\n❌ [AI ERROR] ${error.message}`);
        console.log("   ⚠️ Using local fallback classifier instead.\n");
        return fallbackClassifier(sensorData, hotelData);
    }
}

// ============================================================
// FALLBACK: Local rule-based classifier (no AI needed)
// ============================================================
function fallbackClassifier(sensorData, hotelData) {
    const fireSections = new Set();
    const blockedExits = new Set();
    const allExitIds = Object.keys(hotelData.exits);

    for (const sensor of sensorData.sensors) {
        if (sensor.status === "CRITICAL") {
            for (const floor of hotelData.floors) {
                for (const section of floor.sections) {
                    if (sensor.section_id === section.id) {
                        fireSections.add(section.id);
                        blockedExits.add(section.primary_exit);
                        if (sensor.type === "smoke" || (sensor.type === "temperature" && sensor.reading_celsius > 150)) {
                            blockedExits.add(section.secondary_exit);
                        }
                    }
                }
            }
        }
        if (sensor.status === "WARNING") {
            for (const floor of hotelData.floors) {
                for (const section of floor.sections) {
                    if (sensor.section_id === section.id) {
                        blockedExits.add(section.primary_exit);
                    }
                }
            }
        }
    }

    const safeExits = allExitIds.filter(e => !blockedExits.has(e));

    return {
        fire_sections: Array.from(fireSections),
        blocked_exits: Array.from(blockedExits),
        safe_exits: safeExits,
        severity: fireSections.size > 2 ? "CRITICAL" : fireSections.size > 0 ? "HIGH" : "LOW",
        reasoning: `Fallback classifier: ${fireSections.size} sections with fire, ${blockedExits.size} exits blocked.`
    };
}

// ============================================================
// MATH LAYER: Section-based evacuation
// ============================================================
function calculateEvacuationRoutes(hotelData, classification) {
    const { fire_sections, blocked_exits } = classification;
    const blockedSet = new Set(blocked_exits);
    const fireSet = new Set(fire_sections);

    const evacuationPlan = [];

    for (const floor of hotelData.floors) {
        for (const section of floor.sections) {
            const sectionPlan = {
                section_id: section.id,
                section_name: section.name,
                floor: floor.floor,
                has_fire: fireSet.has(section.id),
                priority: fireSet.has(section.id) ? "URGENT" : "NORMAL",
                assigned_exit: null,
                exit_name: null,
                route_type: null,
                rooms_affected: section.rooms
            };

            if (!blockedSet.has(section.primary_exit)) {
                sectionPlan.assigned_exit = section.primary_exit;
                sectionPlan.exit_name = hotelData.exits[section.primary_exit].name;
                sectionPlan.route_type = "PRIMARY";
            }
            else if (!blockedSet.has(section.secondary_exit)) {
                sectionPlan.assigned_exit = section.secondary_exit;
                sectionPlan.exit_name = hotelData.exits[section.secondary_exit].name;
                sectionPlan.route_type = "SECONDARY";
            }
            else {
                let found = false;
                for (const neighborId of section.neighbor_sections) {
                    const neighbor = floor.sections.find(s => s.id === neighborId);
                    if (neighbor) {
                        if (!blockedSet.has(neighbor.primary_exit)) {
                            sectionPlan.assigned_exit = neighbor.primary_exit;
                            sectionPlan.exit_name = hotelData.exits[neighbor.primary_exit].name;
                            sectionPlan.route_type = "NEIGHBOR_REDIRECT";
                            found = true;
                            break;
                        } else if (!blockedSet.has(neighbor.secondary_exit)) {
                            sectionPlan.assigned_exit = neighbor.secondary_exit;
                            sectionPlan.exit_name = hotelData.exits[neighbor.secondary_exit].name;
                            sectionPlan.route_type = "NEIGHBOR_REDIRECT";
                            found = true;
                            break;
                        }
                    }
                }
                if (!found) {
                    sectionPlan.assigned_exit = "NONE";
                    sectionPlan.exit_name = "ALL EXITS BLOCKED — SHELTER IN PLACE";
                    sectionPlan.route_type = "SHELTER";
                }
            }

            evacuationPlan.push(sectionPlan);
        }
    }

    evacuationPlan.sort((a, b) => {
        if (a.priority === "URGENT" && b.priority !== "URGENT") return -1;
        if (b.priority === "URGENT" && a.priority !== "URGENT") return 1;
        return 0;
    });

    return evacuationPlan;
}

// ============================================================
// GUEST RESOLVER
// ============================================================
function resolveGuestRoutes(hotelData, evacuationPlan) {
    const guestRoutes = [];

    for (const guest of hotelData.guests) {
        let guestSection = null;
        for (const floor of hotelData.floors) {
            for (const section of floor.sections) {
                if (section.rooms.includes(guest.room)) {
                    guestSection = section.id;
                    break;
                }
            }
            if (guestSection) break;
        }

        const plan = evacuationPlan.find(p => p.section_id === guestSection);

        guestRoutes.push({
            guest_id: guest.id,
            guest_name: guest.name,
            room: guest.room,
            floor: guest.floor,
            section: guestSection,
            assigned_exit: plan ? plan.assigned_exit : "UNKNOWN",
            exit_name: plan ? plan.exit_name : "UNKNOWN",
            route_type: plan ? plan.route_type : "UNKNOWN",
            priority: plan ? plan.priority : "NORMAL",
            in_danger: plan ? plan.has_fire : false
        });
    }

    guestRoutes.sort((a, b) => {
        if (a.in_danger && !b.in_danger) return -1;
        if (b.in_danger && !a.in_danger) return 1;
        return 0;
    });

    return guestRoutes;
}

// ============================================================
// EXPORT for test-bench
// ============================================================
module.exports = { classifyZonesWithAI, calculateEvacuationRoutes, resolveGuestRoutes };

// ============================================================
// STANDALONE RUN
// ============================================================
if (require.main === module) {
    (async () => {
        const hotelData = JSON.parse(fs.readFileSync('hotel-sections.json', 'utf8'));
        const sensorData = JSON.parse(fs.readFileSync('mock-data.json', 'utf8'));

        console.log("🔥 INCIDENT TRIGGERED — Spatial Agent v3 Booting...\n");

        console.log("🧠 [AI LAYER] Classifying zones with Llama 3.3 70B (Groq)...");
        const classification = await classifyZonesWithAI(sensorData, hotelData);

        console.log(`   🚨 Severity: ${classification.severity}`);
        console.log(`   🔥 Fire Sections: ${classification.fire_sections.join(', ') || 'None'}`);
        console.log(`   🚫 Blocked Exits: ${classification.blocked_exits.join(', ') || 'None'}`);
        console.log(`   ✅ Safe Exits: ${classification.safe_exits.join(', ')}`);
        console.log(`   💡 Reasoning: ${classification.reasoning}\n`);

        console.log("🗺️ [MATH LAYER] Calculating section-based evacuation...");
        const evacuationPlan = calculateEvacuationRoutes(hotelData, classification);

        for (const plan of evacuationPlan) {
            const icon = plan.has_fire ? "🔥" : "✅";
            const priority = plan.priority === "URGENT" ? " ⚡URGENT" : "";
            console.log(`   ${icon} ${plan.section_name} (${plan.section_id})${priority}`);
            console.log(`      → Exit: ${plan.exit_name} [${plan.route_type}]`);
            console.log(`      → Rooms: ${plan.rooms_affected.join(', ')}\n`);
        }

        console.log("👥 [GUEST ROUTER] Assigning personalized exit to each guest...");
        const guestRoutes = resolveGuestRoutes(hotelData, evacuationPlan);

        for (const route of guestRoutes) {
            const danger = route.in_danger ? " 🆘 IN DANGER" : "";
            console.log(`   ${route.guest_name} (Room ${route.room})${danger}`);
            console.log(`      → Go to: ${route.exit_name} [${route.route_type}]\n`);
        }

        console.log("==========================================");
        console.log("✅ EVACUATION PLAN COMPLETE");
        console.log("==========================================");
    })();
}
