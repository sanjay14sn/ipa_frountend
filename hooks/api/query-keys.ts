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
    lifecycle: (id: number) => ["students", id, "lifecycle"] as const,
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
    idCardSummaries: (params?: Record<string, unknown> | null) =>
      listQueryKey("admin-id-card-summaries", params ?? undefined),
    idCardDetails: (franchiseId: string, params?: Record<string, unknown> | null) =>
      listQueryKey("admin-id-card-details", {
        franchiseId,
        ...(params ?? {}),
      }),
    certSummaries: (params?: Record<string, unknown> | null) =>
      listQueryKey("admin-cert-summaries", params ?? undefined),
    /** Partial invalidation key — hits all admin-cert-summaries variants. */
    certSummariesPrefix: ["admin-cert-summaries", "list"] as const,
    certDetails: (franchiseId: string, params?: Record<string, unknown> | null) =>
      listQueryKey("admin-cert-details", {
        franchiseId,
        ...(params ?? {}),
      }),
    /** Partial invalidation key — hits all admin-cert-details variants. */
    certDetailsPrefix: ["admin-cert-details", "list"] as const,
    /** Certs eligible for dispatch, with filter params. */
    dispatchEligible: (params?: Record<string, unknown> | null) =>
      listQueryKey("dispatch-eligible-certs", params ?? undefined),
    /** Certs eligible for approve-and-dispatch, with filter params. */
    approveAndDispatchEligible: (params?: Record<string, unknown> | null) =>
      listQueryKey("approve-and-dispatch-eligible-certs", params ?? undefined),
    lifecycle: (params?: Record<string, unknown> | null) =>
      listQueryKey("admin-student-lifecycle", params ?? undefined),
    streamCertificates: (params?: Record<string, unknown>) =>
      ["admin-stream-certificates", params] as const,
    studentStreamCertificates: (studentId: number) =>
      ["student-stream-certificates", studentId] as const,
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
    franchiseeSessions: (params?: Record<string, unknown> | null) =>
      listQueryKey("course-instructors", { role: "franchisee-sessions", ...params }),
    /** Per-session waiting-room (unassigned attendees) detail key. */
    waitingSession: (sessionId: number) =>
      ["ci-training-waiting-session", sessionId] as const,
    /** Per-session assigned-attendees detail key. */
    sessionAssignments: (sessionId: number) =>
      ["ci-training-session-assignments", sessionId] as const,
    /** Admin summary view for a list of CIs (refreshed on demand). */
    adminSummary: (params: Record<string, unknown>, refreshKey?: string) =>
      ["course-instructors", "admin", "summary", params, refreshKey ?? ""] as const,
    /** Admin detail view for a specific franchise's CIs. */
    adminDetails: (franchiseId: string | null, params?: Record<string, unknown> | null) =>
      ["course-instructors", "admin", "details", franchiseId, params ?? null] as const,
  },
  franchises: {
    list: (params?: Record<string, unknown> | null) =>
      listQueryKey("franchises", params ?? undefined),
    /** Admin flat list of all franchises. */
    adminAll: (params?: Record<string, unknown> | null) =>
      listQueryKey("franchises-admin", params ?? undefined),
    /** Admin grouped view — franchisees with their franchises. */
    groupedByFranchisee: (params?: Record<string, unknown> | null) =>
      listQueryKey("franchises-grouped", params ?? undefined),
    startingKits: (franchiseId: string) =>
      ["franchises", franchiseId, "starting-kits"] as const,
  },
  agreements: {
    mine: (params?: Record<string, unknown> | null) =>
      listQueryKey("agreements", { scope: "mine", ...params }),
    admin: (params?: Record<string, unknown> | null) =>
      listQueryKey("agreements", { scope: "admin", ...params }),
    detail: (id: number) => ["agreements", "detail", id] as const,
    /** Franchisee switcher feed, scoped by the active franchiseId. */
    switcherMine: (franchiseId?: string | null) =>
      ["agreements", "switcher", "mine", franchiseId ?? null] as const,
    /** Admin switcher feed for a specific franchise. */
    switcherAdmin: (franchiseId: string) =>
      ["agreements", "switcher", "admin", franchiseId] as const,
  },
  orders: {
    /** Full list query key (includes serialized params). */
    franchisee: (params?: Record<string, unknown> | null) =>
      listQueryKey("orders-franchisee", params ?? undefined),
    /** Full list query key (includes serialized params). */
    admin: (params?: Record<string, unknown> | null) =>
      listQueryKey("orders-admin", params ?? undefined),
    /** 2-element partial prefix — use with `invalidateQueries` to bust ALL franchisee order list variants. */
    franchiseeListPrefix: ["orders-franchisee", "list"] as const,
    /** 2-element partial prefix — use with `invalidateQueries` to bust ALL admin order list variants. */
    adminListPrefix: ["orders-admin", "list"] as const,
    /** 2-element partial prefix — use to bust all franchisee order detail queries. */
    franchiseeDetailPrefix: ["orders", "franchisee"] as const,
    /** 2-element partial prefix — use to bust all admin order detail queries. */
    adminDetailPrefix: ["orders", "admin"] as const,
    adminDetail: (id: number) => ["orders", "admin", id] as const,
    franchiseeDetail: (id: number) =>
      ["orders", "franchisee", "detail", id] as const,
    dispatchEligible: (franchiseId: string) =>
      ["orders", "dispatch-eligible", franchiseId] as const,
    /** Custom-order available items (level + kit) for a set of students. */
    availableItems: (studentIds: number[]) =>
      ["orders", "available-items", [...studentIds].sort((a, b) => a - b)] as const,
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
    /** Partial invalidation key — matches all admin-user list variants. */
    listPrefix: ["admin-users", "list"] as const,
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
    /** 2-element partial prefix — use with `invalidateQueries` to bust ALL inventory list variants. */
    listPrefix: ["inventory", "list"] as const,
    detail: (materialId: number) =>
      ["inventory", "detail", materialId] as const,
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
  programRequests: {
    admin: (params?: Record<string, unknown> | null) =>
      listQueryKey("program-requests", { scope: "admin", ...params }),
    franchisee: (params?: Record<string, unknown> | null) =>
      listQueryKey("program-requests", { scope: "franchisee", ...params }),
  },
  auth: {
    franchiseeProfile: (franchiseId?: string) =>
      ["auth", "franchisee-profile", franchiseId ?? ""] as const,
    adminProfile: () => ["auth", "admin-profile"] as const,
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
  certificates: {
    /** Eligible course instructors for a certificate request, keyed by levelIds + programId. */
    eligibleInstructors: (levelIds?: number[], programId?: number) =>
      ["certificates", "eligible-instructors", levelIds ?? null, programId ?? null] as const,
  },
} as const;
