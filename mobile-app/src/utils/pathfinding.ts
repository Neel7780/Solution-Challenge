import { getCachedGraph } from './graphCache';
import { NavigationNode, NavigationEdge, NavigationGraph } from '../types/navigation';

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
    const isFloorAffected = nodeA.floor === hazard.floor || nodeB.floor === hazard.floor;
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

// Dijkstra Pathfinding algorithm for client-side offline routing
export async function findShortestPathOffline(
  startNodeId: string,
  hazards: Hazard[] = []
): Promise<{ path: NavigationNode[]; distance: number } | null> {
  const graph = await getCachedGraph();
  const { nodes, edges } = graph;

  const startNode = nodes.find(n => n.id === startNodeId);
  if (!startNode) return null;

  const distances: Record<string, number> = {};
  const previous: Record<string, string | null> = {};
  const unvisited = new Set<string>();

  for (const node of nodes) {
    distances[node.id] = Infinity;
    previous[node.id] = null;
    unvisited.add(node.id);
  }
  distances[startNodeId] = 0;

  const blockedEdges = new Set<string>();
  for (const edge of edges) {
    if (isEdgeBlocked(edge, nodes, hazards)) {
      blockedEdges.add(edge.id);
    }
  }

  while (unvisited.size > 0) {
    let minNodeId: string | null = null;
    let minDist = Infinity;
    for (const nodeId of unvisited) {
      if (distances[nodeId] < minDist) {
        minDist = distances[nodeId];
        minNodeId = nodeId;
      }
    }

    if (minNodeId === null || minDist === Infinity) {
      break;
    }

    const currentNodeId = minNodeId;
    const currentNode = nodes.find(n => n.id === currentNodeId)!;

    if (currentNode.type === 'exit') {
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

  return null;
}

// Find closest node to coordinates (x, y) on a specific floor
export async function findClosestNodeOffline(x: number, y: number, floor: number): Promise<NavigationNode | null> {
  const graph = await getCachedGraph();
  const nodes = graph.nodes.filter(n => n.floor === floor);
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
