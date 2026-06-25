"use client";

import {
  getInventoryMonitoring,
  type InventoryItemSummary,
} from "@/services/inventory.service";
import {
  getAdminOrdersFlat,
  type OrderData,
} from "@/services/order.service";
import {
  getPaginatedPurchaseOrders,
  getPaginatedReplenishmentDrafts,
  type PurchaseOrderSummary,
} from "@/services/procurement.service";

const MAX_MONITORING_ROWS = 10_000;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

export type MonitoringItemTone =
  | "primary"
  | "info"
  | "warning"
  | "danger"
  | "neutral";

export interface OperationsMonitoringListItem {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  tone: MonitoringItemTone;
}

export interface OperationsMonitoringSummaryItem {
  key: "orders" | "shipping" | "payments" | "inventory" | "procurement";
  label: string;
  description: string;
  value: number;
  tone: MonitoringItemTone;
}

export interface OperationsMonitoringSnapshot {
  updatedAt: string;
  summary: OperationsMonitoringSummaryItem[];
  orders: OperationsMonitoringListItem[];
  shipping: OperationsMonitoringListItem[];
  payments: OperationsMonitoringListItem[];
  inventory: OperationsMonitoringListItem[];
  overduePurchaseOrders: OperationsMonitoringListItem[];
  replenishmentDrafts: OperationsMonitoringListItem[];
}

function compareDateDesc(left?: string | null, right?: string | null) {
  const leftValue = left ? Date.parse(left) : Number.NEGATIVE_INFINITY;
  const rightValue = right ? Date.parse(right) : Number.NEGATIVE_INFINITY;
  return rightValue - leftValue;
}

function compareDateAsc(left?: string | null, right?: string | null) {
  const leftValue = left ? Date.parse(left) : Number.POSITIVE_INFINITY;
  const rightValue = right ? Date.parse(right) : Number.POSITIVE_INFINITY;
  return leftValue - rightValue;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value?: string | null) {
  if (!value) return "Date unavailable";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(parsed);
}

function describeRecentDate(value?: string | null, fallback = "Updated recently") {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;

  const diffDays = Math.floor((Date.now() - parsed.getTime()) / DAY_IN_MS);
  if (diffDays <= 0) return "Created today";
  if (diffDays === 1) return "Created yesterday";
  return `Created ${diffDays} days ago`;
}

function describeDispatchAge(value?: string | null) {
  if (!value) return "Ready for dispatch";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Ready for dispatch";

  const diffDays = Math.floor((Date.now() - parsed.getTime()) / DAY_IN_MS);
  if (diffDays <= 0) return "Ready today";
  if (diffDays === 1) return "Waiting 1 day";
  return `Waiting ${diffDays} days`;
}

function describeExpectedDate(value?: string | null) {
  if (!value) return "Expected date not set";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  const diffDays = Math.floor((Date.now() - parsed.getTime()) / DAY_IN_MS);
  if (diffDays <= 0) return `Due ${formatDate(value)}`;
  if (diffDays === 1) return "Overdue by 1 day";
  return `Overdue by ${diffDays} days`;
}

function formatInventoryStatus(tags: string[]) {
  if (tags.length === 0) return "Attention";
  if (tags.length === 1) return tags[0];
  return tags.join(" + ");
}

function orderTone(order: OrderData): MonitoringItemTone {
  const paymentStatus = String(order.paymentStatus ?? "").toUpperCase();
  if (paymentStatus === "FAILED") return "danger";
  if (String(order.adminStatus ?? "").toLowerCase() === "backordered") return "warning";
  if (paymentStatus === "PENDING") return "warning";
  return "info";
}

function shippingTone(order: OrderData): MonitoringItemTone {
  if (String(order.adminStatus ?? "").toLowerCase() === "verified") return "info";
  return "warning";
}

function paymentTone(order: OrderData): MonitoringItemTone {
  return String(order.paymentStatus ?? "").toUpperCase() === "FAILED"
    ? "danger"
    : "warning";
}

function procurementTone(order: PurchaseOrderSummary): MonitoringItemTone {
  return String(order.status).toUpperCase() === "CONFIRMED" ? "warning" : "neutral";
}

function safeStatusLabel(value?: string | null) {
  if (!value) return "Unknown";
  return value.replaceAll("_", " ");
}

async function settle<T>(work: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await work();
  } catch {
    return fallback;
  }
}

export async function getAdminOperationsMonitoring(
  opts: { regionAdminId?: number; regionLocationId?: number } = {},
): Promise<OperationsMonitoringSnapshot> {
  const [
    ordersPhase,
    shippingPhase,
    inventoryMonitoring,
    purchaseOrdersPage,
    replenishmentDraftsPage,
  ] = await Promise.all([
    settle(
      () =>
        getAdminOrdersFlat({
          page: 1,
          limit: MAX_MONITORING_ROWS,
          phase: "orders",
          regionAdminId: opts.regionAdminId,
        }),
      { rows: [], total: 0, page: 1, limit: MAX_MONITORING_ROWS, totalPages: 1 },
    ),
    settle(
      () =>
        getAdminOrdersFlat({
          page: 1,
          limit: MAX_MONITORING_ROWS,
          phase: "shipping",
          regionAdminId: opts.regionAdminId,
        }),
      { rows: [], total: 0, page: 1, limit: MAX_MONITORING_ROWS, totalPages: 1 },
    ),
    settle(
      () => getInventoryMonitoring(opts.regionLocationId),
      { lowStock: [], staleStock: [] } as {
        lowStock: InventoryItemSummary[];
        staleStock: InventoryItemSummary[];
      },
    ),
    settle(
      () =>
        getPaginatedPurchaseOrders({
          page: 1,
          limit: MAX_MONITORING_ROWS,
          regionLocationId: opts.regionLocationId,
        }),
      { rows: [], total: 0, page: 1, limit: MAX_MONITORING_ROWS, totalPages: 1 },
    ),
    settle(
      () =>
        getPaginatedReplenishmentDrafts({
          page: 1,
          limit: MAX_MONITORING_ROWS,
          regionLocationId: opts.regionLocationId,
        }),
      { rows: [], total: 0, page: 1, limit: MAX_MONITORING_ROWS, totalPages: 1 },
    ),
  ]);

  const unresolvedOrders = ordersPhase.rows
    .filter((order) => {
      const adminStatus = String(order.adminStatus ?? "");
      return adminStatus !== "Cancelled" && adminStatus !== "Ready to ship";
    })
    .sort((left, right) => compareDateDesc(left.createdAt, right.createdAt));

  const awaitingDispatch = shippingPhase.rows
    .filter((order) => {
      const adminStatus = String(order.adminStatus ?? "");
      return adminStatus === "Ready to ship" || adminStatus === "Verified";
    })
    .sort((left, right) =>
      compareDateAsc(left.readyToShipAt ?? left.createdAt, right.readyToShipAt ?? right.createdAt),
    );

  const paymentIssues = ordersPhase.rows
    .filter((order) => {
      const paymentStatus = String(order.paymentStatus ?? "").toUpperCase();
      const adminStatus = String(order.adminStatus ?? "");
      return (
        adminStatus !== "Cancelled" &&
        (paymentStatus === "PENDING" || paymentStatus === "FAILED")
      );
    })
    .sort((left, right) => {
      const leftFailed = String(left.paymentStatus ?? "").toUpperCase() === "FAILED";
      const rightFailed = String(right.paymentStatus ?? "").toUpperCase() === "FAILED";
      if (leftFailed !== rightFailed) return Number(rightFailed) - Number(leftFailed);
      return compareDateDesc(left.createdAt, right.createdAt);
    });

  const inventoryMap = new Map<
    number,
    { item: InventoryItemSummary; tags: string[]; tone: MonitoringItemTone }
  >();

  for (const item of inventoryMonitoring.lowStock) {
    inventoryMap.set(item.id, {
      item,
      tags: ["Low stock"],
      tone: "warning",
    });
  }

  for (const item of inventoryMonitoring.staleStock) {
    const existing = inventoryMap.get(item.id);
    if (existing) {
      existing.tags.push("Stale stock");
      continue;
    }

    inventoryMap.set(item.id, {
      item,
      tags: ["Stale stock"],
      tone: "neutral",
    });
  }

  const inventoryIssues = [...inventoryMap.values()].sort((left, right) => {
    if (left.tags.length !== right.tags.length) {
      return right.tags.length - left.tags.length;
    }
    return left.item.name.localeCompare(right.item.name);
  });

  const overduePurchaseOrders = purchaseOrdersPage.rows
    .filter((order) => {
      const status = String(order.status ?? "").toUpperCase();
      return (
        Boolean(order.expectedDeliveryAt) &&
        String(order.expectedDeliveryAt) < todayIso() &&
        status !== "DRAFT" &&
        status !== "RECEIVED" &&
        status !== "CANCELLED"
      );
    })
    .sort((left, right) =>
      compareDateAsc(left.expectedDeliveryAt, right.expectedDeliveryAt),
    );

  const replenishmentDrafts = replenishmentDraftsPage.rows
    .filter((order) => String(order.status ?? "").toUpperCase() === "DRAFT")
    .sort((left, right) => right.id - left.id);

  const failedPaymentCount = paymentIssues.filter(
    (order) => String(order.paymentStatus ?? "").toUpperCase() === "FAILED",
  ).length;

  return {
    updatedAt: new Date().toISOString(),
    summary: [
      {
        key: "orders",
        label: "Orders",
        description: "Pending orders",
        value: unresolvedOrders.length,
        tone: unresolvedOrders.length > 0 ? "warning" : "primary",
      },
      {
        key: "shipping",
        label: "Shipping",
        description: "Awaiting dispatch",
        value: awaitingDispatch.length,
        tone: awaitingDispatch.length > 0 ? "info" : "primary",
      },
      {
        key: "payments",
        label: "Payments",
        description: "Failed / pending",
        value: paymentIssues.length,
        tone:
          paymentIssues.length === 0
            ? "primary"
            : failedPaymentCount > 0
              ? "danger"
              : "warning",
      },
      {
        key: "inventory",
        label: "Inventory",
        description: "Stale / low stock",
        value: inventoryIssues.length,
        tone: inventoryIssues.length > 0 ? "warning" : "primary",
      },
      {
        key: "procurement",
        label: "Procurement",
        description: "Overdue POs",
        value: overduePurchaseOrders.length,
        tone: overduePurchaseOrders.length > 0 ? "warning" : "primary",
      },
    ],
    orders: unresolvedOrders.slice(0, 3).map((order) => ({
      id: String(order.id),
      title: order.referenceId || `Order #${order.id}`,
      subtitle: `${order.franchise?.name ?? order.franchiseId ?? "Unknown franchise"} · ${order.totalItems ?? 0} item${order.totalItems === 1 ? "" : "s"}`,
      status: String(order.adminStatus ?? order.paymentStatus ?? "Pending"),
      tone: orderTone(order),
    })),
    shipping: awaitingDispatch.slice(0, 3).map((order) => ({
      id: String(order.id),
      title: order.referenceId || `Order #${order.id}`,
      subtitle: `${order.franchise?.name ?? order.franchiseId ?? "Unknown franchise"} · ${describeDispatchAge(order.readyToShipAt)}`,
      status:
        String(order.adminStatus ?? "").toLowerCase() === "verified"
          ? "Verified"
          : "Ready",
      tone: shippingTone(order),
    })),
    payments: paymentIssues.slice(0, 3).map((order) => ({
      id: String(order.id),
      title: order.referenceId || `Order #${order.id}`,
      subtitle: `${order.franchise?.name ?? order.franchiseId ?? "Unknown franchise"} · ${describeRecentDate(order.createdAt, "Payment needs attention")}`,
      status:
        String(order.paymentStatus ?? "").toUpperCase() === "FAILED"
          ? "Failed"
          : "Pending",
      tone: paymentTone(order),
    })),
    inventory: inventoryIssues.slice(0, 3).map(({ item, tags, tone }) => ({
      id: String(item.id),
      title: item.name,
      subtitle: `${item.sku} · Available ${item.availableQty} · On hand ${item.onHandQty}`,
      status: formatInventoryStatus(tags),
      tone,
    })),
    overduePurchaseOrders: overduePurchaseOrders.slice(0, 3).map((order) => ({
      id: String(order.id),
      title: order.referenceNo || `PO #${order.id}`,
      subtitle: `${order.supplier?.name ?? "Unknown supplier"} · ${describeExpectedDate(order.expectedDeliveryAt)}`,
      status: safeStatusLabel(order.status),
      tone: procurementTone(order),
    })),
    replenishmentDrafts: replenishmentDrafts.slice(0, 3).map((order) => ({
      id: String(order.id),
      title: order.referenceNo || `Draft #${order.id}`,
      subtitle: `${order.supplier?.name ?? "Awaiting supplier"} · ${order.lines.length} line${order.lines.length === 1 ? "" : "s"}`,
      status: "Draft",
      tone: "neutral",
    })),
  };
}
