import React, { useEffect, useState, useRef, useCallback } from "react";
import Globe from "react-globe.gl";
import { Color, CylinderGeometry, MeshBasicMaterial, Mesh } from "three";
import type { ClusterData, MapView } from "@/types"; 

const GEOJSON_FILE_URL = "/data/geodata/countries.geojson";

// cluster spike colors: all spikes stay orange, the hovered one turns orangered
const BASE_COLOR = "orange";
const BASE_OPACITY = 0.75;
const HIGHLIGHT_COLOR = "orangered";
const HIGHLIGHT_OPACITY = 0.9;

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

  // materials of the created cluster meshes, keyed by their cluster datum.
  // hover highlighting mutates these in place instead of rebuilding meshes.
  const clusterMaterials = useRef(new WeakMap<ClusterData, MeshBasicMaterial>());
  const hoveredClusterRef = useRef<ClusterData | null>(null);

  // sets a single mesh material directly: O(1), no react re-render, no globe rebuild
  const handleObjectHover = useCallback((obj: object | null) => {
    const next = (obj as ClusterData) ?? null;
    const prev = hoveredClusterRef.current;
    if (prev === next) return;
    hoveredClusterRef.current = next;

    const setHighlighted = (cluster: ClusterData | null, hovered: boolean) => {
      if (!cluster) return;
      const material = clusterMaterials.current.get(cluster);
      if (!material) return;
      material.color.set(hovered ? HIGHLIGHT_COLOR : BASE_COLOR);
      material.opacity = hovered ? HIGHLIGHT_OPACITY : BASE_OPACITY;
    };

    setHighlighted(prev, false);
    setHighlighted(next, true);
  }, []);

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

  // cluster data changed: three-globe rebuilt the meshes with base colors,
  // so drop any stale hovered datum (its mesh no longer exists)
  useEffect(() => {
    hoveredClusterRef.current = null;
  }, [clusters]);

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

  // effect to set initial camera position
  useEffect(() => {
    const globe = globeEl.current;
    if (globe && !userInteracted) { // only set initial view if user hasnt interacted
      const initialLat = 25;
      const initialLng = 75;
      const initialAltitude = 2.0; 
      const transitionDurationMs = 1500;

      if (typeof globe.pointOfView === 'function') {
        globe.pointOfView({ lat: initialLat, lng: initialLng, altitude: initialAltitude }, transitionDurationMs);
      } else {
        console.warn("globe.pointOfView method not available. Cannot set initial camera position.");
      }
    }

  }, [globeEl]); 

  // creates the 3D cone object for each cluster.
  // must keep a stable identity: three-globe rebuilds every mesh whenever the
  // objectThreeObject prop changes, so this callback must not depend on hover state
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
    const material = new MeshBasicMaterial({
      color: BASE_COLOR,
      opacity: BASE_OPACITY,
      transparent: true,
    });

    clusterMaterials.current.set(cluster, material);
    
    const mesh = new Mesh(geometry, material);
    
    mesh.rotation.x = Math.PI / 2; 

    return mesh; 

  }, []); 

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
