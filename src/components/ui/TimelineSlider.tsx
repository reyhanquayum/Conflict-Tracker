import React, { useState, useEffect } from 'react'; // Re-added useState, useEffect
import Range from 'rc-slider';
import 'rc-slider/assets/index.css';

interface TimelineSliderProps {
  minYear: number;
  maxYear: number;
  valueStartYear: number;
  valueEndYear: number;
  onYearRangeChange: (startYear: number, endYear: number) => void;
  onBeforeChange?: () => void; // Optional: Called when drag starts
  onAfterChange?: () => void;  // Optional: Called when drag ends
}

const TimelineSlider: React.FC<TimelineSliderProps> = ({
  minYear,
  maxYear,
  valueStartYear,
  valueEndYear,
  onYearRangeChange,
  onBeforeChange,
  onAfterChange,
}) => {
  // Local state for live feedback during drag
  const [draftRange, setDraftRange] = useState<[number, number]>([valueStartYear, valueEndYear]);

  // Effect to update draftRange when the authoritative value from App.tsx changes
  // This happens on initial load and after onYearRangeChange is called (drag complete)
  useEffect(() => {
    setDraftRange([valueStartYear, valueEndYear]);
  }, [valueStartYear, valueEndYear]);

  // onChange handler for rc-slider:
  // Updates local draftRange for live visual feedback of numbers next to slider.
  const handleSliderContinuousChange = (newRange: number | number[]) => {
    if (Array.isArray(newRange) && newRange.length === 2) {
      setDraftRange([newRange[0], newRange[1]]);
    }
  };

  // onChangeComplete handler for rc-slider:
  // Called when the user releases the slider. This propagates the change to App.tsx.
  const handleSliderFinalChange = (newRange: number | number[]) => {
    if (Array.isArray(newRange) && newRange.length === 2) {
      // It's good practice to also update draftRange here in case onChange didn't fire for the very last value
      setDraftRange([newRange[0], newRange[1]]); 
      onYearRangeChange(newRange[0], newRange[1]); // Propagate to App.tsx
    }
  };

  if (minYear >= maxYear || valueStartYear === undefined || valueEndYear === undefined || valueStartYear > valueEndYear) {
    return (
        <div style={{ padding: '20px', backgroundColor: 'rgba(40,40,40,0.8)', color: 'white', position: 'absolute', bottom: '20px', left: '20px', right: '20px', zIndex: 10, textAlign: 'center' }}>
            <p>Loading year range or invalid range...</p>
        </div>
    );
  }

  return (
    <div className="absolute bottom-4 left-4 right-4 z-10 bg-slate-900 text-slate-100 p-4 shadow-lg rounded-lg">
      <h4 className="text-md font-semibold text-slate-100 mb-3 text-center">Filter Events by Year Range</h4>
      <div className="flex items-center px-2"> {/* Adjusted padding */}
        {/* Display draftRange for live feedback */}
        <span className="mr-3 text-sm tabular-nums">{draftRange[0]}</span> 
        <Range
          min={minYear}
          max={maxYear}
          value={draftRange} 
          onChange={handleSliderContinuousChange}
          onBeforeChange={onBeforeChange} // Pass through
          onAfterChange={() => { // Call both our final change and the onAfterChange prop
            handleSliderFinalChange(draftRange); // Ensure final change uses the latest draft
            if (onAfterChange) onAfterChange();
          }}
          // onChangeComplete is still useful for the final value propagation
          // but onAfterChange is better for focus state.
          // Let's ensure handleSliderFinalChange is robustly called.
          // rc-slider's onAfterChange is called with the value, let's use that.
          // We'll remove onChangeComplete and rely on onAfterChange for final value.
          // onChange={handleSliderContinuousChange}
          // onBeforeChange={onBeforeChange}
          // onAfterChange={handleSliderFinalChangeAndBlur} // New combined handler
          allowCross={false}
          count={1}
          range={true}
          // Optional: Apply Tailwind-friendly styling to rc-slider tracks/handles if needed
          // trackStyle={[{ backgroundColor: 'rgb(var(--color-primary))' }]} // Example using CSS var
          // handleStyle={[{ borderColor: 'rgb(var(--color-primary))', backgroundColor: 'white' }]}
          // railStyle={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
        />
        <span className="ml-3 text-sm tabular-nums">{draftRange[1]}</span>
      </div>
    </div>
  );
};

export default TimelineSlider;
