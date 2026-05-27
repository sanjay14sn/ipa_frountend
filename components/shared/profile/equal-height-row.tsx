import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type RowSplit = "2" | "3:2" | "2:3" | "3";

interface EqualHeightRowProps {
  children: ReactNode;
  split?: RowSplit;
  gap?: 2 | 3 | 4;
  className?: string;
}

const SPLIT_CLASS: Record<RowSplit, string> = {
  "2": "md:grid-cols-2",
  "3:2": "xl:grid-cols-[3fr,2fr]",
  "2:3": "xl:grid-cols-[2fr,3fr]",
  "3": "md:grid-cols-3",
};

const GAP_CLASS: Record<NonNullable<EqualHeightRowProps["gap"]>, string> = {
  2: "gap-2",
  3: "gap-3",
  4: "gap-4",
};

/**
 * Equal-height grid row. Children become `h-full` siblings; the outer grid
 * uses `items-stretch` so cards line up vertically.
 */
export function EqualHeightRow({
  children,
  split = "2",
  gap = 3,
  className,
}: EqualHeightRowProps) {
  return (
    <div
      className={cn(
        "grid items-stretch",
        GAP_CLASS[gap],
        SPLIT_CLASS[split],
        className,
      )}
    >
      {children}
    </div>
  );
}
