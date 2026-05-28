"use client";

import * as React from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

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

  return (
    // Scoping class — CSS overrides in globals.css use .dp-theme prefix
    // for higher specificity than react-datepicker's default stylesheet.
    <div className="dp-theme">
      <DatePicker
        selected={selected ?? null}
        onChange={(date: Date | null) => onSelect?.(date ?? undefined)}
        openToDate={defaultMonth ?? selected ?? undefined}
        inline
        showMonthDropdown
        showYearDropdown
        dropdownMode="select"
        minDate={startMonth}
        maxDate={endMonth}
        filterDate={filterDate}
        yearDropdownItemNumber={100}
        scrollableYearDropdown
      />
    </div>
  );
}

Calendar.displayName = "Calendar";

export { Calendar };
