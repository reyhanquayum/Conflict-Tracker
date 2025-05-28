import React, { useEffect, useState, useRef, useCallback } from "react";
import Globe from "react-globe.gl";
import { Color, CylinderGeometry, MeshBasicMaterial, Mesh } from "three"; // Removed SphereGeometry
import type { ClusterData, MapView } from "@/types"; 

const GEOJSON_FILE_URL = "/data/geodata/countries.geojson";

// this component is responsible for rendering the 3d globe and its objects (clusters)

interface GlobeDisplayProps {
  clusters: ClusterData[]; 
  onViewChange?: (view: MapView) => void;
  onClusterClick?: (cluster: ClusterData) => void; 
}

const GlobeDisplay: React.FC<GlobeDisplayProps> = ({ clusters, onViewChange, onClusterClick }) => {
  const [countries, setCountries] = useState<{ features: any[] }>({ features: [] });
  const [userInteracted, setUserInteracted] = useState(false); // tracks if user has interacted, to stop auto-rotate
  const globeEl = useRef<any>(null); // ref to the globe instance
  const [hoveredCluster, setHoveredCluster] = useState<ClusterData | null>(null); 
  const hoverDebounceTimerRef = useRef<NodeJS.Timeout | null>(null); 

  const handleObjectHover = useCallback((obj: object | null) => {
    if (hoverDebounceTimerRef.current) {
      clearTimeout(hoverDebounceTimerRef.current);
    }
    hoverDebounceTimerRef.current = setTimeout(() => {
      setHoveredCluster(obj as ClusterData | null);
    }, 75); // a short debounce for hover seems to feel better
  }, []);

  // cleanup for the hover debounce timer
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
  }, [onViewChange, userInteracted]); 

  // Effect to set initial camera position
  useEffect(() => {
    const globe = globeEl.current;
    if (globe && !userInteracted) { // Only set initial view if user hasn't interacted
      // Coordinates for Indian subcontinent / east of Middle East
      const initialLat = 25; // e.g., Northern India / Pakistan
      const initialLng = 75; // e.g., Central India
      const initialAltitude = 2.0; // Adjust for desired zoom level
      const transitionDurationMs = 1500; // Smooth transition

      // Check if pointOfView method exists
      if (typeof globe.pointOfView === 'function') {
        globe.pointOfView({ lat: initialLat, lng: initialLng, altitude: initialAltitude }, transitionDurationMs);
      } else {
        console.warn("globe.pointOfView method not available. Cannot set initial camera position.");
      }
    }
    // This effect should run once on mount to set the initial camera.
    // Not including userInteracted in deps, otherwise it might re-center unexpectedly.
  }, [globeEl]); 

  // creates the 3D cone object for each cluster
  const createClusterObject = useCallback((obj: any) => {
    const cluster = obj as ClusterData; 
    if (!cluster || typeof cluster.count !== 'number') {
      return new Mesh(); // return empty mesh if data is weird
    }

    // these constants control the spike appearance, might need tweaking
    const MAX_HEIGHT = 10.0; 
    const MIN_HEIGHT = 0.5;  
    const BASE_RADIUS = Math.log2(cluster.count + 1) * 0.05 + 0.05; 

    let rawHeight = Math.log10(cluster.count + 1) * 10.0; 
    let finalHeight = Math.max(MIN_HEIGHT, Math.min(rawHeight, MAX_HEIGHT));
    
    const geometry = new CylinderGeometry(0, BASE_RADIUS, finalHeight, 8); // cone shape
    
    let materialColor = 'orange'; // default color
    let materialOpacity = 0.75;

    if (hoveredCluster) {
      // using lat/lon/count for hover comparison, not ideal but works for now.
      // a unique cluster ID from backend would be more robust.
      if (cluster.lat === hoveredCluster.lat && cluster.lon === hoveredCluster.lon && cluster.count === hoveredCluster.count) {
        materialColor = 'orangered'; // highlight the one we're hovering
        materialOpacity = 0.9;
      } else {
        materialColor = '#555555'; // dim others
        materialOpacity = 0.5;
      }
    }
    
    const material = new MeshBasicMaterial({ color: materialColor, opacity: materialOpacity, transparent: true });
    
    const mesh = new Mesh(geometry, material);
    
    // this rotation makes the cone "stand up" correctly
    // because react-globe.gl orients the object's local Z-axis outwards.
    mesh.rotation.x = Math.PI / 2; 
    // The cone's geometric center will be at objectAltitude due to no local translation.

    return mesh; 

  }, [hoveredCluster]); 

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
        objectsData={clusters} 
        objectLat="lat"        
        objectLng="lon"        
        objectAltitude={0.01}  // places the center of our cone slightly off the surface
        objectThreeObject={createClusterObject}
        objectLabel={getObjectLabel}
        onObjectClick={handleObjectClick} 
        onObjectHover={handleObjectHover} 
      />
    </div>
  );
};

export default GlobeDisplay;
