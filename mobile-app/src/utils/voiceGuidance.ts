import * as Speech from 'expo-speech';
import { NavigationNode } from '../types/navigation';

let lastSpokenText = '';

// Vocalize directions to the user using the device's native Speech engine
export async function speakGuidance(text: string): Promise<void> {
  try {
    if (text === lastSpokenText) return; // avoid repeating identical instruction

    // Stop any ongoing speech
    await Speech.stop();

    lastSpokenText = text;
    Speech.speak(text, {
      language: 'en',
      pitch: 1.0,
      rate: 0.95, // speak slightly slower for clarity during stress
    });
  } catch (e) {
    console.error('Failed to play voice guidance:', e);
  }
}

// Translate node path array to concise spoken instructions
export function generateVoiceInstructions(path: NavigationNode[]): string[] {
  if (path.length <= 1) {
    return ['Shelter in place immediately and await responder assistance.'];
  }

  const instructions: string[] = [];
  instructions.push(`Exit current area and proceed toward ${path[1].name}.`);

  for (let i = 1; i < path.length - 1; i++) {
    const prev = path[i - 1];
    const curr = path[i];
    const next = path[i + 1];

    if (curr.type === 'stairwell' && next.type === 'stairwell') {
      instructions.push(`Enter ${curr.name} and take the stairs down to floor ${next.floor}.`);
    } else if (curr.type === 'corridor' && next.type === 'stairwell') {
      instructions.push(`Walk along the corridor and enter ${next.name}.`);
    } else if (curr.type === 'corridor' && next.type === 'exit') {
      instructions.push(`Head directly to ${next.name} to exit the building.`);
    } else {
      instructions.push(`Continue to ${next.name}.`);
    }
  }

  instructions.push('You have arrived at a safe zone.');
  return instructions;
}

// Stop any current voice guidance
export async function stopSpeech(): Promise<void> {
  try {
    await Speech.stop();
    lastSpokenText = '';
  } catch (e) {
    console.error('Failed to stop voice guidance:', e);
  }
}
