import React from "react";
import BarChart from "@/components/charts/BarChart";
import PieChart from "@/components/charts/PieChart"; 
import type { EventData, OverallSummaryData, YearlyCount, GroupCount } from "@/types"; 

interface DashboardPanelProps {
  totalFilteredEvents?: number;
  currentYearRange?: { start: number; end: number };
  detailedEventsData: EventData[] | null;      // Data for when a cluster is selected
  overallSummaryData: OverallSummaryData | null; // Data for overview
  isClusterSelected: boolean;                   // Flag to determine which data to use
}

const DashboardPanel: React.FC<DashboardPanelProps> = ({
  totalFilteredEvents,
  currentYearRange,
  detailedEventsData,
  overallSummaryData,
  isClusterSelected,
}) => {
  // Determine data for charts based on whether a cluster is selected
  const barChartData = isClusterSelected 
    ? (detailedEventsData || []) 
    : (overallSummaryData ? overallSummaryData.byYear : []); 
  
  const pieChartData = isClusterSelected
    ? (detailedEventsData || []) 
    : (overallSummaryData ? overallSummaryData.byGroup : []); 

  return (
    <div className="w-auto max-w-sm bg-slate-900 text-slate-100 p-4 shadow-lg rounded-lg overflow-y-auto max-h-[calc(100vh-2rem)]"> {/* Changed max-w-md to max-w-sm */}
      <h3 className="text-lg font-semibold text-slate-100 mb-3 border-b border-slate-700 pb-2">
        Dashboard
      </h3>
      <div className="space-y-4 text-sm">
        {currentYearRange && (
          <p>
            <strong className="text-slate-300">Selected Years:</strong>{" "}
            {currentYearRange.start} - {currentYearRange.end}
          </p>
        )}
        {totalFilteredEvents !== undefined && (
          <p>
            <strong className="text-slate-300">Displayed Events:</strong>{" "}
            {totalFilteredEvents}
          </p>
        )}
        <div>
          <BarChart data={barChartData} width={320} height={200} /> {/* Reduced width */}
        </div>
        <div>
          <PieChart data={pieChartData} width={320} height={250} /> {/* Reduced width */}
        </div>
      </div>
    </div>
  );
};

export default DashboardPanel;
