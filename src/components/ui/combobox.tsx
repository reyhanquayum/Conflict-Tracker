"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover" 

interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value?: string; // current selected value
  onChange: (value: string | null) => void; // to set the selected value
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  triggerClassName?: string;
  contentClassName?: string;
  isLoading?: boolean; 
  inputValue: string; 
  onInputChange: (inputValue: string) => void; 
  displayValueLabel?: string; // Optional: Explicit label for the trigger when a value is selected
}

const Combobox = React.forwardRef<
  React.ElementRef<typeof PopoverTrigger>,
  ComboboxProps
>(({ 
  options, 
  value, 
  onChange, 
  placeholder = "Select option...", 
  searchPlaceholder = "Search...",
  emptyText = "No option found.",
  triggerClassName,
  contentClassName,
  isLoading = false,
  inputValue,
  onInputChange,
  displayValueLabel
}, ref) => {
  const [open, setOpen] = React.useState(false);

  // Determine text for the trigger button
  let triggerText = placeholder;
  if (value && displayValueLabel) { // If a value is selected and a specific label for it is provided
    triggerText = displayValueLabel;
  } else if (value) { // Fallback if displayValueLabel not provided, try to find in current options
    const selectedOptFromCurrentOptions = options.find((option) => option.value.toLowerCase() === value.toLowerCase());
    if (selectedOptFromCurrentOptions) {
      triggerText = selectedOptFromCurrentOptions.label;
    } else {
      // If value is set but not in current options and no displayValueLabel,
      // it might show the raw value or placeholder. This case should ideally be handled by parent providing displayValueLabel.
      triggerText = value; // Or fallback to placeholder if value itself isn't display-friendly
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild ref={ref}>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between text-xs", triggerClassName)}
        >
          {triggerText}
          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("w-[--radix-popover-trigger-width] p-0", contentClassName)} align="start">
        <Command 
          className="bg-slate-800 text-slate-100 rounded-md"
          // Optional: If Command should not filter internally because options are already filtered by server
          // filter={(value, search) => options.find(opt => opt.value.toLowerCase() === value.toLowerCase()) ? 1 : 0} 
        >
          <CommandInput
            value={inputValue}
            onValueChange={onInputChange} // Use this to update inputValue in parent
            placeholder={searchPlaceholder}
            className="h-8 text-xs bg-slate-800 border-slate-700 placeholder-slate-400 focus:ring-sky-500 focus:border-sky-500 rounded-t-md" // Match Command bg, adjust border, ensure rounding fits
          />
          <CommandList className="max-h-[200px] overflow-y-auto">
            {isLoading ? (
              <div className="p-2 text-center text-xs text-slate-400">Loading...</div>
            ) : (
              <>
                <CommandEmpty className="py-4 text-center text-xs">{emptyText}</CommandEmpty>
                {open && ( // Still useful to defer rendering if options list can be large initially
                  <CommandGroup>
                    {options.map((option) => (
                      <CommandItem
                        key={option.value}
                        value={option.value} // This value is used by Command for its internal state/filtering if not overridden
                        onSelect={(currentValue) => { // currentValue is option.value
                          // onChange expects the original cased value, or null
                          onChange(currentValue === value ? null : currentValue);
                          setOpen(false);
                        }}
                        className="text-xs text-slate-100 hover:bg-slate-700 aria-selected:bg-sky-600 aria-selected:text-white"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-3 w-3",
                            value?.toLowerCase() === option.value.toLowerCase() ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {option.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
})
Combobox.displayName = "Combobox"

export { Combobox }
