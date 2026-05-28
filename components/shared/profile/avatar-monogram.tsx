import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/ui-helpers";

export type AvatarSize = "sm" | "md" | "lg";
export type AvatarTone = "primary" | "muted" | "accent";

interface AvatarMonogramProps {
  name?: string | null;
  initials?: string;
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
  size = "md",
  tone = "primary",
  className,
}: AvatarMonogramProps) {
  const text = (initials ?? getInitials(name) ?? "??").slice(0, 2) || "??";
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg font-semibold leading-none",
        SIZE_CLASS[size],
        TONE_CLASS[tone],
        className,
      )}
      aria-hidden
    >
      {text}
    </div>
  );
}
