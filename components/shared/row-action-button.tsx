"use client";

import type { LucideIcon } from "lucide-react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface RowActionButtonProps {
  icon: LucideIcon;
  /** Doubles as tooltip and aria-label. */
  label: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  busy?: boolean;
  tone?: "default" | "destructive";
  disabled?: boolean;
  className?: string;
}

/**
 * The one ghost icon row action (R1's inline actions and the overflow
 * triggers both build on it). Shows a spinner while `busy`.
 */
export function RowActionButton({
  icon: Icon,
  label,
  onClick,
  busy = false,
  tone = "default",
  disabled = false,
  className,
}: RowActionButtonProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            data-testid="row-action-button"
            aria-label={label}
            className={cn(
              "h-8 w-8 p-0",
              tone === "destructive" &&
                "text-destructive hover:bg-destructive-soft hover:text-destructive",
              className,
            )}
            onClick={onClick}
            disabled={disabled || busy}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Icon className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
