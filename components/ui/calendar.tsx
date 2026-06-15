"use client";

import * as React from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import { dpYears, renderDpHeader } from "@/components/ui/date-picker-header";

export interface CalendarProps {
  mode?: "single";
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  defaultMonth?: Date;
  startMonth?: Date;
  endMonth?: Date;
  disabled?: ((date: Date) => boolean) | Date[];
  showOutsideDays?: boolean;
  initialFocus?: boolean;
  className?: string;
}

function Calendar({
  selected,
  onSelect,
  defaultMonth,
  startMonth,
  endMonth,
  disabled,
}: CalendarProps) {
  const filterDate =
    typeof disabled === "function" ? (d: Date) => !disabled(d) : undefined;

  const startYear = startMonth?.getFullYear() ?? 1950;
  const endYear = endMonth?.getFullYear() ?? 2100;

  const years = React.useMemo(
    () => dpYears(startYear, endYear),
    [startYear, endYear],
  );

  return (
    <div className="dp-theme">
      <DatePicker
        selected={selected ?? null}
        onChange={(date: Date | null) => onSelect?.(date ?? undefined)}
        openToDate={defaultMonth ?? selected ?? undefined}
        inline
        minDate={startMonth}
        maxDate={endMonth}
        filterDate={filterDate}
        renderCustomHeader={renderDpHeader(years)}
      />
    </div>
  );
}

Calendar.displayName = "Calendar";

export { Calendar };
