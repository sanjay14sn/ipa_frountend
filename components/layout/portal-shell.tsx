"use client";

import { Suspense } from "react";

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { PortalBreadcrumbs } from "@/components/layout/portal-breadcrumbs";
import { PortalHeaderActions } from "@/components/layout/portal-header-actions";
import { PortalSidebar } from "@/components/layout/portal-sidebar";
import type { PortalNavSection } from "@/lib/navigation/nav-config";

export interface PortalShellProps {
  variant: "full" | "header-only" | "bare";
  /** Forwarded to PortalHeaderActions. */
  portal: "admin" | "franchisee" | "ci";
  /** Brand plate link target. */
  homeHref: string;
  brand: { title: string; subtitle?: string };
  /** Required for variant "full" (from nav-config). */
  nav?: readonly PortalNavSection[];
  breadcrumbRoot: { label: string; href: string };
  /** e.g. franchisee switchers — rendered after the breadcrumbs. */
  headerStart?: React.ReactNode;
  /** Extras rendered before the default actions cluster. */
  headerEnd?: React.ReactNode;
  /** true = suppress PortalHeaderActions (CI pre-signature). */
  hideDefaultActions?: boolean;
  /** Onboarding / signature-required banner in the sidebar. */
  sidebarBanner?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * The one portal chrome shell — pure presentation, zero auth logic. The thin
 * area layouts keep every gate/funnel and pick a variant:
 * - "full": navy sidebar + h-14 header + content
 * - "header-only": h-14 header + content (staff admin, CI pre-signature,
 *   franchisee agreement funnel)
 * - "bare": children only (CI login keeps its own page chrome)
 */
export function PortalShell({
  variant,
  portal,
  homeHref,
  brand,
  nav,
  breadcrumbRoot,
  headerStart,
  headerEnd,
  hideDefaultActions = false,
  sidebarBanner,
  children,
}: PortalShellProps) {
  if (variant === "bare") {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  const header = (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card px-4">
      {variant === "full" ? (
        <>
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4 bg-border" />
        </>
      ) : (
        <span className="text-sm font-semibold text-primary">
          {brand.title}
        </span>
      )}
      {/* PortalBreadcrumbs reads useSearchParams — needs a Suspense boundary. */}
      <Suspense fallback={null}>
        <PortalBreadcrumbs root={breadcrumbRoot} />
      </Suspense>
      {/* Global search slot: intentionally omitted — no search endpoint exists. */}
      <div className="ml-auto flex items-center gap-2">
        {headerStart}
        {headerEnd}
        {hideDefaultActions ? null : <PortalHeaderActions portal={portal} />}
      </div>
    </header>
  );

  if (variant === "header-only") {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        {header}
        <div className="flex flex-1 flex-col gap-4 p-4">{children}</div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <PortalSidebar
        nav={nav ?? []}
        homeHref={homeHref}
        brand={brand}
        banner={sidebarBanner}
      />
      <SidebarInset>
        {header}
        <div className="flex flex-1 flex-col gap-4 bg-background p-4">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
