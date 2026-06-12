import { hotelGraph } from '../data/hotelGraph';
import { NavigationNode, NavigationEdge } from '../types/navigation';

export interface Hazard {
  x: number;
  y: number;
  floor: number;
  radius: number;
}

// Distance formula between two 2D points
export function getDistance2D(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

// Check if an edge is blocked by any active hazards
export function isEdgeBlocked(
  edge: NavigationEdge,
  nodes: NavigationNode[],
  hazards: Hazard[]
): boolean {
  const nodeA = nodes.find(n => n.id === edge.sourceNodeId);
  const nodeB = nodes.find(n => n.id === edge.targetNodeId);
  if (!nodeA || !nodeB) return true;

  for (const hazard of hazards) {
    // Check floor compatibility. Stairwells connect floors, so they are affected if hazard is on either floor.
    const isFloorAffected =
      nodeA.floor === hazard.floor ||
      nodeB.floor === hazard.floor;

    if (!isFloorAffected) continue;

    // Check distance to source node
    const distA = getDistance2D(nodeA.x, nodeA.y, hazard.x, hazard.y);
    if (distA <= hazard.radius) return true;

    // Check distance to target node
    const distB = getDistance2D(nodeB.x, nodeB.y, hazard.x, hazard.y);
    if (distB <= hazard.radius) return true;

    // Check distance to midpoint
    const midX = (nodeA.x + nodeB.x) / 2;
    const midY = (nodeA.y + nodeB.y) / 2;
    const distMid = getDistance2D(midX, midY, hazard.x, hazard.y);
    if (distMid <= hazard.radius) return true;
  }

  return false;
}

// Dijkstra Pathfinding algorithm
export function findShortestPath(
  startNodeId: string,
  hazards: Hazard[] = []
): { path: NavigationNode[]; distance: number } | null {
  const nodes = hotelGraph.nodes;
  const edges = hotelGraph.edges;

  // Find start node
  const startNode = nodes.find(n => n.id === startNodeId);
  if (!startNode) return null;

  // Initialize Dijkstra tables
  const distances: Record<string, number> = {};
  const previous: Record<string, string | null> = {};
  const unvisited = new Set<string>();

  for (const node of nodes) {
    distances[node.id] = Infinity;
    previous[node.id] = null;
    unvisited.add(node.id);
  }
  distances[startNodeId] = 0;

  // Identify blocked edges
  const blockedEdges = new Set<string>();
  for (const edge of edges) {
    if (isEdgeBlocked(edge, nodes, hazards)) {
      blockedEdges.add(edge.id);
    }
  }

  while (unvisited.size > 0) {
    // Find node with minimum distance
    let minNodeId: string | null = null;
    let minDist = Infinity;
    for (const nodeId of unvisited) {
      if (distances[nodeId] < minDist) {
        minDist = distances[nodeId];
        minNodeId = nodeId;
      }
    }

    if (minNodeId === null || minDist === Infinity) {
      break; // No reachable unvisited nodes left
    }

    const currentNodeId = minNodeId;
    const currentNode = nodes.find(n => n.id === currentNodeId)!;

    // If we reached an exit, we can stop early
    if (currentNode.type === 'exit') {
      // Reconstruct path
      const path: NavigationNode[] = [];
      let tempId: string | null = currentNodeId;
      while (tempId !== null) {
        const pNode = nodes.find(n => n.id === tempId)!;
        path.unshift(pNode);
        tempId = previous[tempId];
      }
      return { path, distance: minDist };
    }

    unvisited.delete(currentNodeId);

    // Find outgoing edges from currentNodeId (undirected graph)
    const neighbors = edges.filter(
      e =>
        !blockedEdges.has(e.id) &&
        (e.sourceNodeId === currentNodeId || e.targetNodeId === currentNodeId)
    );

    for (const edge of neighbors) {
      const neighborId =
        edge.sourceNodeId === currentNodeId ? edge.targetNodeId : edge.sourceNodeId;

      if (!unvisited.has(neighborId)) continue;

      const alt = distances[currentNodeId] + edge.weight;
      if (alt < distances[neighborId]) {
        distances[neighborId] = alt;
        previous[neighborId] = currentNodeId;
      }
    }
  }

  return null; // No path found (shelter-in-place)
}

// Find closest node to coordinates (x, y) on a specific floor
export function findClosestNode(x: number, y: number, floor: number): NavigationNode | null {
  const nodes = hotelGraph.nodes.filter(n => n.floor === floor);
  if (nodes.length === 0) return null;

  let closestNode: NavigationNode | null = null;
  let minDist = Infinity;

  for (const node of nodes) {
    const dist = getDistance2D(x, y, node.x, node.y);
    if (dist < minDist) {
      minDist = dist;
      closestNode = node;
    }
  }

  return closestNode;
}

// Generate structural instructions from path
export async function generateVoiceInstructions(path: NavigationNode[]): Promise<string[]> {
  if (path.length <= 1) {
    return ['Shelter in place immediately and await responder assistance.'];
  }

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not set');
    
    const client = new GoogleGenerativeAI(apiKey);
    
    // Optimized configuration for near-instant response times
    const generationConfig = {
      model: "gemini-3.5-flash", // Use the optimized 3.5 branch
      temperature: 0.2,          // Keep it low so it doesn't waste time overthinking
      maxOutputTokens: 100,      // Keep directions under 2 sentences to cut generation time
    };
    
    const genModel = client.getGenerativeModel({ model: generationConfig.model });
    const pathString = path.map(n => n.name).join(' -> ');
    const prompt = `You are an emergency evacuation AI. Convert this path into clear, calm voice directions: ${pathString}. Keep directions under 2 sentences to cut generation time.`;
    
    const result = await genModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: generationConfig.temperature,
        maxOutputTokens: generationConfig.maxOutputTokens
      }
    });
    
    const text = result.response.text();
    // Split into sentences for the array
    return text.split(/(?<=\.)\s+/).filter(Boolean).map(s => s.trim());
  } catch (error) {
    console.error('Failed to generate AI voice instructions, using fallback:', error);
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
}

