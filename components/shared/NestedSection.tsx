import { ChevronDown, ChevronRight } from "lucide-react";
import { ReactNode, useRef } from "react";
import { TreeConnector } from "./TreeConnector";

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
  const dotRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative">
      {showConnector && (
        <div ref={dotRef}>
          <TreeConnector type="horizontal" />
        </div>
      )}

      <div className="bg-white rounded-lg border border-primary overflow-hidden">
        <div
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
          onClick={() => onToggle(id)}
        >
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            <h4 className="font-semibold text-gray-900">{title}</h4>
          </div>
          {badge}
        </div>

        {isExpanded && <div className="border-t">{children}</div>}
      </div>
    </div>
  );
}

export function useNestedSectionRef() {
  return useRef<HTMLDivElement>(null);
}
