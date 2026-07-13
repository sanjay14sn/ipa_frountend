import { cn } from "@/lib/utils";
import type { StatusTone } from "@/components/shared/status-badge";

export interface FactCellProps {
  label: string;
  value: React.ReactNode;
  /** Secondary line under the value. */
  hint?: React.ReactNode;
  /** Tints the value text. */
  tone?: StatusTone;
  /** Monospace value (codes, IDs, order numbers). */
  mono?: boolean;
  size?: "sm" | "md";
  className?: string;
}

const TONE_TEXT: Record<StatusTone, string> = {
  success: "text-success",
  warning: "text-warning-soft-foreground",
  destructive: "text-destructive",
  neutral: "text-card-foreground",
  info: "text-info",
};

/**
 * The one labeled-fact mini-cell: micro label (CC-02 level 3) over a
 * `font-medium` value. Replaces SummaryCell/Fact/Info/FeeCell/SimpleFactRow.
 */
export function FactCell({
  label,
  value,
  hint,
  tone = "neutral",
  mono = false,
  size = "sm",
  className,
}: FactCellProps) {
  return (
    <div data-testid="fact-cell" className={className}>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 font-medium",
          size === "md" ? "text-base" : "text-sm",
          mono && "font-mono tabular-nums",
          TONE_TEXT[tone],
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
