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
    <div className="w-auto max-w-md bg-slate-900 text-slate-100 p-4 shadow-lg rounded-lg overflow-y-auto max-h-[calc(100vh-2rem)]">
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
          {/* Types for BarChart/PieChart data prop need to be EventData[] | YearlyCount[] / GroupCount[] */}
          <BarChart data={barChartData} width={350} height={200} />
        </div>
        <div>
          <PieChart data={pieChartData} width={350} height={250} />
        </div>
      </div>
    </div>
  );
};

export default DashboardPanel;
