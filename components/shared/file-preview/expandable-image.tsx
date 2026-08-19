"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";
import { FilePreviewDialog } from "./file-preview-dialog";

export interface ExpandableImageProps {
  /** Absolute URL, api-relative URL, `data:` URI, or `blob:` URL. */
  src: string;
  alt: string;
  /** Filename shown in the viewer title and used for Download. Defaults to alt. */
  filename?: string;
  /** Classes for the inner <img> — drop-in replacement for an existing <img>. */
  imgClassName?: string;
  /** Classes for the wrapping trigger button. */
  className?: string;
  /** Custom trigger content (e.g. an AvatarMonogram) instead of the <img>. */
  children?: React.ReactNode;
}

/**
 * Click-to-enlarge wrapper for photos and signatures: renders its trigger
 * (an <img> or custom children) inside a button that opens the file-preview
 * viewer as a lightbox with zoom and download.
 */
export function ExpandableImage({
  src,
  alt,
  filename,
  imgClassName,
  className,
  children,
}: ExpandableImageProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        data-testid="expandable-image"
        onClick={() => setOpen(true)}
        aria-label={`View ${alt} full size`}
        className={cn(
          "cursor-zoom-in rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          className,
        )}
      >
        {children ?? (
          // eslint-disable-next-line @next/next/no-img-element -- API-served photo behind session cookies; next/image optimization can't forward credentials
          <img src={src} alt={alt} className={imgClassName} loading="lazy" />
        )}
      </button>
      <FilePreviewDialog
        files={[{ url: src, filename: filename ?? alt }]}
        index={open ? 0 : null}
        onIndexChange={() => {}}
        onClose={() => setOpen(false)}
        size="xl"
      />
    </>
  );
}
