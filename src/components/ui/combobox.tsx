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
  displayValueLabel?: string; 
  onOpen?: () => void;
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
  displayValueLabel,
  onOpen
}, ref) => {
  const [open, setOpen] = React.useState(false);

  let triggerText = placeholder;
  if (value && displayValueLabel) {
    triggerText = displayValueLabel;
  } else if (value) {
    const selectedOptFromCurrentOptions = options.find((option) => option.value.toLowerCase() === value.toLowerCase());
    if (selectedOptFromCurrentOptions) {
      triggerText = selectedOptFromCurrentOptions.label;
    } else {
      triggerText = value; 
    }
  }

  return (
    <Popover 
      open={open} 
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (isOpen && onOpen) {
          onOpen();
        }
      }}
    >
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
          className="bg-zinc-800 text-zinc-200 rounded-sm"
          // Optional: If Command should not filter internally because options are already filtered by server
          // filter={(value, search) => options.find(opt => opt.value.toLowerCase() === value.toLowerCase()) ? 1 : 0} 
        >
          <CommandInput
            value={inputValue}
            onValueChange={onInputChange} // Use this to update inputValue in parent
            placeholder={searchPlaceholder}
            className="h-8 text-xs bg-zinc-800 border-zinc-700 placeholder-zinc-500 focus:ring-amber-500 focus:border-amber-500 rounded-t-sm"
          />
          <CommandList className="max-h-[200px] overflow-y-auto">
            {isLoading ? (
              <div className="p-2 text-center text-xs text-zinc-500">Loading...</div>
            ) : (
              <>
                <CommandEmpty className="py-4 text-center text-xs">{emptyText}</CommandEmpty>
                {open && (
                  <CommandGroup>
                    {options.map((option) => (
                      <CommandItem
                        key={option.value}
                        value={option.value}
                        onSelect={(currentValue) => {

                          onChange(currentValue === value ? null : currentValue);
                          setOpen(false);
                        }}
                        className="text-xs text-zinc-200 hover:bg-zinc-700 aria-selected:bg-amber-600 aria-selected:text-zinc-950"
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
