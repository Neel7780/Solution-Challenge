import { NavigationNode, NavigationEdge, NavigationGraph } from '../types/navigation';

export const hotelNodes: NavigationNode[] = [
  // Floor 1 Nodes
  { id: 'R101', name: 'Room 101', x: -10, y: -15, floor: 1, type: 'room' },
  { id: 'R102', name: 'Room 102', x: -5, y: -15, floor: 1, type: 'room' },
  { id: 'R103', name: 'Room 103', x: 0, y: -15, floor: 1, type: 'room' },
  { id: 'CORRIDOR_1A', name: 'Floor 1 Corridor A', x: -5, y: -10, floor: 1, type: 'corridor' },
  { id: 'R104', name: 'Room 104', x: -10, y: -5, floor: 1, type: 'room' },
  { id: 'R105', name: 'Room 105', x: -5, y: -5, floor: 1, type: 'room' },
  { id: 'R106', name: 'Room 106', x: 0, y: -5, floor: 1, type: 'room' },
  { id: 'CORRIDOR_1B', name: 'Floor 1 Corridor B', x: -5, y: 0, floor: 1, type: 'corridor' },
  { id: 'STAIR_A_F1', name: 'Stairwell A (F1)', x: -8, y: 5, floor: 1, type: 'stairwell' },
  { id: 'STAIR_B_F1', name: 'Stairwell B (F1)', x: -2, y: 5, floor: 1, type: 'stairwell' },
  { id: 'EXIT_A', name: 'Exit A (North)', x: -8, y: 10, floor: 1, type: 'exit' },
  { id: 'EXIT_B', name: 'Exit B (South)', x: -2, y: 10, floor: 1, type: 'exit' },

  // Floor 2 Nodes
  { id: 'R201', name: 'Room 201', x: -10, y: -15, floor: 2, type: 'room' },
  { id: 'R202', name: 'Room 202', x: -5, y: -15, floor: 2, type: 'room' },
  { id: 'R203', name: 'Room 203', x: 0, y: -15, floor: 2, type: 'room' },
  { id: 'CORRIDOR_2A', name: 'Floor 2 Corridor A', x: -5, y: -10, floor: 2, type: 'corridor' },
  { id: 'R204', name: 'Room 204', x: -10, y: -5, floor: 2, type: 'room' },
  { id: 'R205', name: 'Room 205', x: -5, y: -5, floor: 2, type: 'room' },
  { id: 'R206', name: 'Room 206', x: 0, y: -5, floor: 2, type: 'room' },
  { id: 'CORRIDOR_2B', name: 'Floor 2 Corridor B', x: -5, y: 0, floor: 2, type: 'corridor' },
  { id: 'STAIR_A_F2', name: 'Stairwell A (F2)', x: -8, y: 5, floor: 2, type: 'stairwell' },
  { id: 'STAIR_B_F2', name: 'Stairwell B (F2)', x: -2, y: 5, floor: 2, type: 'stairwell' },
];

export const hotelEdges: NavigationEdge[] = [
  // Floor 1 Edges
  { id: 'E_R101_C1A', sourceNodeId: 'R101', targetNodeId: 'CORRIDOR_1A', weight: 7, status: 'clear' },
  { id: 'E_R102_C1A', sourceNodeId: 'R102', targetNodeId: 'CORRIDOR_1A', weight: 5, status: 'clear' },
  { id: 'E_R103_C1A', sourceNodeId: 'R103', targetNodeId: 'CORRIDOR_1A', weight: 7, status: 'clear' },
  { id: 'E_C1A_C1B', sourceNodeId: 'CORRIDOR_1A', targetNodeId: 'CORRIDOR_1B', weight: 10, status: 'clear' },
  { id: 'E_R104_C1B', sourceNodeId: 'R104', targetNodeId: 'CORRIDOR_1B', weight: 7, status: 'clear' },
  { id: 'E_R105_C1B', sourceNodeId: 'R105', targetNodeId: 'CORRIDOR_1B', weight: 5, status: 'clear' },
  { id: 'E_R106_C1B', sourceNodeId: 'R106', targetNodeId: 'CORRIDOR_1B', weight: 7, status: 'clear' },
  { id: 'E_C1B_STAF1', sourceNodeId: 'CORRIDOR_1B', targetNodeId: 'STAIR_A_F1', weight: 6, status: 'clear' },
  { id: 'E_C1B_STBF1', sourceNodeId: 'CORRIDOR_1B', targetNodeId: 'STAIR_B_F1', weight: 6, status: 'clear' },
  { id: 'E_STAF1_EXA', sourceNodeId: 'STAIR_A_F1', targetNodeId: 'EXIT_A', weight: 5, status: 'clear' },
  { id: 'E_STBF1_EXB', sourceNodeId: 'STAIR_B_F1', targetNodeId: 'EXIT_B', weight: 5, status: 'clear' },

  // Floor 2 Edges
  { id: 'E_R201_C2A', sourceNodeId: 'R201', targetNodeId: 'CORRIDOR_2A', weight: 7, status: 'clear' },
  { id: 'E_R202_C2A', sourceNodeId: 'R202', targetNodeId: 'CORRIDOR_2A', weight: 5, status: 'clear' },
  { id: 'E_R203_C2A', sourceNodeId: 'R203', targetNodeId: 'CORRIDOR_2A', weight: 7, status: 'clear' },
  { id: 'E_C2A_C2B', sourceNodeId: 'CORRIDOR_2A', targetNodeId: 'CORRIDOR_2B', weight: 10, status: 'clear' },
  { id: 'E_R204_C2B', sourceNodeId: 'R204', targetNodeId: 'CORRIDOR_2B', weight: 7, status: 'clear' },
  { id: 'E_R205_C2B', sourceNodeId: 'R205', targetNodeId: 'CORRIDOR_2B', weight: 5, status: 'clear' },
  { id: 'E_R206_C2B', sourceNodeId: 'R206', targetNodeId: 'CORRIDOR_2B', weight: 7, status: 'clear' },
  { id: 'E_C2B_STAF2', sourceNodeId: 'CORRIDOR_2B', targetNodeId: 'STAIR_A_F2', weight: 6, status: 'clear' },
  { id: 'E_C2B_STBF2', sourceNodeId: 'CORRIDOR_2B', targetNodeId: 'STAIR_B_F2', weight: 6, status: 'clear' },

  // Vertical stairwell connectors
  { id: 'E_STA_F2_F1', sourceNodeId: 'STAIR_A_F2', targetNodeId: 'STAIR_A_F1', weight: 15, status: 'clear' },
  { id: 'E_STB_F2_F1', sourceNodeId: 'STAIR_B_F2', targetNodeId: 'STAIR_B_F1', weight: 15, status: 'clear' },
];

export const hotelGraph: NavigationGraph = {
  nodes: hotelNodes,
  edges: hotelEdges,
};
