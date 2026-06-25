"use client";

import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, type StatusTone } from "@/components/shared";
import { useAdminOperationsMonitoring } from "@/hooks/api/operations.hooks";
import type {
  MonitoringItemTone,
  OperationsMonitoringListItem,
  OperationsMonitoringSummaryItem,
} from "@/services/operations-monitoring.service";
import { cn } from "@/lib/utils";

type PanelConfig = {
  key:
    | "orders"
    | "shipping"
    | "payments"
    | "inventory"
    | "overduePurchaseOrders"
    | "replenishmentDrafts";
  tab: "orders" | "shipping" | "payments" | "inventory" | "procurement";
  label: string;
  title: string;
  emptyMessage: string;
};

const PANELS: PanelConfig[] = [
  {
    key: "orders",
    tab: "orders",
    label: "Orders",
    title: "Recent pending",
    emptyMessage: "No pending order actions right now.",
  },
  {
    key: "shipping",
    tab: "shipping",
    label: "Shipping",
    title: "Awaiting dispatch",
    emptyMessage: "No shipments are waiting for dispatch.",
  },
  {
    key: "payments",
    tab: "payments",
    label: "Payments",
    title: "Failed / on hold",
    emptyMessage: "No payment issues. All clear.",
  },
  {
    key: "inventory",
    tab: "inventory",
    label: "Inventory",
    title: "Needs attention",
    emptyMessage: "Inventory health is currently stable.",
  },
  {
    key: "overduePurchaseOrders",
    tab: "procurement",
    label: "Procurement",
    title: "Overdue POs",
    emptyMessage: "No overdue purchase orders.",
  },
  {
    key: "replenishmentDrafts",
    tab: "procurement",
    label: "Procurement",
    title: "Replenishment drafts",
    emptyMessage: "No drafts awaiting review.",
  },
];

function toneDotClass(tone: MonitoringItemTone) {
  switch (tone) {
    case "danger":
      return "bg-destructive";
    case "warning":
    case "info":
      return "bg-primary";
    case "neutral":
      return "bg-muted-foreground";
    default:
      return "bg-primary";
  }
}

function toneValueClass(tone: MonitoringItemTone) {
  switch (tone) {
    case "danger":
      return "text-destructive";
    case "warning":
    case "info":
    case "neutral":
      return "text-card-foreground";
    default:
      return "text-primary";
  }
}

function itemBadgeTone(tone: MonitoringItemTone): StatusTone {
  switch (tone) {
    case "danger":
      return "destructive";
    case "warning":
      return "warning";
    case "info":
      return "info";
    case "neutral":
      return "neutral";
    default:
      return "success";
  }
}

function formatLastUpdated(value?: string) {
  if (!value) return "just now";

  const diffMs = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diffMs) || diffMs < 60_000) return "just now";

  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  return `${Math.floor(diffHours / 24)}d ago`;
}

function SummaryCell({ item }: { item: OperationsMonitoringSummaryItem }) {
  return (
    <div className="space-y-3 px-5 py-5 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
          {item.label}
        </div>
        <span className={cn("h-2.5 w-2.5 rounded-full", toneDotClass(item.tone))} />
      </div>
      <div className="text-sm text-muted-foreground">{item.description}</div>
      <div className={cn("text-4xl font-normal leading-none", toneValueClass(item.tone))}>
        {item.value}
      </div>
    </div>
  );
}

function MonitoringItemCard({ item }: { item: OperationsMonitoringListItem }) {
  return (
    <div className="rounded-2xl border bg-background p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-lg text-card-foreground">{item.title}</div>
          <div className="mt-1 text-sm text-muted-foreground">{item.subtitle}</div>
        </div>
        <StatusBadge
          className="shrink-0"
          tone={itemBadgeTone(item.tone)}
          label={item.status}
        />
      </div>
    </div>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed bg-muted/20 px-5 py-8 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

interface MonitoringSectionProps {
  regionAdminId?: number;
  regionLocationId?: number;
}

export function MonitoringSection({
  regionAdminId,
  regionLocationId,
}: MonitoringSectionProps = {}) {
  const monitoringQuery = useAdminOperationsMonitoring({
    regionAdminId,
    regionLocationId,
  });

  if (monitoringQuery.isLoading && !monitoringQuery.data) {
    return (
      <div className="rounded-[1.5rem] border bg-card shadow-sm">
        <div className="flex items-center gap-3 border-b px-6 py-6 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading monitoring workspace...
        </div>
      </div>
    );
  }

  const data = monitoringQuery.data;
  if (!data) {
    return (
      <div className="rounded-[1.5rem] border bg-card p-6 text-sm text-muted-foreground shadow-sm">
        Monitoring data is unavailable right now.
      </div>
    );
  }

  const panelItems = {
    orders: data.orders,
    shipping: data.shipping,
    payments: data.payments,
    inventory: data.inventory,
    overduePurchaseOrders: data.overduePurchaseOrders,
    replenishmentDrafts: data.replenishmentDrafts,
  } satisfies Record<PanelConfig["key"], OperationsMonitoringListItem[]>;

  return (
    <div className="overflow-hidden rounded-[1.75rem] border bg-card shadow-sm">
      <div className="flex flex-col gap-3 border-b px-5 py-6 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-3xl text-card-foreground">Monitoring</h2>
          <p className="mt-2 max-w-2xl text-base text-muted-foreground">
            Live health summary across all Operations modules.
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          Last updated: {formatLastUpdated(data.updatedAt)}
        </div>
      </div>

      <div className="grid divide-y border-b md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-5">
        {data.summary.map((item) => (
          <SummaryCell key={item.key} item={item} />
        ))}
      </div>

      <div className="grid xl:grid-cols-3">
        {PANELS.map((panel, index) => (
          <section
            key={panel.key}
            className={cn(
              "flex h-full flex-col gap-5 px-5 py-5 sm:px-6",
              index < PANELS.length - 1 && "border-b",
              index < PANELS.length - 3 && "xl:border-b",
              index >= PANELS.length - 3 && "xl:border-b-0",
              index % 3 !== 2 && "xl:border-r",
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className="border-primary/20 bg-primary/10 uppercase tracking-[0.18em] text-primary hover:bg-primary/10">
                    {panel.label}
                  </Badge>
                  <h3 className="text-2xl text-card-foreground">{panel.title}</h3>
                </div>
              </div>
              <Link
                href={`/admin/operations?tab=${panel.tab}`}
                className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
              >
                View all
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="border-t" />

            <div className="space-y-3">
              {panelItems[panel.key].length === 0 ? (
                <EmptyPanel message={panel.emptyMessage} />
              ) : (
                panelItems[panel.key].map((item) => (
                  <MonitoringItemCard key={`${panel.key}-${item.id}`} item={item} />
                ))
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
