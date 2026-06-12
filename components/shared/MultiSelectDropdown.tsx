"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  value: number;
  label: string;
  sublabel?: string;
}

interface MultiSelectDropdownProps {
  options: MultiSelectOption[];
  selected: number[];
  onChange: (ids: number[]) => void;
  placeholder?: string;
  emptyMessage?: string;
}

function MultiSelectDropdown({
  options,
  selected,
  onChange,
  placeholder = "Select…",
  emptyMessage = "No options available.",
}: MultiSelectDropdownProps) {
  const [open, setOpen] = React.useState(false);

  function toggle(value: number) {
    onChange(
      selected.includes(value)
        ? selected.filter((id) => id !== value)
        : [...selected, value],
    );
  }

  function removeSelected(value: number, e: React.MouseEvent) {
    e.stopPropagation();
    onChange(selected.filter((id) => id !== value));
  }

  const selectedOptions = options.filter((o) => selected.includes(o.value));

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            <span className="truncate text-sm text-muted-foreground">
              {selected.length === 0
                ? placeholder
                : `${selected.length} selected`}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full min-w-[320px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search…" />
            <CommandList>
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => {
                  const isSelected = selected.includes(option.value);
                  return (
                    <CommandItem
                      key={option.value}
                      value={option.sublabel ? `${option.label} ${option.sublabel}` : option.label}
                      onSelect={() => toggle(option.value)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          isSelected ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{option.label}</div>
                        {option.sublabel ? (
                          <div className="text-xs text-muted-foreground">
                            {option.sublabel}
                          </div>
                        ) : null}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedOptions.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {selectedOptions.map((option) => (
            <Badge key={option.value} variant="secondary" className="gap-1 pr-1">
              <span className="max-w-[180px] truncate text-xs">{option.label}</span>
              <button
                type="button"
                aria-label={`Remove ${option.label}`}
                className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onClick={(e) => removeSelected(option.value, e)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
