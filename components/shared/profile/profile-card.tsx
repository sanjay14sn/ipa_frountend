import type { ComponentType, ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ProfileCardProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  /** Use to stretch within an items-stretch grid row. */
  fillHeight?: boolean;
}

export function ProfileCard({
  children,
  className,
  contentClassName,
  fillHeight,
}: ProfileCardProps) {
  return (
    <Card className={cn("rounded-xl", fillHeight && "h-full", className)}>
      <CardContent
        className={cn(
          "space-y-3 p-4",
          fillHeight && "flex h-full flex-col",
          contentClassName,
        )}
      >
        {children}
      </CardContent>
    </Card>
  );
}

interface ProfileCardSectionProps {
  icon?: ComponentType<{ className?: string }>;
  label?: string;
  children: ReactNode;
  className?: string;
  divider?: boolean;
}

export function ProfileCardSection({
  icon: Icon,
  label,
  children,
  className,
  divider,
}: ProfileCardSectionProps) {
  return (
    <div
      className={cn(
        "space-y-2",
        divider && "border-t border-border pt-3",
        className,
      )}
    >
      {label ? (
        <div className="flex items-center gap-1.5 text-muted-foreground">
          {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
          <span className="text-xs font-medium">{label}</span>
        </div>
      ) : null}
      {children}
    </div>
  );
}
