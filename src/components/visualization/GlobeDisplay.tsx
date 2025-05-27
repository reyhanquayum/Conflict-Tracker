import React, { useEffect, useState, useRef, useCallback } from "react"; // Added useCallback
import Globe from "react-globe.gl";
import { Color } from "three";
import EventDetailPanel from "@/components/ui/EventDetailPanel";
// import centroid from '@turf/centroid'; // Removed turf centroid import

const GEOJSON_FILE_URL = "/data/geodata/countries.geojson";

export interface EventData {
  id: string;
  lat: number;
  lon: number;
  group: string;
  type: string;
  date: string;
  description?: string;
}

interface GlobeDisplayProps {
  events: EventData[];
}

const GlobeDisplay: React.FC<GlobeDisplayProps> = ({ events }) => {
  const [countries, setCountries] = useState<{ features: any[] }>({
    features: [],
  });
  // const [labelsData, setLabelsData] = useState<any[]>([]); // Removed labelsData state
  const [userInteracted, setUserInteracted] = useState(false);
  const [cameraDistance, setCameraDistance] = useState(350); // Initial default camera distance - kept for potential future use
  const globeEl = useRef<any>(null);

  const [selectedEventForPanel, setSelectedEventForPanel] =
    useState<EventData | null>(null);

  const handlePointClick = useCallback((point: object) => {
    const event = point as EventData;
    setSelectedEventForPanel(event);
  }, []); // Memoize with useCallback

  const handleClosePanel = useCallback(() => {
    setSelectedEventForPanel(null);
  }, []); // Memoize with useCallback

  useEffect(() => {
    fetch(GEOJSON_FILE_URL)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.features && data.features.length > 0) {
          console.log(
            "First GeoJSON feature properties:",
            data.features[0].properties
          );
          setCountries(data); 
          // Removed label processing logic
        } else {
          console.error(
            "GeoJSON data or features array is missing or invalid:",
            data
          );
        }
      })
      .catch((err) => console.error("Error loading GeoJSON:", err));
  }, []);

  useEffect(() => {
    // Removed logging for labelsData

    const globe = globeEl.current;
    if (globe) {
      if (globe.scene) {
        globe.scene().background = new Color(0x000010);
      }
      if (!userInteracted) {
        globe.controls().autoRotate = true;
        globe.controls().autoRotateSpeed = 0.15; // Slightly slower rotation
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
  }, [countries, events, userInteracted]); // Removed labelsData from dependency array

  // Effect to listen to zoom/camera changes
  useEffect(() => {
    const globe = globeEl.current;
    if (globe) {
      const controls = globe.controls();
      const updateCameraDistance = () => {
        const cameraPosition = globe.camera().position;
        const distance = cameraPosition.length();
        setCameraDistance(distance);
        // console.log('Camera distance from center:', distance); // Keep for debugging if needed
      };
      // Set initial distance
      updateCameraDistance(); 
      
      controls.addEventListener('end', updateCameraDistance); // Update on interaction end
      return () => {
        controls.removeEventListener('end', updateCameraDistance);
      };
    }
  }, [userInteracted, globeEl.current]); // Changed to globeEl.current

  // Memoized label text function
  const getPointLabel = useCallback((obj: any) => {
    const event = obj as EventData;
    return `<b>${event.group}</b><br/>Type: ${event.type}<br/>Date: ${event.date}`;
  }, []);

  // const getPolygonLabel = useCallback(({ properties }: any) => { // Removed as polygonLabel will be simplified
  //   return `<b>${properties.ADMIN}</b> <br />Population: <i>${properties.POP_EST}</i>`;
  // }, []);

  return (
    <div
      style={{
        position: "relative",
        height: "100vh",
        width: "100%",
        backgroundColor: "#000010",
      }}
    >
      <Globe
        ref={globeEl}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        polygonsData={countries.features}
        polygonCapColor={() => "rgba(100, 116, 139, 0.9)"}
        polygonSideColor={() => "rgba(71, 85, 105, 0.7)"}
        polygonStrokeColor={() => "#4A5568"}
        polygonLabel={() => ''} // Disabled polygon hover labels
        pointsData={events}
        pointLat="lat"
        pointLng="lon"
        pointAltitude={0.03}
        pointLabel={getPointLabel}
        pointColor={() => "rgba(255, 0, 0, 0.75)"} // Slightly transparent red
        pointRadius={0.15}
        onPointClick={handlePointClick}
        // Removed all label-related props:
        // labelsData={labelsData}
        // labelLat="lat" 
        // labelLng="lng" 
        // labelText="text" 
        // labelSize={...}
        // labelColor="color" 
        // labelDotRadius={0} 
        // labelResolution={1}
        // labelAltitude={0.02} 
      />
      <EventDetailPanel
        event={selectedEventForPanel}
        onClose={handleClosePanel}
      />
    </div>
  );
};

export default GlobeDisplay;
