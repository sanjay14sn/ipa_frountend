import { ChevronDown, ChevronRight } from "lucide-react";
import { ReactNode, useRef } from "react";
import { cn } from "@/lib/utils";

interface NestedSectionProps {
  id: string;
  title: string;
  badge?: ReactNode;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  children: ReactNode;
  showConnector?: boolean;
}

export function NestedSection({
  id,
  title,
  badge,
  isExpanded,
  onToggle,
  children,
  showConnector = true,
}: NestedSectionProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card shadow-sm",
        showConnector && "ml-0",
      )}
    >
      <button
        type="button"
        className={cn(
          "flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-accent/40",
          isExpanded && "border-b border-border bg-accent/20",
        )}
        onClick={() => onToggle(id)}
      >
        <div className="flex min-w-0 items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-primary" />
          ) : (
            <ChevronRight className="h-4 w-4 text-primary" />
          )}
          <h4 className="truncate font-semibold text-card-foreground">
            {title}
          </h4>
        </div>
        {badge}
      </button>

      {isExpanded && <div className="bg-muted/20">{children}</div>}
    </div>
  );
}

export function useNestedSectionRef() {
  return useRef<HTMLDivElement>(null);
}
