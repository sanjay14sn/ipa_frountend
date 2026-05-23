"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface DateInputProps {
  /** ISO date string (yyyy-mm-dd) — matches native input[type=date] value semantics. */
  value?: string;
  /** Called with an ISO date string (yyyy-mm-dd) or "" when cleared. */
  onChange?: (value: string) => void;
  /** ISO yyyy-mm-dd lower bound (inclusive). */
  min?: string;
  /** ISO yyyy-mm-dd upper bound (inclusive). */
  max?: string;
  id?: string;
  name?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

const DISPLAY_PLACEHOLDER = "dd/mm/yyyy";

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function isoToDisplay(iso: string | undefined | null): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return "";
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function displayToIso(display: string): string | null {
  const trimmed = display.trim();
  if (!trimmed) return "";
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  const d = new Date(year, month - 1, day);
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day
  ) {
    return null;
  }
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function isoToDate(iso: string | undefined | null): Date | undefined {
  if (!iso) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return undefined;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? undefined : d;
}

function dateToIso(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * Drop-in replacement for `<Input type="date" />` that displays as dd/mm/yyyy
 * regardless of browser locale. Underlying value remains yyyy-mm-dd so existing
 * service/API contracts are preserved.
 */
const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  (
    {
      value,
      onChange,
      min,
      max,
      id,
      name,
      disabled,
      required,
      placeholder,
      className,
      autoFocus,
      ...aria
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);
    const [text, setText] = React.useState<string>(() => isoToDisplay(value));

    React.useEffect(() => {
      setText(isoToDisplay(value));
    }, [value]);

    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setText(raw);
      const iso = displayToIso(raw);
      if (iso === null) return;
      if (iso === "") {
        onChange?.("");
        return;
      }
      if (min && iso < min) return;
      if (max && iso > max) return;
      onChange?.(iso);
    };

    const handleBlur = () => {
      if (!text.trim()) {
        if (value) onChange?.("");
        return;
      }
      const iso = displayToIso(text);
      if (iso === null || iso === "") {
        setText(isoToDisplay(value));
        return;
      }
      setText(isoToDisplay(iso));
    };

    const selected = isoToDate(value);
    const minDate = isoToDate(min);
    const maxDate = isoToDate(max);

    return (
      <div className={cn("relative w-full", className)}>
        <Input
          ref={ref}
          id={id}
          name={name}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          autoFocus={autoFocus}
          disabled={disabled}
          required={required}
          placeholder={placeholder ?? DISPLAY_PLACEHOLDER}
          value={text}
          onChange={handleTextChange}
          onBlur={handleBlur}
          className="pr-10"
          {...aria}
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled}
              aria-label="Open date picker"
              tabIndex={-1}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={selected}
              defaultMonth={selected ?? maxDate ?? minDate}
              disabled={
                minDate || maxDate
                  ? (d: Date) => {
                      if (minDate && d < minDate) return true;
                      if (maxDate && d > maxDate) return true;
                      return false;
                    }
                  : undefined
              }
              onSelect={(d: Date | undefined) => {
                if (!d) return;
                const iso = dateToIso(d);
                onChange?.(iso);
                setText(isoToDisplay(iso));
                setOpen(false);
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    );
  },
);
DateInput.displayName = "DateInput";

export { DateInput };
