// src/types/index.ts

export interface EventData {
  // _id is often used by MongoDB, but our ETL uses 'id' from event_id_cnty for _id.
  // If the API returns docs with _id, ensure it's handled or mapped.
  // For now, assuming 'id' is the primary identifier from the API for individual events.
  id: string; 
  lat: number;
  lon: number;
  group: string;
  type: string;
  date: string; // YYYY-MM-DD
  year?: number; // This was in the ETL, ensure API returns it if needed by frontend logic
  description?: string;
  fatalities?: number;
  // Add any other fields that come from your API for individual events
}

export interface ClusterData {
  lat: number;
  lon: number;
  count: number;
  isCluster: true;
  bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
  // Potentially an ID for the cluster if your backend assigns one
  // clusterId?: string; 
  // Potentially a representative name/text for the cluster
  // text?: string; 
}

// Union type for data points on the globe
export type EventOrClusterData = EventData | ClusterData;

// For map view state communication between App and GlobeDisplay
export interface MapView {
  lat: number;
  lng: number;
  altitude: number;
  // Optionally add bounds if needed:
  // bounds?: { minLat: number, minLng: number, maxLat: number, maxLng: number };
}
