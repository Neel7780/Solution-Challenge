const fs = require('fs');
const { classifyZonesWithAI, calculateEvacuationRoutes, resolveGuestRoutes } = require('./spatial-agent');

// ============================================================
// TEST BENCH — Visual & Data Inspection Ground
// ============================================================
// Run: node test-bench.js
// This provides a full visual breakdown of how the system
// processes a fire incident from sensor data to guest routes.
// ============================================================

function drawFloorMap(floor, sections, classification, evacuationPlan) {
    const fireSet = new Set(classification.fire_sections);
    const blockedSet = new Set(classification.blocked_exits);

    console.log(`\n${"═".repeat(60)}`);
    console.log(`   FLOOR ${floor.floor} — VISUAL MAP`);
    console.log(`${"═".repeat(60)}`);

    for (const section of floor.sections) {
        const hasFire = fireSet.has(section.id);
        const plan = evacuationPlan.find(p => p.section_id === section.id);
        const sectionIcon = hasFire ? "🔥🔥🔥" : "🟢";
        const priorityTag = plan && plan.priority === "URGENT" ? " [⚡EVACUATE FIRST]" : "";

        console.log(`\n   ┌${"─".repeat(50)}┐`);
        console.log(`   │  ${sectionIcon} ${section.name}${priorityTag}`);
        console.log(`   │  Section ID: ${section.id}`);
        console.log(`   │`);

        // Draw rooms
        const roomLine = section.rooms.map(r => `[${r}]`).join("  ");
        console.log(`   │  Rooms: ${roomLine}`);
        console.log(`   │`);

        // Draw exits with status
        const primaryStatus = blockedSet.has(section.primary_exit) ? "🔴 BLOCKED" : "🟢 CLEAR";
        const secondaryStatus = blockedSet.has(section.secondary_exit) ? "🔴 BLOCKED" : "🟢 CLEAR";
        console.log(`   │  🚪 Primary Exit  (${section.primary_exit}): ${primaryStatus}`);
        console.log(`   │  🚪 Secondary Exit (${section.secondary_exit}): ${secondaryStatus}`);
        console.log(`   │`);

        // Draw assigned route
        if (plan) {
            console.log(`   │  ➡️  ROUTE: All guests → ${plan.exit_name} [${plan.route_type}]`);
        }
        console.log(`   └${"─".repeat(50)}┘`);
    }
}

function drawGuestTable(guestRoutes) {
    console.log(`\n${"═".repeat(60)}`);
    console.log(`   GUEST EVACUATION TABLE`);
    console.log(`${"═".repeat(60)}`);

    // Table header
    console.log(`\n   ${"─".repeat(56)}`);
    console.log(`   | ${"Guest".padEnd(16)} | ${"Room".padEnd(5)} | ${"Exit Route".padEnd(22)} | ${"Status".padEnd(5)} |`);
    console.log(`   ${"─".repeat(56)}`);

    for (const route of guestRoutes) {
        const status = route.in_danger ? "🆘" : "✅";
        const name = route.guest_name.padEnd(16);
        const room = route.room.padEnd(5);
        const exit = route.exit_name.substring(0, 22).padEnd(22);
        console.log(`   | ${name} | ${room} | ${exit} | ${status}    |`);
    }

    console.log(`   ${"─".repeat(56)}`);
}

function drawSensorReadings(sensorData) {
    console.log(`\n${"═".repeat(60)}`);
    console.log(`   LIVE SENSOR READINGS`);
    console.log(`${"═".repeat(60)}\n`);

    for (const sensor of sensorData.sensors) {
        let icon = "🟢";
        if (sensor.status === "WARNING") icon = "🟡";
        if (sensor.status === "CRITICAL") icon = "🔴";

        let reading = sensor.type === "temperature" ? ` (${sensor.reading_celsius}°C)` : "";
        console.log(`   ${icon} [${sensor.id}] ${sensor.location} — ${sensor.type}${reading} → ${sensor.status}`);
    }
}

function drawAIClassification(classification) {
    console.log(`\n${"═".repeat(60)}`);
    console.log(`   AI ZONE CLASSIFICATION`);
    console.log(`${"═".repeat(60)}\n`);

    console.log(`   Severity:       ${classification.severity === "CRITICAL" ? "🔴" : classification.severity === "HIGH" ? "🟠" : "🟡"} ${classification.severity}`);
    console.log(`   Fire Sections:  ${classification.fire_sections.join(', ') || 'None'}`);
    console.log(`   Blocked Exits:  ${classification.blocked_exits.join(', ') || 'None'}`);
    console.log(`   Safe Exits:     ${classification.safe_exits.join(', ')}`);
    console.log(`   AI Reasoning:   ${classification.reasoning}`);
}

function drawSummary(classification, evacuationPlan, guestRoutes) {
    const urgentSections = evacuationPlan.filter(p => p.priority === "URGENT").length;
    const redirectedGuests = guestRoutes.filter(g => g.route_type === "NEIGHBOR_REDIRECT").length;
    const endangeredGuests = guestRoutes.filter(g => g.in_danger).length;

    console.log(`\n${"═".repeat(60)}`);
    console.log(`   MISSION SUMMARY`);
    console.log(`${"═".repeat(60)}\n`);

    console.log(`   📊 Total Sections:        ${evacuationPlan.length}`);
    console.log(`   🔥 Sections with Fire:    ${urgentSections}`);
    console.log(`   🚫 Blocked Exits:         ${classification.blocked_exits.length}`);
    console.log(`   ✅ Safe Exits:            ${classification.safe_exits.length}`);
    console.log(`   👥 Total Guests:          ${guestRoutes.length}`);
    console.log(`   🆘 Guests in Danger:      ${endangeredGuests}`);
    console.log(`   🔀 Guests Redirected:     ${redirectedGuests}`);
    console.log(`   ⏱️  Processing Time:      < 1 second (math layer)`);
    console.log(`\n${"═".repeat(60)}\n`);
}

// ============================================================
// MAIN — Run the full test
// ============================================================
(async () => {
    console.clear();
    console.log(`\n${"═".repeat(60)}`);
    console.log(`   🏨 CRISISRESPOND — SPATIAL AGENT v2 TEST BENCH`);
    console.log(`   📅 ${new Date().toISOString()}`);
    console.log(`${"═".repeat(60)}`);

    // Load data
    const hotelData = JSON.parse(fs.readFileSync('hotel-sections.json', 'utf8'));
    const sensorData = JSON.parse(fs.readFileSync('mock-data.json', 'utf8'));

    console.log(`\n   Property: ${hotelData.property}`);
    console.log(`   Floors: ${hotelData.total_floors}`);
    console.log(`   Guests: ${hotelData.guests.length}`);
    console.log(`   Staff: ${hotelData.staff.length}`);
    console.log(`   Incident: ${sensorData.incident_id}`);

    // Phase 1: Show sensor readings
    drawSensorReadings(sensorData);

    // Phase 2: AI Classification
    console.log(`\n   🧠 Calling Llama 3.3 70B (via Groq Cloud) for zone classification...`);
    const classification = await classifyZonesWithAI(sensorData, hotelData);
    drawAIClassification(classification);

    // Phase 3: Calculate evacuation routes
    const evacuationPlan = calculateEvacuationRoutes(hotelData, classification);

    // Phase 4: Draw floor maps
    for (const floor of hotelData.floors) {
        drawFloorMap(floor, floor.sections, classification, evacuationPlan);
    }

    // Phase 5: Resolve guest routes
    const guestRoutes = resolveGuestRoutes(hotelData, evacuationPlan);
    drawGuestTable(guestRoutes);

    // Phase 6: Summary
    drawSummary(classification, evacuationPlan, guestRoutes);

    // Save full output as JSON for inspection
    const fullOutput = {
        timestamp: new Date().toISOString(),
        incident: sensorData.incident_id,
        ai_classification: classification,
        evacuation_plan: evacuationPlan,
        guest_routes: guestRoutes
    };
    fs.writeFileSync('test-output.json', JSON.stringify(fullOutput, null, 2));
    console.log("   📄 Full JSON output saved to test-output.json\n");
})();
