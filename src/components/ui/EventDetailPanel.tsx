import React from 'react';
import type { EventData } from '@/components/visualization/GlobeDisplay'; // Assuming EventData is exported

interface EventDetailPanelProps {
  event: EventData | null;
  onClose: () => void; // Callback to close the panel (set selected event to null)
}

const EventDetailPanel: React.FC<EventDetailPanelProps> = ({ event, onClose }) => {
  if (!event) {
    return null; // Don't render anything if no event is selected
  }

  return (
    // Changed background to slate-900
    <div className="absolute top-4 right-4 h-auto max-h-[calc(100vh-2rem)] w-1/3 max-w-md bg-slate-900 text-slate-100 p-6 shadow-lg overflow-y-auto transition-transform transform-gpu z-20 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-slate-100">Event Details</h3> {/* Title text to slate-100 */}
        <button 
          onClick={onClose} 
          className="text-slate-400 hover:text-slate-100 transition-colors" /* Hover to lighter slate */
          aria-label="Close panel"
        >
          {/* Using a simple X for now, can be replaced with an icon */}
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="space-y-3 text-sm">
        <p><strong className="font-medium text-slate-300">ID:</strong> {event.id}</p>
        <p><strong className="font-medium text-slate-300">Date:</strong> {event.date}</p>
        <p><strong className="font-medium text-slate-300">Group:</strong> {event.group}</p>
        <p><strong className="font-medium text-slate-300">Type:</strong> {event.type}</p>
        {event.description && (
          <div>
            <strong className="font-medium text-slate-300">Description:</strong>
            <p className="mt-1 text-slate-300 whitespace-pre-wrap break-words bg-slate-800 p-2 rounded"> {/* Darker bg for description box */}
              {event.description}
            </p>
          </div>
        )}
        {/* Add more details as needed */}
      </div>
    </div>
  );
};

export default EventDetailPanel;
