import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export type TimelineStopState = "done" | "current" | "upcoming" | "overdue";

export interface TimelineStop {
  label: string;
  sublabel?: React.ReactNode;
  state: TimelineStopState;
  /** Extra line under the sublabel (time, amount…). */
  meta?: React.ReactNode;
}

export interface TimelineProps {
  stops: TimelineStop[];
  size?: "sm" | "md";
  className?: string;
}

/**
 * The one horizontal dot+connector lifecycle strip (agreement lifecycle, CI
 * lifecycle, EMI plan). Dot shows a Check when done; overdue renders the
 * destructive tone; the connector fills when the preceding stop is done.
 */
export function Timeline({ stops, size = "md", className }: TimelineProps) {
  const dot = size === "sm" ? "h-6 w-6" : "h-8 w-8";
  const check = size === "sm" ? "h-3 w-3" : "h-4 w-4";

  return (
    <div
      data-testid="timeline"
      className={cn("flex items-start", className)}
    >
      {stops.map((stop, i) => (
        <div key={i} className="contents">
          {i > 0 ? (
            <div
              className={cn(
                "flex-1 h-px",
                size === "sm" ? "mt-3" : "mt-4",
                stops[i - 1].state === "done" ? "bg-primary" : "bg-border",
              )}
            />
          ) : null}
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "flex items-center justify-center rounded-full",
                dot,
                stop.state === "done" &&
                  "bg-primary text-primary-foreground",
                stop.state === "current" &&
                  "border-2 border-primary bg-background",
                stop.state === "upcoming" &&
                  "border-2 border-border bg-background",
                stop.state === "overdue" &&
                  "border-2 border-destructive bg-destructive-soft text-destructive",
              )}
            >
              {stop.state === "done" ? <Check className={check} /> : null}
              {stop.state === "current" ? (
                <span className="h-2 w-2 rounded-full bg-primary" />
              ) : null}
              {stop.state === "overdue" ? (
                <span className="h-2 w-2 rounded-full bg-destructive" />
              ) : null}
            </div>
            <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {stop.label}
            </p>
            {stop.sublabel ? (
              <p
                className={cn(
                  "text-center text-xs font-medium",
                  stop.state === "overdue" && "text-destructive",
                )}
              >
                {stop.sublabel}
              </p>
            ) : null}
            {stop.meta ? (
              <p className="text-center text-[11px] text-muted-foreground">
                {stop.meta}
              </p>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
