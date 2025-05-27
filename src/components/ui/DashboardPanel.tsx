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
    ? (detailedEventsData || []) // Use detailed events if cluster selected (pass as EventData[])
    : (overallSummaryData ? overallSummaryData.byYear : []); // Use summary byYear if overview (pass as YearlyCount[])
  
  const pieChartData = isClusterSelected
    ? (detailedEventsData || []) // Use detailed events if cluster selected (pass as EventData[])
    : (overallSummaryData ? overallSummaryData.byGroup : []); // Use summary byGroup if overview (pass as GroupCount[])

  return (
    // Changed background to slate-900 for a darker navy/charcoal feel.
    <div className="w-auto max-w-md bg-slate-900 text-slate-100 p-4 shadow-lg rounded-lg overflow-y-auto max-h-[calc(100vh-2rem)]">
      <h3 className="text-lg font-semibold text-slate-100 mb-3 border-b border-slate-700 pb-2"> {/* Title text to slate-100 for consistency */}
        Dashboard
      </h3>
      <div className="space-y-4 text-sm">
        {" "}
        {/* Increased space-y for chart */}
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
        {/* Placeholder for more stats */}
        {/* <p className="text-xs text-slate-500 pt-2">
          (More statistics will be shown here)
        </p> */}
        <div>
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
