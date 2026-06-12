import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { GstAwareAmount } from "./gst-aware-amount";

interface FeeHeroBlockProps {
  amount: number | string | null | undefined;
  label: string;
  inclusive?: boolean | null;
  metrics?: Array<{ label: string; value: ReactNode; hint?: ReactNode }>;
  rightSlot?: ReactNode;
  className?: string;
}

function FeeHeroBlock({
  amount,
  label,
  inclusive,
  metrics,
  rightSlot,
  className,
}: FeeHeroBlockProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <GstAwareAmount
          amount={amount}
          inclusive={inclusive}
          size="text-3xl"
          label={label}
        />
        {rightSlot ? (
          <div className="shrink-0 text-right text-xs text-muted-foreground">
            {rightSlot}
          </div>
        ) : null}
      </div>
      {metrics && metrics.length > 0 ? (
        <div
          className={cn(
            "grid gap-3 border-t border-border pt-3",
            metrics.length === 2
              ? "grid-cols-2"
              : metrics.length === 3
                ? "grid-cols-3"
                : "grid-cols-2 md:grid-cols-4",
          )}
        >
          {metrics.map((m) => (
            <div key={m.label}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {m.label}
              </p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums text-card-foreground">
                {m.value ?? "—"}
              </p>
              {m.hint ? (
                <p className="text-xs text-muted-foreground">{m.hint}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
