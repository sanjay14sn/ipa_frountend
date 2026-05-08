"use client";

import type { LucideIcon } from "lucide-react";
import {
  Info,
  CreditCard,
  BarChart2,
  Phone,
  BookOpen,
  MapPin,
  LayoutList,
} from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type SectionType =
  | "general"
  | "payment"
  | "progress"
  | "contact"
  | "academic"
  | "location"
  | (string & {});

const SECTION_META: Record<
  string,
  { title: string; icon: LucideIcon }
> = {
  general: { title: "General Information", icon: Info },
  payment: { title: "Payment Information", icon: CreditCard },
  progress: { title: "Progress & Training", icon: BarChart2 },
  contact: { title: "Contact Details", icon: Phone },
  academic: { title: "Academic Information", icon: BookOpen },
  location: { title: "Location", icon: MapPin },
};

export interface SectionField {
  label: string;
  value: ReactNode;
  span?: 1 | 2;
  badge?: boolean;
}

export interface DetailSectionConfig {
  type: SectionType;
  title?: string;
  icon?: LucideIcon;
  fields: SectionField[];
  columns?: 2 | 3 | 4;
}

export interface SectionedDetailProps {
  sections: DetailSectionConfig[];
  className?: string;
}

function resolveSectionMeta(type: SectionType): {
  title: string;
  icon: LucideIcon;
} {
  const known = SECTION_META[type];
  if (known) return known;
  const humanized =
    type.length > 0
      ? type.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
      : "Details";
  return { title: humanized, icon: LayoutList };
}

const gridCols: Record<2 | 3 | 4, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 xl:grid-cols-4",
};

export function SectionedDetail({ sections, className }: SectionedDetailProps) {
  return (
    <div className={cn("space-y-4 p-4 sm:p-6", className)}>
      {sections.map((section, idx) => {
        const meta = resolveSectionMeta(section.type);
        const title = section.title ?? meta.title;
        const Icon = section.icon ?? meta.icon;
        const cols = section.columns ?? 3;

        return (
          <div
            key={`${section.type}-${idx}`}
            className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
          >
            <div className="flex items-center gap-3 border-b border-border bg-surface-green/60 px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-primary">
                <Icon className="h-4 w-4 shrink-0" />
              </div>
              <h3 className="text-sm font-semibold tracking-tight text-[#065f46]">
                {title}
              </h3>
            </div>
            <div
              className={cn(
                "grid gap-4 p-4",
                "grid-cols-1",
                gridCols[cols as 2 | 3 | 4] ?? gridCols[3],
              )}
            >
              {section.fields.map((field) => (
                <div
                  key={field.label}
                  className={cn(
                    "min-w-0 space-y-1",
                    field.span === 2 && "sm:col-span-2",
                  )}
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {field.label}
                  </p>
                  {field.badge ? (
                    <Badge
                      variant="secondary"
                      className="mt-0.5 border border-border bg-accent font-medium text-primary"
                    >
                      {field.value}
                    </Badge>
                  ) : (
                    <div className="text-sm font-medium text-card-foreground break-words">
                      {field.value ?? "—"}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
