import { cn } from "@/lib/utils";
import { formatRupees } from "@/lib/currency-utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface GstBreakdown {
  subtotal: number;
  gst: number;
}

export interface GstTooltipProps {
  breakdown: GstBreakdown;
  children: React.ReactNode;
}

/**
 * Radix tooltip carrying the GST breakdown — replaces the native `title`
 * attribute the order tables used.
 */
export function GstTooltip({ breakdown, children }: GstTooltipProps) {
  const total = breakdown.subtotal + breakdown.gst;
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent data-testid="gst-tooltip">
          Subtotal {formatRupees(breakdown.subtotal)} + GST{" "}
          {formatRupees(breakdown.gst)} = Total {formatRupees(total)}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export interface MoneyCellProps {
  amount: number;
  /** When present, the cell is wrapped in a GstTooltip. */
  breakdown?: GstBreakdown;
  align?: "left" | "right";
  className?: string;
}

/**
 * The one money cell: formatRupees in tabular numerals, right-aligned by
 * default (amount columns are right-aligned app-wide).
 */
export function MoneyCell({
  amount,
  breakdown,
  align = "right",
  className,
}: MoneyCellProps) {
  const body = (
    <span
      data-testid="money-cell"
      className={cn(
        "tabular-nums",
        align === "right" ? "block text-right" : "block text-left",
        className,
      )}
    >
      {formatRupees(amount)}
    </span>
  );
  return breakdown ? (
    <GstTooltip breakdown={breakdown}>{body}</GstTooltip>
  ) : (
    body
  );
}
