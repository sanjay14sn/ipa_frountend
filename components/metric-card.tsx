"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function MetricCard({
  label,
  value,
  delta,
  positive = true,
  icon: Icon,
  accent = "emerald",
}: {
  label: string;
  value: string;
  delta?: string;
  positive?: boolean;
  icon?: LucideIcon;
  accent?: "emerald" | "amber";
}) {
  const colors =
    accent === "emerald"
      ? {
          block: "bg-emerald-600",
          soft: "bg-emerald-50 text-emerald-950",
          delta: "text-emerald-800",
        }
      : {
          block: "bg-amber-500",
          soft: "bg-amber-50 text-amber-950",
          delta: "text-amber-800",
        };

  return (
    <Card
      className={cn(
        "relative overflow-hidden border border-gray-200 shadow-sm min-h-[180px] h-full flex flex-col",
        colors.soft
      )}
    >
      <div
        className={cn(
          "absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 size-32 rounded-full opacity-15",
          colors.block
        )}
      />
      <CardHeader className="pb-4 pt-6 flex-none relative z-10">
        <div className="mb-4 flex flex-col items-center gap-3 text-center">
          {Icon ? (
            <span className="grid size-12 place-items-center rounded-lg border border-gray-200 text-white bg-yellow-500">
              <Icon className="h-6 w-6" />
            </span>
          ) : null}
          <span className="text-sm font-medium opacity-80">{label}</span>
        </div>
        <CardTitle className="text-4xl font-bold text-center">
          {value}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 pb-6 text-center flex-grow flex items-end justify-center relative z-10">
        {delta ? (
          <div className={cn("text-sm font-medium", colors.delta)}>
            {positive ? "↑" : "↓"} {delta}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
