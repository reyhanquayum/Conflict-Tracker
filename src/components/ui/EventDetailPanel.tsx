import React from 'react';
import type { EventData, ClusterData } from '@/types';

interface EventDetailPanelProps {
  cluster: ClusterData | null; // The selected cluster
  events: EventData[] | null;  // List of events within that cluster
  isLoading: boolean;
  onClose: () => void;
}

const EventDetailPanel: React.FC<EventDetailPanelProps> = ({ cluster, events, isLoading, onClose }) => {
  // Panel is only shown if a cluster is selected (logic in App.tsx)
  // So, if this component renders, 'cluster' should not be null.
  // However, 'events' can be null initially while loading, or empty if no events.

  if (!cluster) { // Should not happen if App.tsx logic is correct, but as a safeguard
    return null;
  }

  return (
    <div className="absolute top-4 right-4 h-auto max-h-[calc(100vh-2rem)] w-1/3 max-w-md bg-slate-900 text-slate-100 p-6 shadow-lg overflow-y-auto transition-transform transform-gpu z-20 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-slate-100">
          Cluster Details ({cluster.count} events)
        </h3>
        <button 
          onClick={onClose} 
          className="text-slate-400 hover:text-slate-100 transition-colors"
          aria-label="Close panel"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {isLoading && <p className="text-slate-400">Loading events...</p>}

      {!isLoading && events && events.length > 0 && (
        <div className="space-y-2 text-xs overflow-y-auto max-h-[calc(100vh-12rem)]"> {/* Max height for list */}
          {events.map(event => (
            <div key={event.id} className="p-2 border-b border-slate-700 last:border-b-0">
              <p><strong className="text-slate-300">ID:</strong> {event.id}</p>
              <p><strong className="text-slate-300">Date:</strong> {event.date}</p>
              <p><strong className="text-slate-300">Group:</strong> {event.group}</p>
              <p><strong className="text-slate-300">Type:</strong> {event.type}</p>
              {event.description && (
                <p className="mt-1 text-slate-400 whitespace-pre-wrap break-words">
                  {event.description.substring(0, 100)}{event.description.length > 100 ? '...' : ''}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {!isLoading && events && events.length === 0 && (
        <p className="text-slate-400">No individual events found in this cluster for the selected date range.</p>
      )}
    </div>
  );
};

export default EventDetailPanel;
