"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/ui-helpers";

export type AvatarSize = "sm" | "md" | "lg";
export type AvatarTone = "primary" | "muted" | "accent";

interface AvatarMonogramProps {
  name?: string | null;
  initials?: string;
  /** Renderable photo URL; falls back to initials when absent or broken. */
  src?: string | null;
  size?: AvatarSize;
  tone?: AvatarTone;
  className?: string;
}

const SIZE_CLASS: Record<AvatarSize, string> = {
  sm: "h-7 w-7 text-[11px]",
  md: "h-9 w-9 text-sm",
  lg: "h-12 w-12 text-base",
};

const TONE_CLASS: Record<AvatarTone, string> = {
  primary: "bg-primary text-primary-foreground",
  muted: "bg-muted text-muted-foreground border border-border",
  accent: "bg-accent text-accent-foreground",
};

export function AvatarMonogram({
  name,
  initials,
  src,
  size = "md",
  tone = "primary",
  className,
}: AvatarMonogramProps) {
  const [failed, setFailed] = useState(false);
  // Reset the error fallback when the photo URL changes (adjust-during-render
  // pattern — every replace mints a new URL, so a new photo gets a fresh try).
  const [lastSrc, setLastSrc] = useState(src);
  if (src !== lastSrc) {
    setLastSrc(src);
    setFailed(false);
  }

  const text = (initials ?? getInitials(name) ?? "??").slice(0, 2) || "??";
  const showImage = Boolean(src) && !failed;
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-lg font-semibold leading-none",
        SIZE_CLASS[size],
        showImage ? "border border-border bg-muted" : TONE_CLASS[tone],
        className,
      )}
      aria-hidden
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- API-served photo behind session cookies; next/image optimization can't forward credentials
        <img
          src={src as string}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        text
      )}
    </div>
  );
}
