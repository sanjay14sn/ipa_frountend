"use client";

import Link from "next/link";
import { GraduationCap, Users, ArrowRight, Building2 } from "lucide-react";
import { TablePageShell } from "@/components/shared";
import { Card } from "@/components/ui/card";

const TILES = [
  {
    href: "/admin/students/bulk-import",
    icon: Users,
    title: "Students",
    description:
      "Upload a CSV to enroll many students at once. Roll numbers are auto-generated; franchise / program / level are resolved by name.",
    status: "ready" as const,
  },
  {
    href: "#",
    icon: GraduationCap,
    title: "Course Instructors",
    description:
      "Temporarily disabled — pending validation of the back-fill / agreement flow. Use the single-create CI screen meanwhile.",
    status: "soon" as const,
  },
  {
    href: "#",
    icon: Building2,
    title: "Franchises",
    description:
      "Coming soon — bulk-onboard franchises (one row per franchise / program pair).",
    status: "soon" as const,
  },
];

export default function BulkImportHubPage() {
  return (
    <TablePageShell
      title="Bulk import"
      description="Create many records at once from a CSV file. After upload, review and fix any flagged rows inline, then confirm the import."
    >
      <div
        data-tour="bulk-import-tiles"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {TILES.map((tile) => {
          const Icon = tile.icon;
          const disabled = tile.status === "soon";
          const content = (
            <Card
              className={`flex h-full flex-col gap-3 p-5 transition-colors ${
                disabled
                  ? "opacity-60"
                  : "cursor-pointer hover:border-primary hover:bg-accent/40"
              }`}
            >
              <Icon className="h-6 w-6 text-primary" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-medium">{tile.title}</h3>
                  {disabled && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      Coming soon
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {tile.description}
                </p>
              </div>
              {!disabled && (
                <div className="flex items-center text-sm font-medium text-primary">
                  Start <ArrowRight className="ml-1 h-4 w-4" />
                </div>
              )}
            </Card>
          );

          if (disabled) {
            return <div key={tile.title}>{content}</div>;
          }
          return (
            <Link key={tile.title} href={tile.href}>
              {content}
            </Link>
          );
        })}
      </div>
    </TablePageShell>
  );
}
