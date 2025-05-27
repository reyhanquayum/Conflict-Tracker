import React, { useEffect, useState, useRef, useCallback } from "react";
import Globe from "react-globe.gl";
import { Color, CylinderGeometry, MeshBasicMaterial, Mesh, SphereGeometry } from "three"; // Added SphereGeometry
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
  const [hoveredCluster, setHoveredCluster] = useState<ClusterData | null>(null); 
  const hoverDebounceTimerRef = useRef<NodeJS.Timeout | null>(null); // Ref for hover debounce timer

  const handleObjectHover = useCallback((obj: object | null) => {
    if (hoverDebounceTimerRef.current) {
      clearTimeout(hoverDebounceTimerRef.current);
    }
    hoverDebounceTimerRef.current = setTimeout(() => {
      setHoveredCluster(obj as ClusterData | null);
    }, 75); // 75ms debounce for hover, adjust as needed
  }, []);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (hoverDebounceTimerRef.current) {
        clearTimeout(hoverDebounceTimerRef.current);
      }
    };
  }, []);

  // Renamed handlePointClick to handleObjectClick for clarity with objectsData
  const handleObjectClick = useCallback((obj: object) => {
    const cluster = obj as ClusterData; 
    if (onClusterClick && cluster.isCluster) { 
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

  // Function to create the 3D object for each cluster
  const createClusterObject = useCallback((obj: any) => {
    const cluster = obj as ClusterData; // This is the cluster data for the current object
    if (!cluster || typeof cluster.count !== 'number') {
      return new Mesh(); // Return an empty mesh if data is invalid
    }

    const MAX_HEIGHT = 10.0; // Max height for a spike (e.g., 20% of globe radius)
    const MIN_HEIGHT = 0.5;  // Min height for a spike (e.g., 0.5% of globe radius)
    const BASE_RADIUS = Math.log2(cluster.count + 1) * 0.05 + 0.05; 

    let rawHeight = Math.log10(cluster.count + 1) * 10.0; // Significantly increased multiplier
    let finalHeight = Math.max(MIN_HEIGHT, Math.min(rawHeight, MAX_HEIGHT));

    // if (cluster.count > 1) { // Temporarily commented out to reduce console noise
        // console.log(`Cluster count: ${cluster.count}, BaseRadius: ${BASE_RADIUS.toFixed(3)}, RawHeight: ${rawHeight.toFixed(3)}, FinalHeight: ${finalHeight.toFixed(3)}`);
    // }
    
    // Changed radiusTop from BASE_RADIUS to 0 to make a cone (spike)
    const geometry = new CylinderGeometry(0, BASE_RADIUS, finalHeight, 8); 
    
    let materialColor = 'orange';
    let materialOpacity = 0.75;

    if (hoveredCluster) {
      // Check if the current cluster (obj) is the same as hoveredCluster
      // Need a stable ID for comparison, or compare by lat/lon if precise enough
      // Assuming lat/lon are good enough for this demo if no explicit ID
      if (cluster.lat === hoveredCluster.lat && cluster.lon === hoveredCluster.lon && cluster.count === hoveredCluster.count) {
        materialColor = 'orangered'; // Highlight hovered
        materialOpacity = 0.9;
      } else {
        materialColor = '#555555'; // Desaturated grey for non-hovered
        materialOpacity = 0.5;
      }
    }
    
    const material = new MeshBasicMaterial({ color: materialColor, opacity: materialOpacity, transparent: true });
    
    const mesh = new Mesh(geometry, material);
    // Position the base of the cylinder on the globe surface
    // The object's altitude is handled by objectAltitude prop or default behavior
    
    // Rotate around X to make the original Y-axis (height) align with the Z-axis.
    // Positive PI/2 should make the tip (original +Y) point along the new +Z.
    mesh.rotation.x = Math.PI / 2; 
    // NO translation for this test. The center of the cone's height will be at objectAltitude.

    return mesh; 

  }, [hoveredCluster]); // Add hoveredCluster as a dependency

  const getObjectLabel = useCallback((obj: any) => {
    const cluster = obj as ClusterData;
    return `Cluster: ${cluster.count} events`;
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
        objectsData={clusters} // Changed from pointsData
        objectLat="lat"        // Changed from pointLat
        objectLng="lon"        // Changed from pointLng
        objectAltitude={0.01}  // Altitude for the base of the object
        objectThreeObject={createClusterObject}
        objectLabel={getObjectLabel}
        onObjectClick={handleObjectClick} 
        onObjectHover={handleObjectHover} // Added hover handler
      />
    </div>
  );
};

export default GlobeDisplay;
