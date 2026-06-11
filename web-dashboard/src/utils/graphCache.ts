import { hotelGraph } from '../data/hotelGraph';
import { NavigationGraph } from '../types/navigation';

const GRAPH_CACHE_KEY = '@hotel_navigation_graph';

// Save graph matrix to localStorage for offline use
export async function cacheGraph(graph: NavigationGraph): Promise<void> {
  try {
    const jsonValue = JSON.stringify(graph);
    localStorage.setItem(GRAPH_CACHE_KEY, jsonValue);
  } catch (e) {
    console.error('Failed to cache navigation graph locally:', e);
  }
}

// Retrieve graph matrix, falling back to bundled hotelGraph if not cached
export async function getCachedGraph(): Promise<NavigationGraph> {
  try {
    const jsonValue = localStorage.getItem(GRAPH_CACHE_KEY);
    if (jsonValue !== null) {
      return JSON.parse(jsonValue) as NavigationGraph;
    }
  } catch (e) {
    console.error('Error reading cached graph, falling back to static graph:', e);
  }
  return hotelGraph;
}
