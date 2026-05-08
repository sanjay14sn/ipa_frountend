"use client";

import type { ElementType, ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function ModulePill({ label }: { label: string }) {
  return (
    <span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.16em] text-primary">
      {label}
    </span>
  );
}

interface CIStatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: ElementType;
  href?: string;
}

export function CIStatCard({ label, value, sub, icon: Icon, href }: CIStatCardProps) {
  const content = (
    <>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          <Icon className="h-4 w-4" />
        </span>
        {label}
      </div>
      <div>
        <p className="text-3xl font-light leading-none text-card-foreground">
          {value}
        </p>
        {sub ? (
          <p className="mt-1 text-xs leading-snug text-muted-foreground">{sub}</p>
        ) : null}
      </div>
    </>
  );

  if (!href) {
    return <div className="space-y-3 px-4 py-4 sm:px-5">{content}</div>;
  }

  return (
    <Link
      href={href}
      className="group block space-y-3 px-4 py-4 transition-colors hover:bg-accent sm:px-5"
    >
      {content}
    </Link>
  );
}

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

