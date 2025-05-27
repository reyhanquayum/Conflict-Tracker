import React, { useEffect, useState, useRef, useCallback } from "react"; // Removed useMemo
import Globe from "react-globe.gl";
import { Color } from "three";
// import * as d3 from 'd3'; // Removed D3 import
import type { ClusterData, MapView } from "@/types"; 

const GEOJSON_FILE_URL = "/data/geodata/countries.geojson";

// Type guards are no longer needed here as this component only deals with clusters now

interface GlobeDisplayProps {
  clusters: ClusterData[]; // Renamed prop from 'events' to 'clusters'
  onViewChange?: (view: MapView) => void;
  onClusterClick?: (cluster: ClusterData) => void; // New prop for cluster clicks
}

const GlobeDisplay: React.FC<GlobeDisplayProps> = ({ clusters, onViewChange, onClusterClick }) => {
  const [countries, setCountries] = useState<{ features: any[] }>({ features: [] });
  const [userInteracted, setUserInteracted] = useState(false);
  const globeEl = useRef<any>(null);
  // selectedEventForPanel and related logic removed

  const handlePointClick = useCallback((point: object) => {
    const cluster = point as ClusterData; // Assuming pointsData now only contains ClusterData
    if (onClusterClick && cluster.isCluster) { // Ensure it's a cluster and handler exists
      onClusterClick(cluster);
    }
  }, [onClusterClick]);

  useEffect(() => {
    fetch(GEOJSON_FILE_URL)
      .then((res) => res.json())
      .then((data) => setCountries(data))
      .catch((err) => console.error("Error loading GeoJSON:", err));
  }, []);

  useEffect(() => {
    const globe = globeEl.current;
    if (globe) {
      if (globe.scene) {
        globe.scene().background = new Color(0x000010);
      }
      if (!userInteracted) {
        globe.controls().autoRotate = true;
        globe.controls().autoRotateSpeed = 0.15;
      } else {
        globe.controls().autoRotate = false;
      }
      const controls = globe.controls();
      const handleInteractionStart = () => {
        if (!userInteracted) {
          setUserInteracted(true);
          controls.autoRotate = false;
        }
      };
      controls.addEventListener("start", handleInteractionStart);
      return () => {
        controls.removeEventListener("start", handleInteractionStart);
      };
    }
  }, [userInteracted]);

  useEffect(() => {
    const globe = globeEl.current;
    if (globe && onViewChange) {
      const controls = globe.controls();
      const handleViewUpdate = () => {
        const { lat, lng, altitude } = globe.pointOfView();
        onViewChange({ lat, lng, altitude });
      };
      handleViewUpdate(); // Initial call
      controls.addEventListener('end', handleViewUpdate);
      return () => {
        controls.removeEventListener('end', handleViewUpdate);
      };
    }
  }, [onViewChange, userInteracted]); // userInteracted dependency might not be needed here if it only affects auto-rotate

  // Styling accessors now assume data is ClusterData
  const getClusterLabel = useCallback((obj: any) => { // Parameter changed to any
    const cluster = obj as ClusterData; // Cast to ClusterData
    return `Cluster: ${cluster.count} events`;
  }, []);
  
  const getClusterRadius = useCallback((obj: any) => { // Parameter changed to any
    const cluster = obj as ClusterData; // Cast to ClusterData
    if (cluster && typeof cluster.count === 'number') {
      // Reverted to slightly larger radius scaling
      return Math.log2(cluster.count + 1) * 0.1 + 0.1; 
    }
    return 0.1; // Default radius
  }, []);

  // Reverted to simple orange color for all clusters
  const getClusterColor = useCallback(() => {
    return 'rgba(255, 165, 0, 0.75)'; // Orange for all clusters
  }, []);

  return (
    <div style={{ position: 'relative', height: "100vh", width: "100%", backgroundColor: "#000010" }}>
      <Globe
        ref={globeEl}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        polygonsData={countries.features}
        polygonCapColor={() => "rgba(100, 116, 139, 0.9)"}
        polygonSideColor={() => "rgba(71, 85, 105, 0.7)"}
        polygonStrokeColor={() => "#4A5568"}
        polygonLabel={() => ''}
        pointsData={clusters}
        pointLat="lat"
        pointLng="lon"
        pointAltitude={0.03} // Clusters slightly off surface
        pointLabel={getClusterLabel}
        pointColor={getClusterColor}
        pointRadius={getClusterRadius}
        onPointClick={handlePointClick} // This now calls onClusterClick prop
        pointsTransitionDuration={0} // Make point changes instant
      />
      {/* EventDetailPanel is now rendered in App.tsx */}
    </div>
  );
};

export default GlobeDisplay;
