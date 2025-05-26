import React, { useEffect, useState, useRef } from "react";
import Globe from "react-globe.gl";
import { Color } from "three";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

const GEOJSON_FILE_URL = "/data/geodata/countries.geojson";

export interface EventData {
  id: string; // Or use _id if that's what your MongoDB uses
  lat: number;
  lon: number;
  group: string;
  type: string;
  date: string;
  description?: string; // Mapped from 'notes' in CSV
  // Add other relevant fields from your events data that you might want to display
}

interface GlobeDisplayProps {
  events: EventData[];
}

const GlobeDisplay: React.FC<GlobeDisplayProps> = ({ events }) => {
  const [countries, setCountries] = useState({ features: [] });
  const [userInteracted, setUserInteracted] = useState(false);
  const globeEl = useRef<any>(null);

  const [selectedEventForModal, setSelectedEventForModal] = useState<EventData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handlePointClick = (point: object) => {
    const event = point as EventData; 
    setSelectedEventForModal(event);
    setIsModalOpen(true);
  };

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
        globe.scene().background = new Color(0x111111); // Dark grey
      }
      if (!userInteracted) {
        globe.controls().autoRotate = true;
        globe.controls().autoRotateSpeed = 0.2;
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
  }, [countries, events, userInteracted]);

  return (
    <div style={{ height: "100vh", width: "100%", backgroundColor: "#000010" }}>
      <Globe
        ref={globeEl}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        polygonsData={countries.features}
        polygonCapColor={() => "rgba(50, 50, 50, 0.7)"}
        polygonSideColor={() => "rgba(30, 30, 30, 0.3)"}
        polygonStrokeColor={() => "#666"}
        polygonLabel={({ properties }: any) => `
          <b>${properties.ADMIN}</b> <br />
          Population: <i>${properties.POP_EST}</i>
        `}
        pointsData={events}
        pointLat="lat"
        pointLng="lon"
        pointAltitude={0.01}
        pointLabel={(obj: any) => {
          const event = obj as EventData;
          return `<b>${event.group}</b><br/>Type: ${event.type}<br/>Date: ${event.date}`;
        }}
        pointColor={() => "red"}
        pointRadius={0.15}
        onPointClick={handlePointClick}
      />
      {selectedEventForModal && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-md bg-slate-900 text-slate-50 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-slate-50">Event Details</DialogTitle>
              <DialogDescription className="text-slate-400">
                ID: {selectedEventForModal.id} 
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 text-sm">
              <p><strong className="font-semibold text-slate-300">Date:</strong> {selectedEventForModal.date}</p>
              <p><strong className="font-semibold text-slate-300">Group:</strong> {selectedEventForModal.group}</p>
              <p><strong className="font-semibold text-slate-300">Type:</strong> {selectedEventForModal.type}</p>
              {selectedEventForModal.description && (
                <div>
                  <strong className="font-semibold text-slate-300">Description:</strong>
                  <p className="mt-1 text-slate-300 whitespace-pre-wrap break-words">{selectedEventForModal.description}</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <button type="button" className="bg-slate-700 hover:bg-slate-600 text-slate-50 font-semibold py-2 px-4 rounded transition-colors">Close</button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default GlobeDisplay;
