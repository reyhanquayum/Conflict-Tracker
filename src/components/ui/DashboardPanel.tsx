import React from 'react';
import BarChart from '@/components/charts/BarChart';
import PieChart from '@/components/charts/PieChart'; // Import PieChart
import type { EventData } from '@/components/visualization/GlobeDisplay';
// We might use shadcn/ui Card component here later
// import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

interface DashboardPanelProps {
  totalFilteredEvents?: number;
  currentYearRange?: { start: number; end: number };
  eventsData: EventData[]; // Add eventsData prop
}

const DashboardPanel: React.FC<DashboardPanelProps> = ({ 
  totalFilteredEvents, 
  currentYearRange,
  eventsData 
}) => {
  return (
    // Increased width slightly to accommodate chart, adjust as needed e.g., max-w-sm or max-w-md
    <div className="absolute top-4 left-4 w-auto max-w-md bg-slate-800 text-slate-100 p-4 shadow-lg rounded-lg z-20 overflow-y-auto max-h-[calc(100vh-2rem)]">
      <h3 className="text-lg font-semibold text-slate-50 mb-3 border-b border-slate-700 pb-2">
        Dashboard
      </h3>
      <div className="space-y-4 text-sm"> {/* Increased space-y for chart */}
        {currentYearRange && (
          <p>
            <strong className="text-slate-300">Selected Years:</strong> {currentYearRange.start} - {currentYearRange.end}
          </p>
        )}
        {totalFilteredEvents !== undefined && (
          <p>
            <strong className="text-slate-300">Displayed Events:</strong> {totalFilteredEvents}
          </p>
        )}
        {/* Placeholder for more stats */}
        {/* <p className="text-xs text-slate-500 pt-2">
          (More statistics will be shown here)
        </p> */}
        <div>
          <BarChart data={eventsData} width={350} height={200} /> 
          {/* Adjust width/height as needed */}
        </div>
        <div>
          <PieChart data={eventsData} width={350} height={250} /> 
          {/* Adjust width/height as needed, pie might need more height for labels */}
        </div>
      </div>
    </div>
  );
};

export default DashboardPanel;
