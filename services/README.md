# Services Layer

All HTTP interactions with the backend live here. Each file exports plain async functions — no React hooks.

## Conventions

- **Import `api` from `@/lib/axios`** — never create new axios instances. The shared instance handles auth, base URL, and the 401 refresh interceptor.
- **Wrap throws in `ApiError`** — use `import { ApiError } from "@/lib/api/api-error"` for consistent upstream error handling.
- **Unwrap responses with `unwrapData`** — most endpoints return `{ result: ... }`; `lib/unwrap-api.ts` provides helpers to unwrap/normalize paginated results.
- **Strip null params** with `compactRequestParams(params)` before passing to axios `params:` — removes undefined/null keys so they don't pollute the query string.

## File Map

| File | Domain |
|------|--------|
| `auth.service.ts` | Login, logout, token refresh, profile fetch |
| `admin.service.ts` | Admin-user CRUD |
| `franchise.service.ts` | Franchise list, detail, status transitions |
| `franchisee.service.ts` | Franchisee-side profile, agreement, payment |
| `agreement.service.ts` | Agreement records, signatures, receivable plan, schedule-B PDF |
| `student.service.ts` | Student CRUD, progression, ID cards, certificates |
| `student-progression.service.ts` | Student level-up / graduation lifecycle |
| `course-instructor.service.ts` | CI approval, profile, training matrix |
| `ci-auth.service.ts` | CI login/me endpoint |
| `ci-training.service.ts` | CI training packages, sessions, progress |
| `ci-training-admin.service.ts` | Admin-side CI training management |
| `ci-training-franchisee.service.ts` | Franchisee-side CI training views |
| `order.service.ts` | Order creation, status, dispatch, invoice |
| `inventory.service.ts` | Inventory catalog, kit items, stock adjustments |
| `catalog-admin.service.ts` | Admin-only catalog management |
| `payment.service.ts` | Payment initiation, verification, history |
| `procurement.service.ts` | Procurement requests and supplier management |
| `fulfillment.service.ts` | Admin fulfillment queue |
| `program.service.ts` | Program catalog |
| `stream.service.ts` | Stream catalog |
| `stream-transition.service.ts` | Stream transition rules |
| `level.service.ts` | Level catalog |
| `training-level.service.ts` | Training-level catalog |
| `program-request.service.ts` | Franchise program activation requests |
| `notification.service.ts` | Notification CRUD, unread count |
| `dashboard.service.ts` | Dashboard summary data |
| `operations-monitoring.service.ts` | Admin operations monitoring |
| `bulk-import.service.ts` | CSV bulk-import for students and CIs |
| `contracting.service.ts` | Agreement template management |

## Deprecated patterns

- **`(x as any)` casts** in service files are being replaced with typed Zod schemas in `lib/schemas/`. See `lib/schemas/*.schema.ts` for validated response types.
- **`franchise.enums.ts`** contains shared enums (`FranchiseType`, `BloodGroup`, etc.) used across service and component layers.
