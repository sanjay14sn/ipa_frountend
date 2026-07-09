import { cn } from "@/lib/utils";
import { formatRupees } from "@/lib/currency-utils";
import { GST_RATE_LABEL } from "@/lib/gst";

export interface GstAmountProps {
  principal: number;
  gst: number;
  /**
   * "inclusive" → "₹X incl. 18% GST" (X = principal, GST already inside);
   * "additive" → "₹X + 18% GST" (X = principal, GST charged on top).
   */
  mode: "inclusive" | "additive";
  size?: "sm" | "xs";
  className?: string;
}

/**
 * The one "principal + GST" subline (one copy voice; rate label from
 * lib/gst GST_RATE_LABEL).
 */
export function GstAmount({
  principal,
  gst,
  mode,
  size = "sm",
  className,
}: GstAmountProps) {
  return (
    <span
      data-testid="gst-amount"
      className={cn(
        "text-muted-foreground",
        size === "sm" ? "text-sm" : "text-xs",
        className,
      )}
    >
      <span className="tabular-nums text-card-foreground">
        {formatRupees(principal)}
      </span>{" "}
      {mode === "inclusive" ? (
        <>incl. {GST_RATE_LABEL}</>
      ) : (
        <>
          + {GST_RATE_LABEL}
          {gst > 0 ? (
            <> ({formatRupees(gst)})</>
          ) : null}
        </>
      )}
    </span>
  );
}
