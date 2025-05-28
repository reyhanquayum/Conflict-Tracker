// src/types/index.ts

export interface EventData {
  id: string; 
  lat: number;
  lon: number;
  group: string;
  type: string;
  date: string; // YYYY-MM-DD
  year?: number; 
  description?: string;
  fatalities?: number;
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

}

// union type for data points on the globe
export type EventOrClusterData = EventData | ClusterData;

export interface MapView {
  lat: number;
  lng: number;
  altitude: number;
}

// for overall dashboard summary data
export interface YearlyCount {
  year: string;
  count: number;
}

export interface GroupCount {
  group: string;
  count: number;
}

export interface EventTypeCount {
  type: string;
  count: number;
}

export interface OverallSummaryData {
  byYear: YearlyCount[];
  byGroup: GroupCount[];
  byEventTypeGlobal: EventTypeCount[];
  eventTypeCountsForSelectedGroup?: EventTypeCount[];
}
