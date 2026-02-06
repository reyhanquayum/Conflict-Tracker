import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface BrowseGroupsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupSelect: (groupName: string) => void;
  allGroups: string[];
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
      <DialogContent className="bg-zinc-900 text-zinc-100 border-zinc-700/50 sm:max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Browse All Groups 
            {currentYearRange && ` (${currentYearRange.start} - ${currentYearRange.end})`}
          </DialogTitle>
          <DialogDescription className="text-zinc-400 pt-1">
            Select a group to apply it as a filter.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-2">
          <input
            type="text"
            placeholder={`Search ${allGroups.length} groups...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 text-xs bg-zinc-800 border border-zinc-700/50 rounded-sm text-zinc-100 focus:ring-amber-500 focus:border-amber-500 placeholder-zinc-500"
          />
        </div>

        <div className="flex-grow overflow-y-auto pr-2 space-y-1">
          {filteredGroups.length > 0 ? (
            filteredGroups.map(group => (
              <Button
                key={group}
                variant="ghost"
                className="w-full justify-start text-left text-xs text-zinc-300 hover:bg-zinc-800 hover:text-amber-400 h-auto py-1.5 px-2"
                onClick={() => handleSelectAndClose(group)}
              >
                {group}
              </Button>
            ))
          ) : (
            <p className="text-xs text-zinc-500 text-center py-4">No groups match your search.</p>
          )}
        </div>

        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline" className="bg-zinc-800 hover:bg-zinc-700 border-zinc-700">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BrowseGroupsModal;
