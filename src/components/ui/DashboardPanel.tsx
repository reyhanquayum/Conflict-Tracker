import React from 'react';
// We might use shadcn/ui Card component here later
// import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

interface DashboardPanelProps {
  // Props to pass data, e.g., totalEvents, activeGroups, etc.
  // For now, let's keep it simple.
  totalFilteredEvents?: number;
  currentYearRange?: { start: number; end: number };
}

const DashboardPanel: React.FC<DashboardPanelProps> = ({ 
  totalFilteredEvents, 
  currentYearRange 
}) => {
  return (
    <div className="absolute top-4 left-4 w-auto max-w-xs bg-slate-800 text-slate-100 p-4 shadow-lg rounded-lg z-20">
      <h3 className="text-lg font-semibold text-slate-50 mb-3 border-b border-slate-700 pb-2">
        Dashboard
      </h3>
      <div className="space-y-2 text-sm">
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
        <p className="text-xs text-slate-500 pt-2">
          (More statistics will be shown here)
        </p>
      </div>
    </div>
  );
};

export default DashboardPanel;
