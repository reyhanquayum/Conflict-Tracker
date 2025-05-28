import { useState, useEffect, useCallback, useRef } from "react"; // Removed 'React' default import
import GlobeDisplay from "./components/visualization/GlobeDisplay";
import TimelineSlider from "./components/ui/TimelineSlider";
import DashboardPanel from "./components/ui/DashboardPanel";
import EventDetailPanel from "./components/ui/EventDetailPanel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { PanelLeftOpen, PanelRightOpen } from "lucide-react";
import type {
  EventData,
  ClusterData,
  MapView,
  OverallSummaryData,
} from "@/types";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch (e) {
    return false;
  }
}

function App() {
  const [clusterDisplayData, setClusterDisplayData] = useState<ClusterData[]>(
    []
  ); // holds clusters for the globe
  const [minYear, setMinYear] = useState(0);
  const [maxYear, setMaxYear] = useState(0);
  const [currentYearRange, setCurrentYearRange] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const [dataRangeLoaded, setDataRangeLoaded] = useState(false);
  const [isDashboardVisible, setIsDashboardVisible] = useState(true);
  const [mapView, setMapView] = useState<MapView | null>(null);
  const mapViewUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null); // ref for debounce timer

  // state for events within a selected cluster
  const [detailedEventsInCluster, setDetailedEventsInCluster] = useState<
    EventData[] | null
  >(null);
  const [selectedCluster, setSelectedCluster] = useState<ClusterData | null>(
    null
  );
  const [isLoadingClusterDetails, setIsLoadingClusterDetails] = useState(false);
  const [overallSummaryData, setOverallSummaryData] =
    useState<OverallSummaryData | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(true); // initial state
  const [webGLSupported, setWebGLSupported] = useState(true);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [isTimelineFocused, setIsTimelineFocused] = useState(false); //  timeline transparency

  useEffect(() => {
    setWebGLSupported(isWebGLAvailable());
    const hideModalPreference = localStorage.getItem(
      "hideConflictTrackerInfoModal"
    );
    if (hideModalPreference === "true") {
      setShowInfoModal(false);
    }
  }, []);

  // get the min/max year range for the slider
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/config/datarange`)
      .then((res) => res.json())
      .then((data) => {
        if (data.minYear && data.maxYear) {
          setMinYear(data.minYear);
          setMaxYear(data.maxYear);
          setCurrentYearRange({ start: data.minYear, end: data.maxYear });
          setDataRangeLoaded(true);
        } else {
          /* ... error handling ... */
          console.error("Failed to fetch valid data range from API.");
          const currentSystemYear = new Date().getFullYear();
          setMinYear(1990);
          setMaxYear(currentSystemYear);
          setCurrentYearRange({ start: 1990, end: currentSystemYear });
          setDataRangeLoaded(true);
        }
      })
      .catch((err) => {
        /* ... error handling ... */
        console.error("Error loading data range from API:", err);
        const currentSystemYear = new Date().getFullYear();
        setMinYear(1990);
        setMaxYear(currentSystemYear);
        setCurrentYearRange({ start: 1990, end: currentSystemYear });
        setDataRangeLoaded(true);
      });
  }, []);

  // get clusters when currentYearRange or mapView (for zoom/center) changes
  useEffect(() => {
    if (currentYearRange && dataRangeLoaded) {
      const { start, end } = currentYearRange;
      let apiUrl = `${API_BASE_URL}/api/events?startYear=${start}&endYear=${end}`;

      let calculatedZoomLevel = 5; // Default for overview
      if (mapView) {
        // pass mapView details to get appropriate cluster granularity
        if (mapView.altitude < 0.5) calculatedZoomLevel = 15;
        else if (mapView.altitude < 1.0) calculatedZoomLevel = 12;
        else if (mapView.altitude < 1.5) calculatedZoomLevel = 9;
        else if (mapView.altitude < 2.0) calculatedZoomLevel = 7;
        apiUrl += `&zoomLevel=${calculatedZoomLevel}`;
        apiUrl += `&centerLat=${mapView.lat}&centerLng=${mapView.lng}`;
        // console.log( // Dev log for cluster request details
        //   `[App] Requesting CLUSTERS. Altitude: ${mapView.altitude.toFixed(2)}, Zoom: ${calculatedZoomLevel}, Center: ${mapView.lat.toFixed(2)},${mapView.lng.toFixed(2)}`
        // );
      } else {
        apiUrl += `&zoomLevel=${calculatedZoomLevel}`; // Initial load zoom
        // console.log(`[App] Initial load, requesting CLUSTERS. Default Zoom: ${calculatedZoomLevel}`);
      }

      // console.log(`Fetching clusters from: ${apiUrl}`); // Can be noisy
      fetch(apiUrl)
        .then((res) => res.json())
        .then((data: ClusterData[]) => {
          setClusterDisplayData(data);
          // console.log(`Received ${data.length} clusters from API.`); // A bit verbose for production
        })
        .catch((err) => {
          console.error("Error loading clusters from API:", err);
          setClusterDisplayData([]);
        });
    }
  }, [currentYearRange, dataRangeLoaded, mapView]);

  // get overall summary data when currentYearRange changes
  useEffect(() => {
    if (currentYearRange && dataRangeLoaded) {
      const { start, end } = currentYearRange;
      const summaryApiUrl = `${API_BASE_URL}/api/events/summary?startYear=${start}&endYear=${end}`;
      // console.log(`Fetching overall summary data from: ${summaryApiUrl}`); // A bit noisy
      fetch(summaryApiUrl)
        .then((res) => res.json())
        .then((data: OverallSummaryData) => {
          setOverallSummaryData(data);
          // console.log( // Verbose for production
          //   `Received overall summary data: ${data.byYear.length} years, ${data.byGroup.length} groups.`
          // );
        })
        .catch((err) => {
          console.error("Error loading overall summary data:", err);
          setOverallSummaryData(null);
        });
    }
  }, [currentYearRange, dataRangeLoaded]);

  const handleYearRangeChange = useCallback(
    (startYear: number, endYear: number) => {
      setCurrentYearRange({ start: startYear, end: endYear });
      // year range changes, clear any selected cluster details
      setSelectedCluster(null);
      setDetailedEventsInCluster(null);
    },
    []
  );

  const handleViewChange = useCallback((newView: MapView) => {
    // console.log("GlobeDisplay reported view change:", newView); // Raw view changes
    if (mapViewUpdateTimeoutRef.current) {
      clearTimeout(mapViewUpdateTimeoutRef.current);
    }
    mapViewUpdateTimeoutRef.current = setTimeout(() => {
      // console.log( // Dev log for debounced view change
      //   "Debounced: Setting MapView and triggering API fetch for clusters:",
      //   newView
      // );
      setMapView(newView);
    }, 500); 
  }, []); // Empty dependency array, uses ref

  // cleanup timeout on component unmount
  useEffect(() => {
    return () => {
      if (mapViewUpdateTimeoutRef.current) {
        clearTimeout(mapViewUpdateTimeoutRef.current);
      }
    };
  }, []);

  const handleClusterClick = useCallback(
    (cluster: ClusterData) => {
      if (!currentYearRange) return;
      // console.log("Cluster clicked:", cluster); // Informative, but can be noisy
      setSelectedCluster(cluster);
      setIsLoadingClusterDetails(true);
      setDetailedEventsInCluster(null); // Clear previous details

      // cluster.bounds which should be returned by the /api/events endpoint
      const { minLat, maxLat, minLng, maxLng } = cluster.bounds;
      const { start, end } = currentYearRange;

      const detailApiUrl = `${API_BASE_URL}/api/events_in_cluster?minLat=${minLat}&maxLat=${maxLat}&minLng=${minLng}&maxLng=${maxLng}&startYear=${start}&endYear=${end}&limit=100`;

      // console.log("Fetching detailed events for cluster:", detailApiUrl); // Can be noisy
      fetch(detailApiUrl)
        .then((res) => res.json())
        .then((events: EventData[]) => {
          setDetailedEventsInCluster(events);
          // console.log(`Received ${events.length} detailed events for cluster.`);
        })
        .catch((err) => {
          console.error("Error fetching detailed events for cluster:", err);
          setDetailedEventsInCluster([]); // resetset to empty array on error
        })
        .finally(() => {
          setIsLoadingClusterDetails(false);
        });
    },
    [currentYearRange]
  );

  const handleCloseDetailPanel = () => {
    setSelectedCluster(null);
    setDetailedEventsInCluster(null);
  };

  const handleTimelineInteractionStart = () => setIsTimelineFocused(true);
  const handleTimelineInteractionEnd = () => setIsTimelineFocused(false);

  const handleInfoModalOpenChange = (open: boolean) => {
    setShowInfoModal(open);
    if (!open && dontShowAgain) {
      localStorage.setItem("hideConflictTrackerInfoModal", "true");
    }
  };

  if (!webGLSupported) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-slate-100 p-8 text-center">
        <h1 className="text-2xl font-semibold mb-4">WebGL Not Supported</h1>
        <p className="mb-2">
          This application requires WebGL to display the 3D globe visualization.
        </p>
        <p>
          Please try a different browser or device, or ensure WebGL is enabled
          in your browser settings.
        </p>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", height: "100vh", width: "100%" }}>
      <GlobeDisplay
        clusters={clusterDisplayData}
        onViewChange={handleViewChange}
        onClusterClick={handleClusterClick}
      />
      {dataRangeLoaded && currentYearRange && (
        <div
          className={`timeline-container absolute bottom-0 left-0 right-0 z-20 p-4 transition-opacity duration-300 ease-in-out ${
            isTimelineFocused ? "opacity-100" : "opacity-60 hover:opacity-90"
          }`}
        >
          <TimelineSlider
            minYear={minYear}
            maxYear={maxYear}
            valueStartYear={currentYearRange.start}
            valueEndYear={currentYearRange.end}
            onYearRangeChange={handleYearRangeChange}
            onBeforeChange={handleTimelineInteractionStart}
            onAfterChange={handleTimelineInteractionEnd}
          />
        </div>
      )}
      <div className="absolute top-4 left-4 z-30 flex items-start space-x-2">
        {dataRangeLoaded && currentYearRange && isDashboardVisible && (
          <DashboardPanel
            totalFilteredEvents={
              selectedCluster
                ? detailedEventsInCluster
                  ? detailedEventsInCluster.length
                  : 0
                : overallSummaryData
                ? overallSummaryData.byYear.reduce((sum, y) => sum + y.count, 0)
                : clusterDisplayData.reduce((sum, c) => sum + c.count, 0)
            }
            currentYearRange={currentYearRange}
            detailedEventsData={detailedEventsInCluster}
            overallSummaryData={overallSummaryData} 
            isClusterSelected={!!selectedCluster}
          />
        )}
        <Button
          variant="outline"
          size="icon"
          className="bg-slate-800 hover:bg-slate-700 text-slate-100 shrink-0"
          onClick={() => setIsDashboardVisible(!isDashboardVisible)}
          aria-label={isDashboardVisible ? "Hide Dashboard" : "Show Dashboard"}
        >
          {isDashboardVisible ? (
            <PanelRightOpen className="h-5 w-5" />
          ) : (
            <PanelLeftOpen className="h-5 w-5" />
          )}
        </Button>
      </div>
      {selectedCluster && (
        <EventDetailPanel
          cluster={selectedCluster}
          events={detailedEventsInCluster}
          isLoading={isLoadingClusterDetails}
          onClose={handleCloseDetailPanel}
        />
      )}

      <Dialog open={showInfoModal} onOpenChange={handleInfoModalOpenChange}>
        <DialogContent className="bg-slate-800 text-slate-100 border-slate-700 sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              Welcome to MENA Interactive Geospatial Conflict Tracker!
            </DialogTitle>
            <DialogDescription className="text-slate-400 pt-2">
              Explore global unrest and extremist activity with these
              interactive features:
            </DialogDescription>
          </DialogHeader>
          <ul className="list-disc list-inside space-y-2 text-sm text-slate-300 py-4">
            <li>
              Use the <strong className="text-sky-400">timeline slider</strong>{" "}
              at the bottom to select a year range.
            </li>
            <li>
              <strong className="text-sky-400">Zoom and pan</strong> the globe
              to explore different regions.
            </li>
            <li>
              Click on event clusters (orange spikes) to view{" "}
              <strong className="text-sky-400">detailed information</strong> and
              charts in the dashboard.
            </li>
            <li>
              Toggle the{" "}
              <strong className="text-sky-400">dashboard visibility</strong>{" "}
              using the button in the top-left.
            </li>
          </ul>
          <p className="text-xs text-slate-500 pt-3">
            Data sourced from ACLED (Armed Conflict Location & Event Data
            Project), covering events from 1999 to May 2, 2025, for the Middle
            East and North Africa region.
          </p>
          <DialogFooter className="sm:justify-between pt-4">
            {" "}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="dontShowAgainInfoModal" 
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="h-4 w-4 text-sky-500 border-slate-600 rounded focus:ring-sky-400 bg-slate-700"
              />
              <label
                htmlFor="dontShowAgainInfoModal"
                className="text-xs text-slate-400 select-none"
              >
                Don't show this again
              </label>
            </div>
            <DialogClose asChild>
              <Button
                type="button"
                variant="secondary"
                className="bg-sky-500 hover:bg-sky-600 text-white mt-2 sm:mt-0"
              >
                Got it!
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;
