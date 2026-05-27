import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface LabeledValueProps {
  label: string;
  value: ReactNode;
  mono?: boolean;
  className?: string;
}

export function LabeledValue({
  label,
  value,
  mono,
  className,
}: LabeledValueProps) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 break-words text-xs text-card-foreground",
          mono &&
            "rounded bg-muted px-1.5 py-1 font-mono",
        )}
      >
        {value ?? "—"}
      </p>
    </div>
  );
}
