import React, { useMemo } from "react"; // Removed useState
import BarChart from "@/components/charts/BarChart";
import PieChart from "@/components/charts/PieChart";
import EventTypesPieChart from "@/components/charts/EventTypesPieChart";
import { Combobox } from "@/components/ui/combobox"; // Import Combobox
import type {
  EventData,
  OverallSummaryData,
  YearlyCount,
  GroupCount,
  EventTypeCount,
} from "@/types";

interface DashboardPanelProps {
  totalFilteredEvents?: number;
  currentYearRange?: { start: number; end: number };
  detailedEventsData: EventData[] | null;
  overallSummaryData: OverallSummaryData | null;
  isClusterSelected: boolean;
  // New props for filters
  availableGroups: string[];
  selectedGroup: string | null;
  onGroupChange: (group: string | null) => void;
  availableEventTypes: string[];
  selectedEventType: string | null;
  onEventTypeChange: (eventType: string | null) => void;
}

const DashboardPanel: React.FC<DashboardPanelProps> = ({
  totalFilteredEvents,
  currentYearRange,
  detailedEventsData,
  overallSummaryData,
  isClusterSelected,
  availableGroups,
  selectedGroup,
  onGroupChange,
  availableEventTypes,
  selectedEventType,
  onEventTypeChange,
}) => {
  // Format availableGroups for the Combobox
  const groupOptions = useMemo(
    () =>
      availableGroups
        .map((group) => ({ value: group, label: group })),
    [availableGroups]
  );

  const barChartData = useMemo(() => {
    return isClusterSelected
      ? detailedEventsData || [] // Corrected: use prop detailedEventsData
      : overallSummaryData
      ? overallSummaryData.byYear
      : [];
  }, [isClusterSelected, detailedEventsData, overallSummaryData]);

  const pieChartData = useMemo(() => {
    return isClusterSelected
      ? detailedEventsData || [] // Corrected: use prop detailedEventsData
      : overallSummaryData
      ? overallSummaryData.byGroup
      : [];
  }, [isClusterSelected, detailedEventsData, overallSummaryData]);

  const { data: eventTypesPieChartData, title: eventTypesPieChartTitle } =
    useMemo(() => {
      let data: EventTypeCount[] = [];
      let title = "Global Event Types";

      if (
        selectedGroup &&
        overallSummaryData?.eventTypeCountsForSelectedGroup
      ) {
        data = overallSummaryData.eventTypeCountsForSelectedGroup;
        title = `Event Types for ${selectedGroup}`;
      } else if (overallSummaryData?.byEventTypeGlobal) {
        data = overallSummaryData.byEventTypeGlobal;
      }
      return { data, title };
    }, [selectedGroup, overallSummaryData]);

  // If detailedEventsData is available (cluster selected) and no global group filter,
  // we could potentially derive event types from detailedEventsData for the new pie chart.
  // However, the current logic prioritizes overallSummaryData for this new chart.
  // If a cluster is selected, this new pie chart will show global types or types for a globally selected group.
  // This might be an area for future refinement if cluster-specific event type breakdown is needed here.

  return (
    <div className="w-auto max-w-sm bg-slate-900 text-slate-100 p-4 shadow-lg rounded-lg overflow-y-auto max-h-[calc(100vh-2rem)]">
      {" "}
      {/* Changed max-w-md to max-w-sm */}
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

        {/* Filter Dropdowns */}
        <div className="space-y-3 pt-2">
          <div>
            <label
              htmlFor="group-combobox"
              className="block text-xs font-medium text-slate-300 mb-1"
            >
              Filter by Group:
            </label>
            <Combobox
              options={groupOptions}
              value={selectedGroup || undefined} // Combobox expects undefined for no selection if placeholder is used
              onChange={(value) => onGroupChange(value)} // value will be string or null
              placeholder="Select group..."
              searchPlaceholder="Search groups..."
              emptyText="No group found."
              triggerClassName="bg-slate-700 border-slate-600 text-slate-100 hover:bg-slate-600 focus:ring-sky-500 focus:border-sky-500"
              contentClassName="bg-slate-800 border-slate-700 text-slate-100" // Style popover content
            />
          </div>
          <div>
            <label
              htmlFor="event-type-filter"
              className="block text-xs font-medium text-slate-300 mb-1"
            >
              Filter by Event Type:
            </label>{" "}
            {/* This can remain a select for now, or also be a Combobox */}
            <select
              id="event-type-filter"
              value={selectedEventType || ""}
              onChange={(e) => onEventTypeChange(e.target.value || null)}
              className="w-full p-2 text-xs bg-slate-700 border border-slate-600 rounded-md text-slate-100 focus:ring-sky-500 focus:border-sky-500"
            >
              <option value="">All Event Types</option>
              {availableEventTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <BarChart data={barChartData} width={320} height={200} />
        </div>
        <div>
          <PieChart data={pieChartData} width={320} height={250} />
        </div>
        <div>
          <EventTypesPieChart
            data={eventTypesPieChartData}
            title={eventTypesPieChartTitle}
            width={320}
            height={250}
          />
        </div>
      </div>
    </div>
  );
};

export default React.memo(DashboardPanel);
