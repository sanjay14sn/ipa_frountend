"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ModulePill } from "@/components/shared";

interface CIDashboardPanelProps {
  label: string;
  title: string;
  href?: string;
  children: ReactNode;
  className?: string;
}

export function CIDashboardPanel({
  label,
  title,
  href,
  children,
  className,
}: CIDashboardPanelProps) {
  return (
    <section className={cn("flex h-full flex-col gap-4 px-4 py-4 sm:px-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <ModulePill label={label} />
          <h2 className="text-xl text-card-foreground">{title}</h2>
        </div>
        {href ? (
          <Link
            href={href}
            className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
          >
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
      <div className="border-t" />
      {children}
    </section>
  );
}

