import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AvatarMonogram, type AvatarTone } from "./avatar-monogram";

export interface PartyCardProps {
  initials?: string;
  name: string;
  role: string;
  address?: ReactNode;
  avatarTone?: AvatarTone;
  className?: string;
}

function PartyCard({
  initials,
  name,
  role,
  address,
  avatarTone = "primary",
  className,
}: PartyCardProps) {
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <AvatarMonogram
        name={name}
        initials={initials}
        size="md"
        tone={avatarTone}
      />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {role}
        </p>
        <p className="text-sm font-medium text-card-foreground">{name}</p>
        {address ? (
          <p className="text-xs text-muted-foreground">{address}</p>
        ) : null}
      </div>
    </div>
  );
}

interface PartiesBlockProps {
  left: PartyCardProps;
  right: PartyCardProps;
  connectorLabel?: string;
  className?: string;
}

function PartiesBlock({
  left,
  right,
  connectorLabel = "AGREEMENT",
  className,
}: PartiesBlockProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <PartyCard {...left} />
      <div className="ml-4 flex items-center gap-2 py-0.5">
        <div className="h-4 w-px bg-border" />
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
          ↕ {connectorLabel}
        </p>
      </div>
      <PartyCard {...right} avatarTone={right.avatarTone ?? "muted"} />
    </div>
  );
}
