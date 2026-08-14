import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AvatarMonogram, type AvatarSize, type AvatarTone } from "./avatar-monogram";

interface IdentityHeaderProps {
  name: string;
  subtitle?: ReactNode;
  badge?: ReactNode;
  initials?: string;
  /** Renderable photo URL; the monogram falls back to initials without it. */
  avatarSrc?: string | null;
  avatarSize?: AvatarSize;
  avatarTone?: AvatarTone;
  className?: string;
}

export function IdentityHeader({
  name,
  subtitle,
  badge,
  initials,
  avatarSrc,
  avatarSize = "md",
  avatarTone = "primary",
  className,
}: IdentityHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-2", className)}>
      <div className="flex min-w-0 items-center gap-2.5">
        <AvatarMonogram
          name={name}
          initials={initials}
          src={avatarSrc}
          size={avatarSize}
          tone={avatarTone}
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight text-card-foreground">
            {name}
          </p>
          {subtitle ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
      {badge ? <div className="shrink-0">{badge}</div> : null}
    </div>
  );
}
