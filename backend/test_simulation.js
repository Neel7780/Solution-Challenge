const { io } = require('socket.io-client');

const socket = io('http://localhost:3001'); // Ensure this matches your backend port

socket.on('connect', () => {
  console.log('✅ Connected to Crisis Response Backend');

  // Join the property room to receive broadcasts
  socket.emit('join_property', 1);

  const fireEvent = {
    version: "1.0",
    propertyId: 1,
    type: "fire",
    confidence: 0.95,
    description: "Smoke detected in the North Wing Kitchen area near the main gas line.",
    latitude: 40.7128,
    longitude: -74.0060,
    zoneId: 1
  };

  // Wait a moment for the join to register before emitting
  setTimeout(() => {
    console.log('🚀 Sending simulated fire detection event...');
    socket.emit('simulation:event_detected', fireEvent);
  }, 500);
});

socket.on('crisis_reported', (data) => {
  console.log('⚡ FAST PATH: New Incident Created Immediately:', data.incident.id);
  console.log('📍 Location:', data.incident.description);
});

socket.on('incident_enriched', (data) => {
  console.log('🧠 SLOW PATH: Gemini Enrichment Received:');
  console.log('📊 Severity:', data.enrichment.severity);
  console.log('📢 Alert:', data.enrichment.massAlertMessage);
  console.log('📋 Responder Plan:', data.enrichment.responderActionPlan);
  process.exit(0);
});

setTimeout(() => {
  console.log('❌ Timeout: Did not receive enrichment in 10 seconds.');
  process.exit(1);
}, 10000);
