"use client";

import { Check, ChevronsUpDown, MapPin, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useWorkspace } from '@/contexts/workspace-context';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export function LocationSwitcher() {
  const { selectedLocation, locations, setSelectedLocation } = useWorkspace();
  const [open, setOpen] = useState(false);

  const displayValue = selectedLocation
    ? selectedLocation.name
    : locations.length > 0
    ? 'All Locations'
    : 'No Locations';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Select a location"
          className="w-[240px] justify-between"
        >
          <div className="flex items-center gap-2">
            {selectedLocation ? (
              <MapPin className="h-4 w-4" />
            ) : (
              <Building2 className="h-4 w-4" />
            )}
            <span className="truncate">{displayValue}</span>
          </div>
          <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0">
        <Command>
          <CommandInput placeholder="Search locations..." />
          <CommandList>
            <CommandEmpty>No locations found.</CommandEmpty>
            <CommandGroup heading="View Options">
              <CommandItem
                onSelect={() => {
                  setSelectedLocation(null);
                  setOpen(false);
                }}
                className="cursor-pointer"
              >
                <Building2 className={cn(
                  "mr-2 h-4 w-4",
                  !selectedLocation ? "opacity-100" : "opacity-40"
                )} />
                <span>All Locations</span>
                {!selectedLocation && (
                  <Check className="ml-auto h-4 w-4" />
                )}
              </CommandItem>
            </CommandGroup>
            {locations.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Locations">
                  {locations.map((location) => (
                    <CommandItem
                      key={location.id}
                      onSelect={() => {
                        setSelectedLocation(location);
                        setOpen(false);
                      }}
                      className="cursor-pointer"
                    >
                      <MapPin className={cn(
                        "mr-2 h-4 w-4",
                        selectedLocation?.id === location.id ? "opacity-100" : "opacity-40"
                      )} />
                      <div className="flex flex-col">
                        <span className="truncate">{location.name}</span>
                        {location.address && (
                          <span className="text-xs text-muted-foreground truncate">
                            {location.address}
                          </span>
                        )}
                      </div>
                      {selectedLocation?.id === location.id && (
                        <Check className="ml-auto h-4 w-4" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
