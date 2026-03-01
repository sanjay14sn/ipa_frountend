"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import statesCities from "@/data/indian-states-cities.json";

type StatesCitiesType = Record<string, string[]>;

const STATE_ORDER = ["Tamil Nadu"];
const statesData = statesCities as StatesCitiesType;
const stateNames = [
  ...STATE_ORDER.filter((s) => s in statesData),
  ...Object.keys(statesData)
    .filter((s) => !STATE_ORDER.includes(s))
    .sort(),
];

function getStateForCity(city: string): string | null {
  for (const state of stateNames) {
    if (statesData[state]?.includes(city)) return state;
  }
  return null;
}

interface StateCitySelectProps {
  value: string;
  onChange: (city: string) => void;
  stateValue?: string;
  onStateChange?: (state: string) => void;
  label?: string;
  required?: boolean;
  error?: string;
  placeholder?: string;
  className?: string;
  id?: string;
}

export function StateCitySelect({
  value,
  onChange,
  stateValue,
  onStateChange,
  label = "City",
  required = false,
  error,
  placeholder = "Select state, then city",
  className = "",
  id = "city",
}: StateCitySelectProps) {
  const [state, setState] = useState<string>(stateValue ?? "");
  const [city, setCity] = useState<string>(value);

  useEffect(() => {
    setCity(value);
    if (value) {
      const foundState = getStateForCity(value);
      if (foundState) setState(foundState);
    } else if (stateValue !== undefined) {
      setState(stateValue);
    } else {
      setState("");
    }
  }, [value, stateValue]);

  const cities = state ? (statesData[state] ?? []) : [];

  const handleStateChange = (newState: string) => {
    setState(newState);
    setCity("");
    onChange("");
    onStateChange?.(newState);
  };

  const handleCityChange = (newCity: string) => {
    setCity(newCity);
    onChange(newCity);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label
            htmlFor={`${id}-state`}
            className="text-xs text-muted-foreground"
          >
            State
          </Label>
          <Select value={state} onValueChange={handleStateChange}>
            <SelectTrigger
              id={`${id}-state`}
              className={error ? "border-red-500" : ""}
            >
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent>
              {stateNames.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={id} className="text-xs text-muted-foreground">
            City
          </Label>
          <Select
            value={city}
            onValueChange={handleCityChange}
            disabled={!state}
          >
            <SelectTrigger id={id} className={error ? "border-red-500" : ""}>
              <SelectValue
                placeholder={state ? "Select city" : "Select state first"}
              />
            </SelectTrigger>
            <SelectContent>
              {cities.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {error && (
        <p className="text-red-500 text-sm flex items-center gap-1">{error}</p>
      )}
    </div>
  );
}
