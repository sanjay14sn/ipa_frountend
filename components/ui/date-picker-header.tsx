"use client";

import * as React from "react";
import { getMonth, getYear } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactDatePickerCustomHeaderProps } from "react-datepicker";

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Inclusive list of years between two bounds, for the year <select>. */
export function dpYears(startYear: number, endYear: number): number[] {
  return Array.from(
    { length: Math.max(0, endYear - startYear + 1) },
    (_, i) => startYear + i,
  );
}

/**
 * Shared month/year header for react-datepicker, styled by the `.dp-theme`
 * rules in globals.css. Used by both the inline `Calendar` and the `DateInput`
 * popup so they stay visually identical.
 */
export function renderDpHeader(years: number[]) {
  return function DpHeader({
    date,
    changeMonth,
    changeYear,
    decreaseMonth,
    increaseMonth,
    prevMonthButtonDisabled,
    nextMonthButtonDisabled,
  }: ReactDatePickerCustomHeaderProps) {
    return (
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
    );
  };
}
