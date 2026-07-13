"use client";

import { Download, Loader2 } from "lucide-react";

import { RowActionButton } from "@/components/shared/row-action-button";
import { cn } from "@/lib/utils";

export interface DcDownloadProps {
  href?: string;
  onClick?: () => void;
  variant: "link" | "icon";
  busy?: boolean;
  /** @default "Delivery challan" */
  label?: string;
  className?: string;
}

/**
 * The delivery-challan download affordance, identical in orders and
 * shipping. Link variant = inline text link; icon variant = RowActionButton.
 */
export function DcDownload({
  href,
  onClick,
  variant,
  busy = false,
  label = "Delivery challan",
  className,
}: DcDownloadProps) {
  if (variant === "icon") {
    return (
      <RowActionButton
        icon={Download}
        label={label}
        busy={busy}
        onClick={() => {
          if (onClick) onClick();
          else if (href) window.open(href, "_blank", "noopener");
        }}
        className={className}
      />
    );
  }

  const body = (
    <>
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Download className="h-3.5 w-3.5" />
      )}
      {label}
    </>
  );
  const linkClass = cn(
    "inline-flex items-center gap-1 text-sm text-primary underline underline-offset-2 hover:opacity-75",
    className,
  );

  return href ? (
    <a
      data-testid="dc-download"
      className={linkClass}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      {body}
    </a>
  ) : (
    <button
      data-testid="dc-download"
      type="button"
      className={linkClass}
      onClick={onClick}
      disabled={busy}
    >
      {body}
    </button>
  );
}
