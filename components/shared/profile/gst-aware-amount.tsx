import { cn } from "@/lib/utils";
import { GST_RATE_LABEL, getFranchiseFeePayable } from "@/lib/gst";
import { money } from "@/lib/ui-helpers";

interface GstAwareAmountProps {
  amount: number | string | null | undefined;
  /** When true, the amount is treated as GST-inclusive and no sub-line shows. */
  inclusive?: boolean | null;
  /** Render the main amount with this Tailwind text size (e.g. "text-3xl"). */
  size?: string;
  /** Inline label (e.g. "franchise fee") shown beside the main amount. */
  label?: string;
  className?: string;
}

export function GstAwareAmount({
  amount,
  inclusive,
  size = "text-base",
  label,
  className,
}: GstAwareAmountProps) {
  const payable = getFranchiseFeePayable(amount, Boolean(inclusive));
  return (
    <div className={cn("space-y-0.5", className)}>
      <p
        className={cn(
          "font-semibold tabular-nums tracking-tight text-card-foreground",
          size,
        )}
      >
        {money(payable.base)}
        {label ? (
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            {label}
          </span>
        ) : null}
      </p>
      {payable.inclusive ? (
        <p className="text-xs text-muted-foreground">GST inclusive</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          + {GST_RATE_LABEL}{" "}
          <span className="font-medium text-foreground">
            {money(payable.gst)}
          </span>
          {" · payable "}
          <span className="font-medium text-foreground">
            {money(payable.payable)}
          </span>
        </p>
      )}
    </div>
  );
}
