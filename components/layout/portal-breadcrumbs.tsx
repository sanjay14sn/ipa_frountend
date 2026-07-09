"use client";

import { Fragment } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  getTabLabels,
  humanizeSegment,
  SEGMENT_LABELS,
} from "@/lib/navigation/breadcrumb-labels";
import { useBreadcrumbStore } from "@/lib/stores/breadcrumb-store";

export interface PortalBreadcrumbsProps {
  /** Portal root crumb, e.g. { label: "Dashboard", href: "/admin/dashboard" }. */
  root: { label: string; href: string };
}

interface Crumb {
  key: string;
  label: string;
  href?: string;
}

/**
 * Path-derived breadcrumbs: root › one crumb per segment below the portal
 * root (override > SEGMENT_LABELS > humanizer) › a ?tab= crumb when the
 * pathname is a known hub. The last crumb renders as the current page.
 */
export function PortalBreadcrumbs({ root }: PortalBreadcrumbsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const overrides = useBreadcrumbStore((s) => s.overrides);

  // Segments below the portal root ("/admin", "/ci", "/franchisee").
  const allSegments = pathname.split("/").filter(Boolean);
  const belowPortal = allSegments.slice(1);

  const crumbs: Crumb[] = [{ key: "__root", label: root.label, href: root.href }];

  let acc = `/${allSegments[0] ?? ""}`;
  for (const segment of belowPortal) {
    acc += `/${segment}`;
    // Don't repeat the root crumb when standing on the portal home page.
    if (acc === root.href && crumbs.length === 1) continue;
    crumbs.push({
      key: acc,
      label:
        overrides[segment] ?? SEGMENT_LABELS[segment] ?? humanizeSegment(segment),
      href: acc,
    });
  }

  const tab = searchParams.get("tab");
  const tabLabels = tab ? getTabLabels(pathname) : undefined;
  if (tab && tabLabels?.[tab]) {
    crumbs.push({ key: `${pathname}?tab=${tab}`, label: tabLabels[tab] });
  }

  return (
    <Breadcrumb data-testid="portal-breadcrumbs">
      <BreadcrumbList>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <Fragment key={crumb.key}>
              {index > 0 ? <BreadcrumbSeparator /> : null}
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={crumb.href ?? "#"}>
                    {crumb.label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
