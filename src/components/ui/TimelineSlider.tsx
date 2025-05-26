import React, { useState, useEffect } from 'react'; // Re-added useState, useEffect
import Range from 'rc-slider';
import 'rc-slider/assets/index.css';

interface TimelineSliderProps {
  minYear: number;
  maxYear: number;
  valueStartYear: number;
  valueEndYear: number;
  onYearRangeChange: (startYear: number, endYear: number) => void;
}

const TimelineSlider: React.FC<TimelineSliderProps> = ({
  minYear,
  maxYear,
  valueStartYear,
  valueEndYear,
  onYearRangeChange,
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
    <div style={{ padding: '20px', backgroundColor: 'rgba(40,40,40,0.8)', color: 'white', position: 'absolute', bottom: '20px', left: '20px', right: '20px', zIndex: 10 }}>
      <h4 style={{ marginTop: 0, marginBottom: '15px' }}>Filter Events by Year Range</h4>
      <div style={{ display: 'flex', alignItems: 'center', padding: '0 10px' }}>
        {/* Display draftRange for live feedback */}
        <span style={{ marginRight: '15px' }}>{draftRange[0]}</span> 
        <Range
          min={minYear}
          max={maxYear}
          value={draftRange} // Slider is controlled by local draftRange during drag
          onChange={handleSliderContinuousChange}
          onChangeComplete={handleSliderFinalChange}
          allowCross={false}
          count={1}
          range={true}
        />
        {/* Display draftRange for live feedback */}
        <span style={{ marginLeft: '15px' }}>{draftRange[1]}</span>
      </div>
    </div>
  );
};

export default TimelineSlider;
