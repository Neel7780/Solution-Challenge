# AI Council Playground

This folder is an isolated environment to build, test, and perfect our multi-agent AI system (The AI Council) before integrating it into the main CrisisRespond backend.

## The Agents
1. **Spatial Agent**: Analyzes floor plans and sensor data to find safe evacuation routes.
2. **Personnel Agent**: Scans available staff and assigns specific crisis control tasks.
3. **Protocol Agent**: Formulates SOS messages and ensures actions comply with Standard Operating Procedures.
4. **Synthesizer/Verifier Agent**: Takes the outputs of the above three, merges them into a final master plan, and verifies it for safety.

## Testing Strategy
We will write standalone Node.js scripts here. We will pass "mock" data (fake fires, fake sensors) into the agents to see how they react and tune their prompts until they are perfect.
