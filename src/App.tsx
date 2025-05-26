import React, { useState, useEffect, useCallback } from 'react';
import GlobeDisplay from './components/visualization/GlobeDisplay';
import type { EventData } from './components/visualization/GlobeDisplay'; // Type-only import
import TimelineSlider from './components/ui/TimelineSlider';

const EVENTS_JSON_URL = '/data/events.json'; // Path to our events data

// Helper to extract year from YYYY-MM-DD date string
const getYearFromDate = (dateString: string): number => {
  if (!dateString || typeof dateString !== 'string' || dateString.length < 4) {
    console.warn(`Invalid date string encountered: ${dateString}`);
    return 0; // Or throw an error, or return a sentinel value like NaN
  }
  return parseInt(dateString.substring(0, 4), 10);
};

function App() {
  const [allEvents, setAllEvents] = useState<EventData[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EventData[]>([]);
  
  const [minYear, setMinYear] = useState(1990); 
  const [maxYear, setMaxYear] = useState(new Date().getFullYear());
  const [currentYearRange, setCurrentYearRange] = useState({ start: minYear, end: maxYear });
  const [dataProcessed, setDataProcessed] = useState(false); // Flag to ensure year calculation runs once

  // Step 1: Fetch all event data once on component mount
  useEffect(() => {
    fetch(EVENTS_JSON_URL)
      .then(res => res.json())
      .then((data: EventData[]) => {
        setAllEvents(data);
      })
      .catch(err => console.error("Error loading Events JSON in App:", err));
  }, []); // Empty dependency array: runs once on mount

  // Step 2: Process allEvents when it's populated (or changes, though it shouldn't here)
  useEffect(() => {
    if (allEvents.length > 0 && !dataProcessed) { // Process only once after data is loaded
      const years = allEvents.map(event => getYearFromDate(event.date)).filter(year => !isNaN(year) && year !== 0); // Filter out invalid years
      
      if (years.length > 0) {
        // Calculate min/max without spread operator for very large arrays
        let newMinYear = years[0];
        let newMaxYear = years[0];
        for (let i = 1; i < years.length; i++) {
          if (years[i] < newMinYear) newMinYear = years[i];
          if (years[i] > newMaxYear) newMaxYear = years[i];
        }
        
        setMinYear(newMinYear);
        setMaxYear(newMaxYear);
        setCurrentYearRange({ start: newMinYear, end: newMaxYear });
        
        const initialFiltered = allEvents.filter(event => {
          const eventYear = getYearFromDate(event.date);
          return eventYear >= newMinYear && eventYear <= newMaxYear;
        });
        setFilteredEvents(initialFiltered.slice(0, 2000));
        console.log(`Initially displaying up to 2000 events from the full range.`);
        setDataProcessed(true); // Mark as processed
      } else {
        console.warn("No valid years found in event data to determine range.");
        // Keep default min/max year and currentYearRange, or set to a fallback
        // Set filteredEvents to empty or a small subset if desired
        setFilteredEvents([]);
        setDataProcessed(true); // Mark as processed to avoid re-running
      }
    }
  }, [allEvents, dataProcessed]); // Runs when allEvents changes or dataProcessed changes

  // Callback for when the timeline slider changes
  const handleYearRangeChange = useCallback((startYear: number, endYear: number) => {
    console.log('[App] handleYearRangeChange:', { startYear, endYear });
    setCurrentYearRange({ start: startYear, end: endYear });
    const filtered = allEvents.filter(event => {
      const eventYear = getYearFromDate(event.date);
      return eventYear >= startYear && eventYear <= endYear;
    });
    const MAX_DISPLAY_POINTS = 2000;
    console.log(`Filtered to ${filtered.length} events. Displaying up to ${MAX_DISPLAY_POINTS}.`);
    setFilteredEvents(filtered.slice(0, MAX_DISPLAY_POINTS));
  }, [allEvents]); // Only depends on allEvents

  return (
    <div style={{ position: 'relative', height: '100vh', width: '100%' }}>
      <GlobeDisplay events={filteredEvents} />
      {allEvents.length > 0 && dataProcessed && ( // Only render slider if data is processed
        <TimelineSlider
          minYear={minYear}
          maxYear={maxYear}
          valueStartYear={currentYearRange.start}
          valueEndYear={currentYearRange.end}
          onYearRangeChange={handleYearRangeChange}
        />
      )}
    </div>
  );
}

export default App;
