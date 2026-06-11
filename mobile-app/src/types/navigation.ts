export interface NavigationNode {
  id: string;
  name: string;
  x: number; // Godot coordinate system x (meters)
  y: number; // Godot coordinate system y (meters)
  floor: number;
  type: 'room' | 'corridor' | 'stairwell' | 'exit';
}

export interface NavigationEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  weight: number; // distance in meters or custom weight
  status: 'clear' | 'blocked';
}

export interface NavigationGraph {
  nodes: NavigationNode[];
  edges: NavigationEdge[];
}
