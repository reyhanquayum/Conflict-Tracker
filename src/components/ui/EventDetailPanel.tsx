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
    <div className="absolute top-4 right-4 h-[calc(100vh-5rem)] w-1/3 max-w-sm bg-slate-900 text-slate-100 p-6 shadow-lg overflow-y-auto transition-transform transform-gpu z-20 rounded-lg flex flex-col">
      <div className="flex justify-between items-center mb-4 shrink-0"> 
        <h3 className="text-xl font-semibold text-slate-100">
          Cluster Details ({events ? events.length : cluster.count} events)
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
      
      {isLoading && <p className="text-slate-400 py-4 text-center">Loading events...</p>}

      {!isLoading && events && events.length > 0 && (
        <div className="space-y-2 text-xs overflow-y-auto flex-grow pr-1">
          {events.map(event => (
            <div key={event.id} className="p-2 border-b border-slate-700 last:border-b-0">
              <p><strong className="text-slate-300">ID:</strong> {event.id}</p> 
              <p><strong className="text-slate-300">Date:</strong> {event.date}</p>
              <p><strong className="text-slate-300">Group:</strong> {event.group}</p>
              <p><strong className="text-slate-300">Type:</strong> {event.type}</p>
              {event.description && (
                <ExpandableText text={event.description} maxLength={100} />
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
