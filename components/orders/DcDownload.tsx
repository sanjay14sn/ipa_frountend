"use client";

import { useState } from "react";
import { Download, Eye, Loader2 } from "lucide-react";

import { FilePreviewDialog } from "@/components/shared";
import { RowActionButton } from "@/components/shared/row-action-button";
import { cn } from "@/lib/utils";

export interface DcDownloadProps {
  href?: string;
  onClick?: () => void;
  variant: "link" | "icon";
  busy?: boolean;
  /** @default "Delivery challan" */
  label?: string;
  /** In-app preview URL (api-relative, e.g. `/uploads/<dcPdfPath>`). Adds a View action. */
  previewUrl?: string;
  className?: string;
}

/**
 * The delivery-challan affordance, identical in orders and shipping.
 * Link variant = inline text link; icon variant = RowActionButton.
 * With `previewUrl` set, a View action opens the challan in the in-app viewer.
 */
export function DcDownload({
  href,
  onClick,
  variant,
  busy = false,
  label = "Delivery challan",
  previewUrl,
  className,
}: DcDownloadProps) {
  const [previewOpen, setPreviewOpen] = useState(false);

  const previewDialog = previewUrl ? (
    <FilePreviewDialog
      files={[
        {
          url: previewUrl,
          filename: previewUrl.split("/").pop() || "delivery-challan.pdf",
        },
      ]}
      index={previewOpen ? 0 : null}
      onIndexChange={() => {}}
      onClose={() => setPreviewOpen(false)}
    />
  ) : null;

  if (variant === "icon") {
    return (
      <>
        {previewUrl ? (
          <RowActionButton
            icon={Eye}
            label="View delivery challan"
            onClick={() => setPreviewOpen(true)}
            className={className}
          />
        ) : null}
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
        {previewDialog}
      </>
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

  const downloadNode = href ? (
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

  if (!previewUrl) return downloadNode;

  return (
    <span className="inline-flex items-center gap-3">
      <button
        data-testid="dc-preview"
        type="button"
        className={linkClass}
        onClick={() => setPreviewOpen(true)}
      >
        <Eye className="h-3.5 w-3.5" />
        View
      </button>
      {downloadNode}
      {previewDialog}
    </span>
  );
}
