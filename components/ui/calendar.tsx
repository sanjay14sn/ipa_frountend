"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, useDayPicker } from "react-day-picker";
import type { MonthCaptionProps } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function CalendarCaption({ calendarMonth }: MonthCaptionProps) {
  const { goToMonth, startMonth, endMonth } = useDayPicker();

  const currentMonth = calendarMonth.date.getMonth();
  const currentYear = calendarMonth.date.getFullYear();

  const startYear = startMonth ? startMonth.getFullYear() : 1950;
  const endYear = endMonth ? endMonth.getFullYear() : 2100;

  const years = Array.from(
    { length: endYear - startYear + 1 },
    (_, i) => startYear + i,
  );

  return (
    <div className="flex items-center gap-1">
      <Select
        value={String(currentMonth)}
        onValueChange={(v) => goToMonth(new Date(currentYear, Number(v)))}
      >
        <SelectTrigger className="h-7 w-[115px] border-0 bg-transparent px-2 text-sm font-medium shadow-none focus:ring-0 focus:ring-offset-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MONTH_NAMES.map((name, i) => (
            <SelectItem key={name} value={String(i)}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={String(currentYear)}
        onValueChange={(v) => goToMonth(new Date(Number(v), currentMonth))}
      >
        <SelectTrigger className="h-7 w-[75px] border-0 bg-transparent px-2 text-sm font-medium shadow-none focus:ring-0 focus:ring-offset-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-52">
          {years.map((year) => (
            <SelectItem key={year} value={String(year)}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  components: componentsProp,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "relative flex flex-col gap-4 sm:flex-row sm:gap-4",
        month: "relative flex flex-col gap-3",
        month_caption: "flex h-7 items-center justify-center",
        caption_label: "text-sm font-medium",
        nav: "absolute inset-x-1 top-0 z-20 flex h-7 items-center justify-between",
        button_previous: cn(
          buttonVariants({ variant: "ghost" }),
          "h-7 w-7 bg-transparent p-0 opacity-60 hover:opacity-100",
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost" }),
          "h-7 w-7 bg-transparent p-0 opacity-60 hover:opacity-100",
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday:
          "text-muted-foreground rounded-md w-8 font-normal text-[0.75rem]",
        week: "mt-1 flex w-full",
        day: "h-8 w-8 p-0 text-center text-sm relative [&:has([aria-selected].range_end)]:rounded-r-md [&:has([aria-selected].outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-10",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 p-0 font-normal aria-selected:opacity-100",
        ),
        range_end: "range_end",
        selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        today: "bg-accent text-accent-foreground",
        outside:
          "outside text-muted-foreground aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
        disabled: "text-muted-foreground opacity-50",
        range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevronCn, ...chevronProps }) => {
          const Icon = orientation === "left" ? ChevronLeft : ChevronRight;
          return (
            <Icon className={cn("h-4 w-4", chevronCn)} {...chevronProps} />
          );
        },
        MonthCaption: CalendarCaption,
        ...componentsProp,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
