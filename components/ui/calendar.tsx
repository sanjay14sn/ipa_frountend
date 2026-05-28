"use client";

import * as React from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export interface CalendarProps {
  mode?: "single";
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  defaultMonth?: Date;
  month?: Date;
  onMonthChange?: (month: Date) => void;
  startMonth?: Date;
  endMonth?: Date;
  disabled?: ((date: Date) => boolean) | Date[];
  showOutsideDays?: boolean;
  /** accepted but unused — popover handles focus */
  initialFocus?: boolean;
  className?: string;
}

function isDayDisabled(
  date: Date,
  disabled: CalendarProps["disabled"],
  startMonth?: Date,
  endMonth?: Date,
): boolean {
  if (startMonth && date < startMonth) return true;
  if (endMonth && date > endMonth) return true;
  if (!disabled) return false;
  if (typeof disabled === "function") return disabled(date);
  return disabled.some((d) => isSameDay(d, date));
}

function Calendar({
  selected,
  onSelect,
  defaultMonth,
  month: controlledMonth,
  onMonthChange,
  startMonth,
  endMonth,
  disabled,
  showOutsideDays = true,
  className,
}: CalendarProps) {
  const [internalMonth, setInternalMonth] = React.useState<Date>(
    controlledMonth ?? defaultMonth ?? selected ?? new Date(),
  );

  const displayMonth = controlledMonth ?? internalMonth;

  function navigate(next: Date) {
    setInternalMonth(next);
    onMonthChange?.(next);
  }

  const startYear = startMonth?.getFullYear() ?? 1950;
  const endYear = endMonth?.getFullYear() ?? 2100;

  const years = React.useMemo(
    () => Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i),
    [startYear, endYear],
  );

  const days = React.useMemo(() => {
    const monthStart = startOfMonth(displayMonth);
    const monthEnd = endOfMonth(displayMonth);
    return eachDayOfInterval({
      start: startOfWeek(monthStart),
      end: endOfWeek(monthEnd),
    });
  }, [displayMonth]);

  const weeks = React.useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) result.push(days.slice(i, i + 7));
    return result;
  }, [days]);

  const currentMonth = displayMonth.getMonth();
  const currentYear = displayMonth.getFullYear();

  const canGoPrev = !startMonth || subMonths(displayMonth, 1) >= startOfMonth(startMonth);
  const canGoNext = !endMonth || addMonths(displayMonth, 1) <= startOfMonth(endMonth);

  return (
    <div className={cn("p-3 select-none", className)}>
      {/* ── Header row ── */}
      <div className="relative mb-3 flex h-8 items-center justify-center">
        {/* Prev button */}
        <button
          type="button"
          onClick={() => navigate(subMonths(displayMonth, 1))}
          disabled={!canGoPrev}
          aria-label="Previous month"
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "absolute left-0 h-7 w-7 p-0 opacity-60 hover:opacity-100 disabled:opacity-25",
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Month + Year selects */}
        <div className="flex items-center gap-0.5">
          <Select
            value={String(currentMonth)}
            onValueChange={(v) => navigate(new Date(currentYear, Number(v)))}
          >
            <SelectTrigger className="h-7 w-[110px] border-0 bg-transparent px-2 text-sm font-semibold shadow-none focus:ring-0 focus:ring-offset-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_NAMES.map((name, i) => (
                <SelectItem key={name} value={String(i)}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={String(currentYear)}
            onValueChange={(v) => navigate(new Date(Number(v), currentMonth))}
          >
            <SelectTrigger className="h-7 w-[72px] border-0 bg-transparent px-2 text-sm font-semibold shadow-none focus:ring-0 focus:ring-offset-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-52">
              {years.map((year) => (
                <SelectItem key={year} value={String(year)}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Next button */}
        <button
          type="button"
          onClick={() => navigate(addMonths(displayMonth, 1))}
          disabled={!canGoNext}
          aria-label="Next month"
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "absolute right-0 h-7 w-7 p-0 opacity-60 hover:opacity-100 disabled:opacity-25",
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* ── Weekday headers ── */}
      <div className="mb-1 flex">
        {WEEKDAYS.map((d) => (
          <div key={d} className="w-8 text-center text-[0.75rem] font-normal text-muted-foreground">
            {d}
          </div>
        ))}
      </div>

      {/* ── Day grid ── */}
      <div className="flex flex-col gap-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex">
            {week.map((day) => {
              const outside = !isSameMonth(day, displayMonth);
              const sel = selected ? isSameDay(day, selected) : false;
              const today = isToday(day);
              const dis = isDayDisabled(day, disabled, startMonth, endMonth);

              if (outside && !showOutsideDays) {
                return <div key={day.toISOString()} className="h-8 w-8" />;
              }

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  disabled={dis}
                  onClick={() => !dis && onSelect?.(day)}
                  className={cn(
                    buttonVariants({ variant: "ghost" }),
                    "h-8 w-8 p-0 text-sm font-normal",
                    outside && "text-muted-foreground opacity-40",
                    today && !sel && "bg-accent text-accent-foreground",
                    sel && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                    dis && "pointer-events-none opacity-30",
                  )}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

Calendar.displayName = "Calendar";

export { Calendar };
