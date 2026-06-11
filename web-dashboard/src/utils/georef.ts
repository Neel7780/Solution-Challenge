export const PROPERTY_CONFIG = {
  ANCHOR_LAT: 40.7128,      // Real-world Lat of Godot's (0,0)
  ANCHOR_LNG: -74.0060,     // Real-world Lng of Godot's (0,0)
  SCALE_LAT: 0.000008983,   // ~1 meter in degrees latitude
  SCALE_LNG: 0.000011831,   // ~1 meter in degrees longitude
  ROTATION_RAD: 0.25,       // Building offset from True North in radians
};

export function godotToLatLng(x: number, y: number): { latitude: number; longitude: number } {
  const theta = PROPERTY_CONFIG.ROTATION_RAD;
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);
  const eastOffset = x * cosTheta - y * sinTheta;
  const northOffset = -x * sinTheta - y * cosTheta;
  const lat = PROPERTY_CONFIG.ANCHOR_LAT + northOffset * PROPERTY_CONFIG.SCALE_LAT;
  const lng = PROPERTY_CONFIG.ANCHOR_LNG + eastOffset * PROPERTY_CONFIG.SCALE_LNG;
  return { latitude: lat, longitude: lng };
}

export function latLngToGodot(lat: number, lng: number): { x: number; y: number } {
  const theta = PROPERTY_CONFIG.ROTATION_RAD;
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);

  const northOffset = (lat - PROPERTY_CONFIG.ANCHOR_LAT) / PROPERTY_CONFIG.SCALE_LAT;
  const eastOffset = (lng - PROPERTY_CONFIG.ANCHOR_LNG) / PROPERTY_CONFIG.SCALE_LNG;

  const x = eastOffset * cosTheta - northOffset * sinTheta;
  const y = -eastOffset * sinTheta - northOffset * cosTheta;

  return { x, y };
}

export function getGeoreferencedLatLng(latVal: any, lngVal: any): { latitude: number; longitude: number } {
  const lat = Number(latVal);
  const lng = Number(lngVal);

  if (isNaN(lat) || isNaN(lng)) {
    return { latitude: PROPERTY_CONFIG.ANCHOR_LAT, longitude: PROPERTY_CONFIG.ANCHOR_LNG };
  }

  // Real Lat/Lng
  if (lat > 40.0 && lat < 41.5 && lng > -74.5 && lng < -73.0) {
    return { latitude: lat, longitude: lng };
  }

  // Godot Coordinates
  if (lat >= -50 && lat <= 50 && lng >= -50 && lng <= 50) {
    return godotToLatLng(lat, lng);
  }

  // Legacy pixel translation
  const worldX = -9.0 + (lng / 800) * 14.0;
  const worldY = -15.0 + (lat / 600) * 25.0;
  return godotToLatLng(worldX, worldY);
}

// Haversine distance formula
export function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}
