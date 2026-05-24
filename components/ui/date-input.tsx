"use client";

import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const DISPLAY_FORMAT = "dd/MM/yyyy";
const ISO_FORMAT = "yyyy-MM-dd";

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

function isoToDate(iso: string | undefined | null): Date | undefined {
  if (!iso) return undefined;
  const d = parse(iso, ISO_FORMAT, new Date());
  return isValid(d) ? d : undefined;
}

function dateToIso(d: Date): string {
  return format(d, ISO_FORMAT);
}

function isoToDisplay(iso: string | undefined | null): string {
  const d = isoToDate(iso);
  return d ? format(d, DISPLAY_FORMAT) : "";
}

function tryParseDisplay(text: string): Date | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const d = parse(trimmed, DISPLAY_FORMAT, new Date());
  return isValid(d) ? d : null;
}

/**
 * Drop-in replacement for `<Input type="date" />`.
 *
 * Behavior:
 * - Always displays dates in dd/MM/yyyy (locale-independent).
 * - User can either TYPE a date directly in the field, or pick from the calendar.
 * - Underlying value stays ISO yyyy-mm-dd so existing service/API contracts work.
 *
 * Built on `react-day-picker` (via shadcn Calendar) + `date-fns` — both already
 * installed.
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

    // Keep the displayed text in sync with the controlled value coming from
    // outside (e.g. form resets) — but only when the user isn't mid-edit.
    React.useEffect(() => {
      setText(isoToDisplay(value));
    }, [value]);

    const selected = isoToDate(value);
    const minDate = isoToDate(min);
    const maxDate = isoToDate(max);

    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setText(raw);
      // Only commit when the user has typed a fully valid dd/mm/yyyy.
      const d = tryParseDisplay(raw);
      if (!d) {
        if (raw.trim() === "" && value) onChange?.("");
        return;
      }
      if (minDate && d < minDate) return;
      if (maxDate && d > maxDate) return;
      onChange?.(dateToIso(d));
    };

    const handleBlur = () => {
      if (!text.trim()) {
        if (value) onChange?.("");
        return;
      }
      const d = tryParseDisplay(text);
      if (!d) {
        // Invalid input on blur — revert to last good value.
        setText(isoToDisplay(value));
        return;
      }
      setText(format(d, DISPLAY_FORMAT));
    };

    return (
      <div
        className={cn(
          "relative flex h-10 w-full items-center rounded-md border border-input bg-background ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          disabled && "cursor-not-allowed opacity-50",
          className,
        )}
      >
        <CalendarIcon className="pointer-events-none ml-3 h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          ref={ref}
          id={id}
          name={name}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          autoFocus={autoFocus}
          disabled={disabled}
          required={required}
          placeholder={placeholder ?? "dd/mm/yyyy"}
          value={text}
          onChange={handleTextChange}
          onBlur={handleBlur}
          className="h-full flex-1 min-w-0 bg-transparent px-2 text-sm placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed md:text-sm"
          {...aria}
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              aria-label="Open calendar"
              tabIndex={-1}
              className="mr-0.5 h-8 w-8 shrink-0 p-0 text-muted-foreground hover:text-foreground"
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
                onChange?.(dateToIso(d));
                setText(format(d, DISPLAY_FORMAT));
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
