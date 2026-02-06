import React from 'react';
import type { EventData, ClusterData } from '@/types';
import ExpandableText from './ExpandableText';

interface EventDetailPanelProps {
  cluster: ClusterData | null; // the selected cluster
  events: EventData[] | null;  // list of events within that cluster
  isLoading: boolean;
  onClose: () => void;
}

const EventDetailPanel: React.FC<EventDetailPanelProps> = ({ cluster, events, isLoading, onClose }) => {


  if (!cluster) {
    return null;
  }

  return (
    <div className="absolute top-4 right-4 h-[calc(100vh-5rem)] w-1/3 max-w-sm bg-zinc-900 text-zinc-100 p-4 border border-zinc-700/50 border-t-2 border-t-amber-600/60 overflow-y-auto transition-transform transform-gpu z-20 rounded flex flex-col">
      <div className="flex justify-between items-center mb-3 border-b border-zinc-700/30 pb-2 shrink-0">
        <h3 className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest">
          Cluster Details <span className="text-zinc-200 tabular-nums">({events ? events.length : cluster.count})</span>
        </h3>
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-zinc-300 transition-colors"
          aria-label="Close panel"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {isLoading && <p className="text-zinc-500 py-4 text-center text-xs">Loading events...</p>}

      {!isLoading && events && events.length > 0 && (
        <div className="space-y-1 text-xs overflow-y-auto flex-grow pr-1">
          {events.map(event => (
            <div key={event.id} className="p-2 border-b border-zinc-700/20 last:border-b-0">
              <p><span className="text-zinc-500">ID</span> <span className="text-zinc-300">{event.id}</span></p>
              <p><span className="text-zinc-500">Date</span> <span className="text-zinc-300">{event.date}</span></p>
              <p><span className="text-zinc-500">Group</span> <span className="text-zinc-300">{event.group}</span></p>
              <p><span className="text-zinc-500">Type</span> <span className="text-zinc-300">{event.type}</span></p>
              {event.description && (
                <ExpandableText text={event.description} maxLength={100} />
              )}
            </div>
          ))}
        </div>
      )}

      {!isLoading && events && events.length === 0 && (
        <p className="text-zinc-500 text-xs">No individual events found in this cluster for the selected date range.</p>
      )}
    </div>
  );
};

export default EventDetailPanel;
