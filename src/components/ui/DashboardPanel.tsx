import React, { useMemo, useState, useEffect, useCallback, useRef } from "react"; 
import BarChart from "@/components/charts/BarChart";
import PieChart from "@/components/charts/PieChart";
import EventTypesPieChart from "@/components/charts/EventTypesPieChart";
import { Combobox } from "@/components/ui/combobox"; 
import { Button } from "@/components/ui/button"; 
import BrowseGroupsModal from "@/components/ui/BrowseGroupsModal"; // Import the new modal
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
  // State for Group Combobox
  const [groupSearchInput, setGroupSearchInput] = useState(""); 
  const [comboboxGroupOptions, setComboboxGroupOptions] = useState<{ value: string; label: string; }[]>([]);
  const [isSearchingGroups, setIsSearchingGroups] = useState(false);
  const groupSearchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const [isBrowseGroupsModalOpen, setIsBrowseGroupsModalOpen] = useState(false); // State for new modal

  // State for Event Type Combobox (client-side search)
  const [eventTypeSearchTerm, setEventTypeSearchTerm] = useState(""); 
  const eventTypeOptionsForCombobox = useMemo(() => ([
    { value: "__ALL_EVENT_TYPES__", label: "All Event Types" },
    ...availableEventTypes.map(type => ({ value: type, label: type }))
  ]), [availableEventTypes]);


  // Debounced function to fetch groups from API
  const fetchSearchedGroups = useCallback((searchTerm: string) => {
    if (!currentYearRange) return; 

    setIsSearchingGroups(true);
    const { start, end } = currentYearRange;
    let apiBase = "";
    if (process.env.NODE_ENV !== 'production') {
      apiBase = "http://localhost:3001";
    }
    const searchUrl = `${apiBase}/api/search_groups?term=${encodeURIComponent(searchTerm)}&startYear=${start}&endYear=${end}&limit=50`;
    
    fetch(searchUrl)
      .then(res => {
        if (!res.ok) throw new Error('Network response for search_groups not ok');
        return res.json();
      })
      .then((data: string[]) => {
        const newOptions = data.map(group => ({ value: group, label: group }));
        // Always ensure "All Groups" is an option if results are shown,
        // or if a specific group is being shown (e.g. after selection and search clear)
        if (newOptions.length > 0 || selectedGroup) {
          setComboboxGroupOptions([{ value: "__ALL_GROUPS__", label: "All Groups" }, ...newOptions]);
        } else {
          setComboboxGroupOptions([]);
        }
      })
      .catch(error => {
        console.error("Error searching groups:", error);
        setComboboxGroupOptions([]); 
      })
      .finally(() => setIsSearchingGroups(false));
  }, [currentYearRange, selectedGroup]); // Added selectedGroup

  // Effect for group search input
  useEffect(() => {
    if (groupSearchDebounceRef.current) clearTimeout(groupSearchDebounceRef.current);
    const trimmedSearch = groupSearchInput.trim();

    if (trimmedSearch === "" && !selectedGroup) {
      setComboboxGroupOptions([{ value: "__ALL_GROUPS__", label: "All Groups" }]); // Show "All Groups" if search empty & no selection
      setIsSearchingGroups(false);
      return;
    }
    if (trimmedSearch.length >= 2) {
      groupSearchDebounceRef.current = setTimeout(() => fetchSearchedGroups(trimmedSearch), 500);
    } else if (trimmedSearch.length > 0 && trimmedSearch.length < 2) {
      setComboboxGroupOptions([{ value: "__ALL_GROUPS__", label: "All Groups" }]);
      setIsSearchingGroups(false);
    } else if (trimmedSearch === "" && selectedGroup) { // Search cleared but a group is selected
        fetchSearchedGroups(selectedGroup); // Re-fetch to show selected group + "All Groups"
    }
    return () => { if (groupSearchDebounceRef.current) clearTimeout(groupSearchDebounceRef.current); };
  }, [groupSearchInput, fetchSearchedGroups, selectedGroup]);

  // Effect for selected group (external changes)
  useEffect(() => {
    if (selectedGroup && groupSearchInput.trim() === "") {
      // If a group is selected and search is empty, ensure options list includes it and "All Groups"
      // fetchSearchedGroups will handle adding "All Groups" and the selected group if found
      const isSelectedInOptions = comboboxGroupOptions.some(opt => opt.value === selectedGroup);
      if (!isSelectedInOptions) fetchSearchedGroups(selectedGroup);
    } else if (!selectedGroup && groupSearchInput.trim() === "") {
      // If no group selected and search is empty, show "All Groups"
      setComboboxGroupOptions([{ value: "__ALL_GROUPS__", label: "All Groups" }]);
    }
  }, [selectedGroup, groupSearchInput, fetchSearchedGroups]); // REMOVED comboboxGroupOptions from dependency array

  // No special effects needed for event type combobox options if it's always populated by availableEventTypes
  // and uses client-side search.

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
    <> {/* Fragment to hold main panel and modal */}
    <div className="w-auto max-w-sm bg-slate-900 text-slate-100 p-4 shadow-lg rounded-lg overflow-y-auto max-h-[calc(100vh-2rem)]">
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
              htmlFor="group-combobox" // ID of the trigger button for the Combobox
              className="block text-xs font-medium text-slate-300 mb-1"
            >
              Filter by Group:
            </label>
            <Combobox
              options={comboboxGroupOptions.length > 0 ? comboboxGroupOptions : [{ value: "__ALL_GROUPS__", label: "All Groups" }]}
              value={selectedGroup || undefined} 
              onChange={(value) => {
                if (value === "__ALL_GROUPS__") {
                  onGroupChange(null);
                  setGroupSearchInput(""); 
                } else {
                  onGroupChange(value);
                  setGroupSearchInput(value || ""); 
                }
              }}
              placeholder="Select group..."
              searchPlaceholder="Search groups..."
              emptyText={isSearchingGroups ? "Searching..." : "No group found. Type to search."}
              triggerClassName="bg-slate-700 border-slate-600 text-slate-100 hover:bg-slate-600 focus:ring-sky-500 focus:border-sky-500"
              contentClassName="bg-slate-800 border-slate-700 text-slate-100"
              isLoading={isSearchingGroups}
              inputValue={groupSearchInput}
              onInputChange={setGroupSearchInput}
              displayValueLabel={selectedGroup || undefined} 
              onOpen={() => {
                if (groupSearchInput.trim() === "" && !selectedGroup && comboboxGroupOptions.length <= 1) {
                  fetchSearchedGroups(""); 
                }
              }}
            />
            <Button 
              variant="link" 
              className="text-xs text-sky-400 hover:text-sky-300 p-0 h-auto mt-1"
              onClick={() => setIsBrowseGroupsModalOpen(true)}
            >
              Browse all groups...
            </Button>
          </div>
          <div>
            <label
              htmlFor="event-type-combobox"
              className="block text-xs font-medium text-slate-300 mb-1"
            >
              Filter by Event Type:
            </label>
            <Combobox
              options={eventTypeOptionsForCombobox} // Already includes "All Event Types"
              value={selectedEventType || undefined}
              onChange={(value) => {
                if (value === "__ALL_EVENT_TYPES__") {
                  onEventTypeChange(null);
                  setEventTypeSearchTerm("");
                } else {
                  onEventTypeChange(value);
                  setEventTypeSearchTerm(value || ""); 
                }
              }}
              placeholder="Select event type..."
              searchPlaceholder="Search event types..." 
              emptyText="No event type found."
              triggerClassName="bg-slate-700 border-slate-600 text-slate-100 hover:bg-slate-600 focus:ring-sky-500 focus:border-sky-500"
              contentClassName="bg-slate-800 border-slate-700 text-slate-100"
              inputValue={eventTypeSearchTerm}
              onInputChange={setEventTypeSearchTerm}
              displayValueLabel={selectedEventType || undefined} // Use selectedEventType directly as its own label
              // isLoading is not needed for client-side search
            />
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
    <BrowseGroupsModal
      isOpen={isBrowseGroupsModalOpen}
      onClose={() => setIsBrowseGroupsModalOpen(false)}
      onGroupSelect={(groupName) => {
        onGroupChange(groupName); // Update App state
        setGroupSearchInput(groupName); // Update local search input to reflect selection
        setIsBrowseGroupsModalOpen(false); // Close modal
      }}
      allGroups={availableGroups} // Pass all available groups for the current year range
      currentYearRange={currentYearRange}
    />
    </>
  );
};

export default React.memo(DashboardPanel);
