import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"; // Assuming Dialog is already added via shadcn/ui
import { Button } from "@/components/ui/button"; // Assuming Button is already added

interface BrowseGroupsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupSelect: (groupName: string) => void;
  allGroups: string[]; // This will be `availableGroups` from App.tsx
  currentYearRange?: { start: number; end: number };
}

const BrowseGroupsModal: React.FC<BrowseGroupsModalProps> = ({
  isOpen,
  onClose,
  onGroupSelect,
  allGroups,
  currentYearRange,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredGroups = useMemo(() => {
    if (!searchTerm) {
      return allGroups;
    }
    return allGroups.filter(group =>
      group.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allGroups, searchTerm]);

  const handleSelectAndClose = (groupName: string) => {
    onGroupSelect(groupName);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="bg-slate-800 text-slate-100 border-slate-700 sm:max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Browse All Groups 
            {currentYearRange && ` (${currentYearRange.start} - ${currentYearRange.end})`}
          </DialogTitle>
          <DialogDescription className="text-slate-400 pt-1">
            Select a group to apply it as a filter.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-2">
          <input
            type="text"
            placeholder={`Search ${allGroups.length} groups...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 text-sm bg-slate-700 border border-slate-600 rounded-md text-slate-100 focus:ring-sky-500 focus:border-sky-500"
          />
        </div>

        <div className="flex-grow overflow-y-auto pr-2 space-y-1"> {/* Scrollable list area */}
          {filteredGroups.length > 0 ? (
            filteredGroups.map(group => (
              <Button
                key={group}
                variant="ghost"
                className="w-full justify-start text-left text-sm text-slate-200 hover:bg-slate-700 hover:text-sky-400 h-auto py-1.5 px-2"
                onClick={() => handleSelectAndClose(group)}
              >
                {group}
              </Button>
            ))
          ) : (
            <p className="text-sm text-slate-400 text-center py-4">No groups match your search.</p>
          )}
        </div>

        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline" className="bg-slate-700 hover:bg-slate-600 border-slate-600">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BrowseGroupsModal;
