import React, { useState, useEffect, useCallback } from 'react';
import GlobeDisplay from './components/visualization/GlobeDisplay';
import type { EventData } from './components/visualization/GlobeDisplay';
import TimelineSlider from './components/ui/TimelineSlider';
import DashboardPanel from './components/ui/DashboardPanel';

const API_BASE_URL = 'http://localhost:3001'; // Or your backend server port
const MAX_DISPLAY_POINTS = 2000; // Max points to fetch/display for performance

// Helper to extract year from YYYY-MM-DD date string - might not be needed if API handles it
// const getYearFromDate = (dateString: string): number => { ... };

function App() {
  const [filteredEvents, setFilteredEvents] = useState<EventData[]>([]);
  const [minYear, setMinYear] = useState(0); // Will be set from API
  const [maxYear, setMaxYear] = useState(0); // Will be set from API
  const [currentYearRange, setCurrentYearRange] = useState<{ start: number; end: number } | null>(null);
  const [dataRangeLoaded, setDataRangeLoaded] = useState(false);

  // Step 1: Fetch min/max year range for the slider
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/config/datarange`)
      .then(res => res.json())
      .then(data => {
        if (data.minYear && data.maxYear) {
          setMinYear(data.minYear);
          setMaxYear(data.maxYear);
          setCurrentYearRange({ start: data.minYear, end: data.maxYear });
          setDataRangeLoaded(true);
        } else {
          // Fallback if API doesn't return valid range
          console.error("Failed to fetch valid data range from API.");
          const currentSystemYear = new Date().getFullYear();
          setMinYear(1990); // Default
          setMaxYear(currentSystemYear);
          setCurrentYearRange({ start: 1990, end: currentSystemYear });
          setDataRangeLoaded(true); // Allow UI to proceed with defaults
        }
      })
      .catch(err => {
        console.error("Error loading data range from API:", err);
        // Fallback on error
        const currentSystemYear = new Date().getFullYear();
        setMinYear(1990);
        setMaxYear(currentSystemYear);
        setCurrentYearRange({ start: 1990, end: currentSystemYear });
        setDataRangeLoaded(true);
      });
  }, []); // Runs once on mount

  // Step 2: Fetch events when currentYearRange is set or changes
  useEffect(() => {
    if (currentYearRange && dataRangeLoaded) {
      const { start, end } = currentYearRange;
      console.log(`Fetching events for range: ${start} - ${end}`);
      fetch(`${API_BASE_URL}/api/events?startYear=${start}&endYear=${end}&limit=${MAX_DISPLAY_POINTS}`)
        .then(res => res.json())
        .then((data: EventData[]) => {
          setFilteredEvents(data);
          console.log(`Received ${data.length} events from API.`);
        })
        .catch(err => {
          console.error("Error loading events from API:", err);
          setFilteredEvents([]); // Clear events on error
        });
    }
  }, [currentYearRange, dataRangeLoaded]); // Runs when currentYearRange or dataRangeLoaded changes

  // Callback for when the timeline slider changes
  const handleYearRangeChange = useCallback((startYear: number, endYear: number) => {
    // This function now only updates the currentYearRange state.
    // The useEffect hook above will then fetch the new data.
    setCurrentYearRange({ start: startYear, end: endYear });
  }, []); // No dependencies needed if it only sets state based on its args

  return (
    <div style={{ position: 'relative', height: '100vh', width: '100%' }}>
      <GlobeDisplay events={filteredEvents} />
      {dataRangeLoaded && currentYearRange && ( // Only render slider if range is loaded
        <TimelineSlider
          minYear={minYear}
          maxYear={maxYear}
          valueStartYear={currentYearRange.start}
          valueEndYear={currentYearRange.end}
          onYearRangeChange={handleYearRangeChange}
        />
      )}
      {dataRangeLoaded && currentYearRange && ( // Render dashboard if range is loaded
        <DashboardPanel 
          totalFilteredEvents={filteredEvents.length}
          currentYearRange={currentYearRange}
          eventsData={filteredEvents}
        />
      )}
    </div>
  );
}

export default App;
