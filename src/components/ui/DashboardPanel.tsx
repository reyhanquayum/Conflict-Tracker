import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import BarChart from "@/components/charts/BarChart";
import PieChart from "@/components/charts/PieChart";
import EventTypesPieChart from "@/components/charts/EventTypesPieChart";
import { Combobox } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import BrowseGroupsModal from "@/components/ui/BrowseGroupsModal";
import { HelpCircle } from "lucide-react"; 
import type {
  EventData,
  OverallSummaryData,
  EventTypeCount,
} from "@/types";

interface DashboardPanelProps {
  totalFilteredEvents?: number;
  currentYearRange?: { start: number; end: number };
  detailedEventsData: EventData[] | null;
  overallSummaryData: OverallSummaryData | null;
  isClusterSelected: boolean;
  availableGroups: string[];
  selectedGroup: string | null;
  onGroupChange: (group: string | null) => void;
  availableEventTypes: string[];
  selectedEventType: string | null;
  onEventTypeChange: (eventType: string | null) => void;
  onShowHelp: () => void; 
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
  onShowHelp,
}) => {
  const [groupSearchInput, setGroupSearchInput] = useState("");
  const [comboboxGroupOptions, setComboboxGroupOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [isSearchingGroups, setIsSearchingGroups] = useState(false);
  const groupSearchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const [isBrowseGroupsModalOpen, setIsBrowseGroupsModalOpen] = useState(false);

  const [eventTypeSearchTerm, setEventTypeSearchTerm] = useState("");
  const eventTypeOptionsForCombobox = useMemo(
    () => [
      { value: "__ALL_EVENT_TYPES__", label: "All Event Types" },
      ...availableEventTypes.map((type) => ({ value: type, label: type })),
    ],
    [availableEventTypes]
  );

  const fetchSearchedGroups = useCallback(
    (searchTerm: string) => {
      if (!currentYearRange) return;

      setIsSearchingGroups(true);
      const { start, end } = currentYearRange;
      let apiBase = "";
      if (process.env.NODE_ENV !== "production") {
        apiBase = "http://localhost:3001";
      }
      const searchUrl = `${apiBase}/api/search_groups?term=${encodeURIComponent(
        searchTerm
      )}&startYear=${start}&endYear=${end}&limit=50`;

      fetch(searchUrl)
        .then((res) => {
          if (!res.ok)
            throw new Error("Network response for search_groups not ok");
          return res.json();
        })
        .then((data: string[]) => {
          const newOptions = data.map((group) => ({
            value: group,
            label: group,
          }));
          if (newOptions.length > 0 || selectedGroup) {
            setComboboxGroupOptions([
              { value: "__ALL_GROUPS__", label: "All Groups" },
              ...newOptions,
            ]);
          } else {
            setComboboxGroupOptions([]);
          }
        })
        .catch((error) => {
          console.error("Error searching groups:", error);
          setComboboxGroupOptions([]);
        })
        .finally(() => setIsSearchingGroups(false));
    },
    [currentYearRange, selectedGroup]
  );

  useEffect(() => {
    if (groupSearchDebounceRef.current)
      clearTimeout(groupSearchDebounceRef.current);
    const trimmedSearch = groupSearchInput.trim();

    if (trimmedSearch === "" && !selectedGroup) {
      setComboboxGroupOptions([
        { value: "__ALL_GROUPS__", label: "All Groups" },
      ]);
      setIsSearchingGroups(false);
      return;
    }
    if (trimmedSearch.length >= 2) {
      groupSearchDebounceRef.current = setTimeout(
        () => fetchSearchedGroups(trimmedSearch),
        500
      );
    } else if (trimmedSearch.length > 0 && trimmedSearch.length < 2) {
      setComboboxGroupOptions([
        { value: "__ALL_GROUPS__", label: "All Groups" },
      ]);
      setIsSearchingGroups(false);
    } else if (trimmedSearch === "" && selectedGroup) {
      fetchSearchedGroups(selectedGroup);
    }
    return () => {
      if (groupSearchDebounceRef.current)
        clearTimeout(groupSearchDebounceRef.current);
    };
  }, [groupSearchInput, fetchSearchedGroups, selectedGroup]);

  useEffect(() => {
    if (selectedGroup && groupSearchInput.trim() === "") {
      const isSelectedInOptions = comboboxGroupOptions.some(
        (opt) => opt.value === selectedGroup
      );
      if (!isSelectedInOptions) fetchSearchedGroups(selectedGroup);
    } else if (!selectedGroup && groupSearchInput.trim() === "") {
      setComboboxGroupOptions([
        { value: "__ALL_GROUPS__", label: "All Groups" },
      ]);
    }
  }, [selectedGroup, groupSearchInput, fetchSearchedGroups]);

  const barChartData = useMemo(() => {
    return isClusterSelected
      ? detailedEventsData || []
      : overallSummaryData
      ? overallSummaryData.byYear
      : [];
  }, [isClusterSelected, detailedEventsData, overallSummaryData]);

  const pieChartData = useMemo(() => {
    return isClusterSelected
      ? detailedEventsData || []
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

  return (
    <>
      <div className="max-w-sm bg-zinc-900 text-zinc-100 p-3 border border-zinc-700/50 border-t-2 border-t-amber-600/60 rounded overflow-y-auto h-[calc(100vh-5rem)] flex flex-col">
        <div className="flex justify-between items-center mb-3 border-b border-zinc-700/30 pb-2 shrink-0">
          <h3 className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest">
            Dashboard
          </h3>
          <button
            onClick={onShowHelp}
            className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 rounded-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
            aria-label="Show help"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 text-xs flex-grow overflow-y-auto pr-1">
          {currentYearRange && (
            <p>
              <span className="text-zinc-500 text-[10px] uppercase tracking-wider">Years</span>{" "}
              <span className="text-zinc-200 tabular-nums">{currentYearRange.start} - {currentYearRange.end}</span>
            </p>
          )}
          {totalFilteredEvents !== undefined && (
            <p>
              <span className="text-zinc-500 text-[10px] uppercase tracking-wider">Events</span>{" "}
              <span className="text-zinc-200 tabular-nums">{totalFilteredEvents.toLocaleString()}</span>
            </p>
          )}
          <div className="space-y-3 pt-2">
            <div>
              <label
                htmlFor="group-combobox"
                className="block text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1"
              >
                Filter by Group
              </label>
              <Combobox
                options={
                  comboboxGroupOptions.length > 0
                    ? comboboxGroupOptions
                    : [{ value: "__ALL_GROUPS__", label: "All Groups" }]
                }
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
                emptyText={
                  isSearchingGroups
                    ? "Searching..."
                    : "No group found. Type to search."
                }
                triggerClassName="bg-zinc-800 border-zinc-700/50 text-zinc-200 hover:bg-zinc-700 focus:ring-amber-500 focus:border-amber-500"
                contentClassName="bg-zinc-800 border-zinc-700/50 text-zinc-200"
                isLoading={isSearchingGroups}
                inputValue={groupSearchInput}
                onInputChange={setGroupSearchInput}
                displayValueLabel={selectedGroup || undefined}
                onOpen={() => {
                  if (
                    groupSearchInput.trim() === "" &&
                    !selectedGroup &&
                    comboboxGroupOptions.length <= 1
                  ) {
                    fetchSearchedGroups("");
                  }
                }}
              />
              <Button
                variant="link"
                className="text-[10px] text-amber-500 hover:text-amber-400 p-0 h-auto mt-1"
                onClick={() => setIsBrowseGroupsModalOpen(true)}
              >
                Browse all groups...
              </Button>
            </div>
            <div>
              <label
                htmlFor="event-type-combobox"
                className="block text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1"
              >
                Filter by Event Type
              </label>
              <Combobox
                options={eventTypeOptionsForCombobox}
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
                triggerClassName="bg-zinc-800 border-zinc-700/50 text-zinc-200 hover:bg-zinc-700 focus:ring-amber-500 focus:border-amber-500"
                contentClassName="bg-zinc-800 border-zinc-700/50 text-zinc-200"
                inputValue={eventTypeSearchTerm}
                onInputChange={setEventTypeSearchTerm}
                displayValueLabel={selectedEventType || undefined}
              />
            </div>
          </div>
          <div>
            <BarChart data={barChartData} width={320} height={200} />
          </div>
          {!selectedGroup && (
            <div>
              <PieChart data={pieChartData} width={320} height={250} />
            </div>
          )}
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
          onGroupChange(groupName);
          setGroupSearchInput(groupName);
          setIsBrowseGroupsModalOpen(false);
        }}
        allGroups={availableGroups}
        currentYearRange={currentYearRange}
      />
    </>
  );
};

export default React.memo(DashboardPanel);
