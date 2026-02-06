import React, { useState, useEffect } from 'react';
import Range from 'rc-slider';
import 'rc-slider/assets/index.css';

interface TimelineSliderProps {
  minYear: number;
  maxYear: number;
  valueStartYear: number;
  valueEndYear: number;
  onYearRangeChange: (startYear: number, endYear: number) => void;
  onBeforeChange?: () => void; 
  onAfterChange?: () => void; 
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
  const [draftRange, setDraftRange] = useState<[number, number]>([valueStartYear, valueEndYear]);

  useEffect(() => {
    setDraftRange([valueStartYear, valueEndYear]);
  }, [valueStartYear, valueEndYear]);


  const handleSliderContinuousChange = (newRange: number | number[]) => {
    if (Array.isArray(newRange) && newRange.length === 2) {
      setDraftRange([newRange[0], newRange[1]]);
    }
  };


  const handleSliderFinalChange = (newRange: number | number[]) => {
    if (Array.isArray(newRange) && newRange.length === 2) {
      setDraftRange([newRange[0], newRange[1]]); 
      onYearRangeChange(newRange[0], newRange[1]);
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
    <div className="absolute bottom-4 left-4 right-4 z-10 bg-zinc-900/95 text-zinc-100 p-3 border border-zinc-700/50 rounded backdrop-blur-sm">
      <h4 className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest mb-2 text-center">Year Range</h4>
      <div className="flex items-center px-2">
        <span className="mr-3 text-sm tabular-nums">{draftRange[0]}</span> 
        <Range
          min={minYear}
          max={maxYear}
          value={draftRange} 
          onChange={handleSliderContinuousChange}
          onBeforeChange={onBeforeChange}
          onAfterChange={() => { 
            handleSliderFinalChange(draftRange);
            if (onAfterChange) onAfterChange();
          }}

          allowCross={false}
          count={1}
          range={true}

        />
        <span className="ml-3 text-sm tabular-nums">{draftRange[1]}</span>
      </div>
    </div>
  );
};

export default TimelineSlider;
