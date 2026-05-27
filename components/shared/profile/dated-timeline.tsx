import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DatedTimelineStep {
  label: string;
  date?: string;
  time?: string;
  status: "complete" | "pending";
}

interface DatedTimelineProps {
  steps: DatedTimelineStep[];
  className?: string;
}

export function DatedTimeline({ steps, className }: DatedTimelineProps) {
  return (
    <div className={cn("flex items-start", className)}>
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        const isComplete = step.status === "complete";
        const nextComplete =
          !isLast && steps[i + 1]?.status === "complete";
        return (
          <div key={`${step.label}-${i}`} className="flex flex-1 items-start">
            <div className="flex min-w-0 flex-col items-center px-1">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full",
                  isComplete
                    ? "bg-primary text-primary-foreground"
                    : "border-2 border-border bg-background",
                )}
              >
                {isComplete ? <Check className="h-4 w-4" /> : null}
              </div>
              <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {step.label}
              </p>
              <p className="text-center text-xs font-medium text-card-foreground">
                {step.date ?? "—"}
              </p>
              {step.time ? (
                <p className="text-center text-[11px] text-muted-foreground">
                  {step.time}
                </p>
              ) : null}
            </div>
            {!isLast ? (
              <div
                className={cn(
                  "mt-4 h-px flex-1",
                  isComplete && nextComplete ? "bg-primary" : "bg-border",
                )}
                aria-hidden
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
