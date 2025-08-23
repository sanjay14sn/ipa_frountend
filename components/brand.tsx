"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface PageShellProps {
  children: React.ReactNode;
  brand?: boolean;
  className?: string;
}

export function PageShell({
  children,
  brand = true,
  className,
}: PageShellProps) {
  return (
    <div className={cn("min-h-screen bg-brand-white-500", className)}>
      {children}
    </div>
  );
}

interface BrandBarProps {
  label: string;
  className?: string;
}

export function BrandBar({ label, className }: BrandBarProps) {
  return (
    <div
      className={cn(
        "bg-brand-green-500 text-brand-white-100 px-4 py-2",
        className
      )}
    >
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-medium">{label}</p>
      </div>
    </div>
  );
}
