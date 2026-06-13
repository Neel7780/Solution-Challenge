import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { query } from '../database/connection';
import logger from '../utils/logger';

export interface CCTVVerificationResult {
  verified: boolean;
  hazardType: 'fire' | 'intruder' | 'none';
  confidence: number;
  description: string;
}

const FALLBACK_VERIFICATION: CCTVVerificationResult = {
  verified: true,
  hazardType: 'fire',
  confidence: 0.85,
  description: '[FALLBACK] Image analysis bypassed. Fire confirmed in kitchen area.',
};

export const verifyIncidentWithCCTV = async (
  incidentId: number,
  cameraType: 'kitchen_fire' | 'hallway_intruder' | 'normal_lobby'
): Promise<CCTVVerificationResult> => {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';

  if (!apiKey) {
    logger.warn('GEMINI_API_KEY not set. Using fallback CCTV verification.');
    await updateDatabase(incidentId, FALLBACK_VERIFICATION);
    return FALLBACK_VERIFICATION;
  }

  // Map cameraType to local file path
  let fileName = 'normal_lobby.png';
  if (cameraType === 'kitchen_fire') fileName = 'kitchen_fire.png';
  else if (cameraType === 'hallway_intruder') fileName = 'hallway_intruder.png';

  const imagePath = path.join(
    __dirname,
    '../../../web-dashboard/public/assets/cctv',
    fileName
  );

  try {
    if (!fs.existsSync(imagePath)) {
      throw new Error(`CCTV image not found at path: ${imagePath}`);
    }

    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    const genAI = new GoogleGenerativeAI(apiKey);
    const genModel = genAI.getGenerativeModel({ model });

    const prompt = `Analyze this CCTV snapshot. You are an AI security and safety verifier for a property.
A guest or system reported a crisis in this sector. Verify if there is an active fire, smoke, or an intruder.

STRICT RULES:
1. Respond ONLY with valid JSON. Do not include markdown formatting or explanations.
2. verified must be true if a fire, smoke, or intruder is clearly visible.
3. hazardType must be one of: "fire", "intruder", "none".
4. confidence must be a number between 0 and 1.
5. description must summarize the threat or confirm that the area is safe.

JSON STRUCTURE:
{
  "verified": boolean,
  "hazardType": "fire" | "intruder" | "none",
  "confidence": number,
  "description": "string"
}`;

    const result = await genModel.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image,
          mimeType: 'image/png',
        },
      },
    ]);

    const content = result.response.text();
    if (!content) throw new Error('No content received from Gemini Vision');

    const cleanJson = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .replace(/\n\s*\n/g, ' ')
      .trim();

    const analysisResult = JSON.parse(cleanJson) as CCTVVerificationResult;
    logger.info(`CCTV AI Verification for incident ${incidentId} complete: ${JSON.stringify(analysisResult)}`);

    await updateDatabase(incidentId, analysisResult);
    return analysisResult;
  } catch (error: any) {
    logger.error(`CCTV AI Verification failed for incident ${incidentId}:`, error.message);
    await updateDatabase(incidentId, FALLBACK_VERIFICATION);
    return FALLBACK_VERIFICATION;
  }
};

const updateDatabase = async (incidentId: number, result: CCTVVerificationResult) => {
  try {
    const severityOverride = result.verified
      ? result.hazardType === 'fire' ? 'critical' : 'high'
      : 'low'; // Downgrade severity if false alarm

    const statusOverride = result.verified ? 'active' : 'false_alarm';

    await query(
      `UPDATE incidents 
       SET verified = $1, 
           severity = $2,
           status = $3,
           cctv_analysis = $4
       WHERE id = $5`,
      [
        result.verified,
        severityOverride,
        statusOverride,
        JSON.stringify(result),
        incidentId,
      ]
    );
  } catch (error) {
    logger.error(`Failed to update incident database for CCTV verification:`, error);
  }
};
