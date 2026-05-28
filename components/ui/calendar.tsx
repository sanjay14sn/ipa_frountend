"use client";

import * as React from "react";
import { getMonth, getYear } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

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
    () =>
      Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i),
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
        renderCustomHeader={({
          date,
          changeMonth,
          changeYear,
          decreaseMonth,
          increaseMonth,
          prevMonthButtonDisabled,
          nextMonthButtonDisabled,
        }) => (
          <div className="dp-hdr">
            <button
              type="button"
              onClick={decreaseMonth}
              disabled={prevMonthButtonDisabled}
              className="dp-hdr-btn"
            >
              <ChevronLeft size={15} />
            </button>

            <div className="dp-hdr-selects">
              <select
                className="dp-sel"
                value={getMonth(date)}
                onChange={(e) => changeMonth(Number(e.target.value))}
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i}>{m}</option>
                ))}
              </select>

              <select
                className="dp-sel"
                value={getYear(date)}
                onChange={(e) => changeYear(Number(e.target.value))}
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={increaseMonth}
              disabled={nextMonthButtonDisabled}
              className="dp-hdr-btn"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        )}
      />
    </div>
  );
}

Calendar.displayName = "Calendar";

export { Calendar };
