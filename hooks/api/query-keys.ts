import { listQueryKey } from "@/lib/query-key-serializer";

/**
 * Invalidation convention:
 * - List queries: key shape `[scope, "list", serializedParams]` from `listQueryKey(scope, params)`.
 *   Invalidate all variants: `invalidateQueries({ queryKey: [scope, "list"] })`.
 * - Detail queries: `*.detail(id)` — invalidate that key or prefix `["students", id]` etc.
 * - Avoid blanket `["students"]` when only one list variant changed if you can target `["students", "list"]`.
 */

export const queryKeys = {
  students: {
    /** Partial: `["students", "list"]` invalidates all paginated/filtered student lists. */
    list: (params?: Record<string, unknown> | null) =>
      listQueryKey("students", params ?? undefined),
    all: ["students"] as const,
    detail: (id: number) => ["students", id] as const,
  },
  studentAdmin: {
    requestedIds: ["students", "requested-ids"] as const,
    issuedIds: ["students", "issued-ids"] as const,
    requestedCerts: ["students", "requested-certs"] as const,
    issuedCerts: ["students", "issued-certs"] as const,
    eligible: ["students", "eligible"] as const,
    adminCertRequests: (params?: Record<string, unknown> | null) =>
      [...listQueryKey("certification", params), "admin-requests"] as const,
    franchiseeCerts: (params?: Record<string, unknown> | null) =>
      [...listQueryKey("certification", params), "franchisee"] as const,
  },
  courseInstructors: {
    franchisee: (params?: Record<string, unknown> | null) =>
      listQueryKey("course-instructors", { role: "franchisee", ...params }),
    admin: (params?: Record<string, unknown> | null) =>
      listQueryKey("course-instructors", { role: "admin", ...params }),
    adminByStatus: (params?: Record<string, unknown> | null) =>
      listQueryKey("course-instructors", { role: "admin-status", ...params }),
    ciTraining: ["course-instructors", "ci-training"] as const,
    trainingList: ["course-instructors", "training-list"] as const,
  },
  franchises: {
    list: (params?: Record<string, unknown> | null) =>
      listQueryKey("franchises", params ?? undefined),
    startingKits: (franchiseId: string) =>
      ["franchises", franchiseId, "starting-kits"] as const,
  },
  agreements: {
    mine: (params?: Record<string, unknown> | null) =>
      listQueryKey("agreements", { scope: "mine", ...params }),
    admin: (params?: Record<string, unknown> | null) =>
      listQueryKey("agreements", { scope: "admin", ...params }),
    detail: (id: number) => ["agreements", "detail", id] as const,
  },
  orders: {
    /** Invalidate all franchisee order lists: `["orders-franchisee", "list"]`. */
    franchisee: (params?: Record<string, unknown> | null) =>
      listQueryKey("orders-franchisee", params ?? undefined),
    /** Invalidate all admin order lists: `["orders-admin", "list"]`. */
    admin: (params?: Record<string, unknown> | null) =>
      listQueryKey("orders-admin", params ?? undefined),
    adminDetail: (id: number) => ["orders", "admin", id] as const,
    franchiseeDetail: (id: number) =>
      ["orders", "franchisee", "detail", id] as const,
  },
  programs: {
    all: ["programs"] as const,
  },
  notifications: {
    franchisee: (params?: Record<string, unknown> | null) =>
      listQueryKey("notifications", { scope: "franchisee", ...params }),
    admin: (params?: Record<string, unknown> | null) =>
      listQueryKey("notifications", { scope: "admin", ...params }),
    unreadFranchisee: ["notifications", "unread", "franchisee"] as const,
    unreadAdmin: ["notifications", "unread", "admin"] as const,
  },
  admin: {
    dashboard: ["admin", "dashboard"] as const,
    list: (params?: Record<string, unknown> | null) =>
      listQueryKey("admin-users", params ?? undefined),
    detail: (id: number) => ["admin", "detail", id] as const,
  },
  franchisee: {
    dashboard: ["franchisee", "dashboard"] as const,
  },
  levels: {
    all: ["levels", "all"] as const,
    byProgram: (programId: number) =>
      ["levels", "program", programId] as const,
    byStream: (streamId: number) => ["levels", "stream", streamId] as const,
  },
  streams: {
    all: ["streams", "all"] as const,
    byProgram: (programId: number) =>
      ["streams", "program", programId] as const,
    transitionsByProgram: (programId: number) =>
      ["streams", "transitions", "program", programId] as const,
  },
  trainingLevels: {
    byProgram: (programId: number) =>
      ["training-levels", "program", programId] as const,
  },
  procurement: {
    suppliers: (params?: Record<string, unknown> | null) =>
      listQueryKey("procurement", { resource: "suppliers", ...params }),
    supplierTerms: (params?: Record<string, unknown> | null) =>
      listQueryKey("procurement", { resource: "supplier-terms", ...params }),
    purchaseOrders: (params?: Record<string, unknown> | null) =>
      listQueryKey("procurement", { resource: "purchase-orders", ...params }),
    purchaseReceipts: (params?: Record<string, unknown> | null) =>
      listQueryKey("procurement", { resource: "purchase-receipts", ...params }),
    replenishmentDrafts: (params?: Record<string, unknown> | null) =>
      listQueryKey("procurement", {
        resource: "replenishment-drafts",
        ...params,
      }),
    supplierOrders: (params?: Record<string, unknown> | null) =>
      listQueryKey("procurement", { resource: "supplier-orders", ...params }),
  },
  payments: {
    adminPaginated: (params?: Record<string, unknown> | null) =>
      listQueryKey("payments", { scope: "admin", ...params }),
    adminSummaries: (params?: Record<string, unknown> | null) =>
      listQueryKey("payments", { scope: "admin-summaries", ...params }),
    franchisePayments: (franchiseId: string, params?: Record<string, unknown> | null) =>
      listQueryKey("payments", { scope: "franchise", franchiseId, ...params }),
  },
  operations: {
    monitoring: ["operations", "monitoring"] as const,
  },
  /** Admin inventory catalog (paginated). Partial invalidate: `['inventory', 'list']`. */
  inventory: {
    adminList: (params?: Record<string, unknown> | null) =>
      listQueryKey("inventory", params ?? undefined),
    all: ["inventory", "all"] as const,
    kitCatalog: ["inventory", "kit-catalog"] as const,
    programKitItems: (programId: number) =>
      ["inventory", "program-kit-items", programId] as const,
    levelItems: (levelId: number) => ["inventory", "level-items", levelId] as const,
    trainingLevelItems: (trainingLevelId: number) =>
      ["inventory", "training-level-items", trainingLevelId] as const,
    monitoring: ["inventory", "monitoring"] as const,
  },
  fulfillment: {
    shipments: (params?: Record<string, unknown> | null) =>
      listQueryKey("shipments", params ?? undefined),
  },
  auth: {
    franchiseeProfile: (franchiseId?: string) =>
      ["auth", "franchisee-profile", franchiseId ?? ""] as const,
  },
  franchiseApplications: {
    list: (params?: Record<string, unknown> | null) =>
      listQueryKey("franchise-applications", params ?? undefined),
    pending: (params?: Record<string, unknown> | null) =>
      listQueryKey("franchise-applications", {
        scope: "pending-only",
        ...params,
      }),
  },
} as const;
