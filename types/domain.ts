/**
 * types/domain.ts — Canonical re-exports for core domain types.
 *
 * Import your domain models from here rather than from individual service or
 * lib files. Service-specific DTOs (create/update payloads, paginated
 * responses) stay near their services — only the core entity shapes
 * that appear across multiple features belong here.
 *
 * Adding a type here does NOT move or rename it — the source file is still
 * the canonical definition. This file is purely a discovery aid.
 */

// ─── User ──────────────────────────────────────────────────────────────────
// The currently-authenticated user. Role and franchise scoping included.
export type { User, UserRole } from "@/lib/auth";

// ─── Student ───────────────────────────────────────────────────────────────
// A student row as returned by the student list/detail endpoints.
export type { StudentData as Student } from "@/services/student.service";

// ─── Order ─────────────────────────────────────────────────────────────────
// A franchise order (materials kit, starting kit, etc.).
export type { OrderData as Order } from "@/services/order.service";
export type { OrderAllocationStatus, OrderFulfillmentStatus } from "@/services/order.service";

// ─── Franchise ─────────────────────────────────────────────────────────────
// A franchise row as returned by the franchise list/admin endpoints.
export type { FranchiseListItem as Franchise } from "@/services/franchise.service";
