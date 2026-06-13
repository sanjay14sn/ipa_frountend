# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **Abacus Portal** - a Next.js 15 franchise management portal for Abacus education centers. The application supports two distinct user roles: **Admin** and **Franchisee**, each with role-specific dashboards and workflows.

## Development Commands

```bash
# Development
npm run dev              # Start development server on http://localhost:3000

# Build and Production
npm run build            # Create production build
npm run start            # Start production server

# Linting
npm run lint             # Run ESLint checks
```

## Architecture Overview

### Framework & Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom brand colors (green: #064e3b, white: #fafafa)
- **UI Components**: shadcn/ui (Radix UI primitives)
- **State Management**: React Context API (UserContext, NotificationContext)
- **Data Fetching**: Axios with React Query (TanStack Query v5)
- **Forms**: React Hook Form + Zod validation
- **Real-time**: SSE (Server-Sent Events / EventSource) for notifications

### Backend Integration

- **Base API URL**: configured via `NEXT_PUBLIC_API_URL` env var (default dev: `http://localhost:5500`). Validated at startup by `lib/config.ts`.
- **Authentication**: Cookie-based with credentials
- **API Structure**: Separate endpoints for `/admin/`* and `/franchisee/*`

### Role-Based Architecture

The application has **completely separate routing and functionality** for two roles:

1. **Admin Routes** (`/admin/`*):
  - Dashboard, Franchises, Pending Approvals, CI Approvals, ID Requests, Certificate Requests, CI Training, Payments
  - Layout: `app/admin/layout.tsx`
  - Login: `/admin-login`
2. **Franchisee Routes** (`/franchisee/`*):
  - Dashboard, Students, Course Instructors, Orders, Contests, Certificate Requests
  - Layout: `app/franchisee/layout.tsx`
  - Login: `/login`
  - Special onboarding flow: Pending franchisees see restricted navigation and must complete agreement at `/franchisee/agreement`

### Key Architectural Patterns

#### Dynamic Sidebar System

`components/dynamic-sidebar.tsx` contains the main navigation logic:

- Renders different menu items based on `user.role` from UserContext
- For franchisees with `franchiseStatus !== "Active"`, shows limited "onboarding" navigation
- Uses shadcn Sidebar components with active state highlighting
- Shows logout handlers specific to each role

#### Authentication Flow

Authentication is stored in `localStorage` with the key `"user"`:

```typescript
// Structure stored in localStorage
{
  id: string | number,
  name: string,
  role: "admin" | "franchisee",
  franchiseId?: number,
  franchiseName?: string,
  franchiseStatus?: string,  // "Active" | "Pending"
  profile?: { /* full profile data */ }
}
```

- Admin login: `services/auth.service.ts::login()`
- Franchisee login: `services/auth.service.ts::franchiseeLogin()`
- UserContext hydrates from localStorage on mount

#### Service Layer Pattern

All API calls are in `services/*.service.ts` files:

- Each service file exports functions that call axios
- All services use axios instance with `withCredentials: true` and base URL `http://localhost:5000`
- Services include: auth, franchise, course-instructor, student, notification, payment, program, level, inventory, order

#### DataTable (global list table)

`components/shared/data-table.tsx` (`DataTable`) is the **shared list table** used across admin and franchisee list pages:

- Supports search, filtering (single-select and multi-select), sorting, pagination
- Built-in expandable rows for nested details
- Handles loading states with skeleton UI
- Configurable columns with custom render functions
- Controlled externally via props for filters/pagination (server-side filtering pattern)

#### Custom Hooks

- `hooks/usePaginatedData.ts`: Generic hook for server-side paginated data with search, sort, filters
- `hooks/use-notification-sse.ts`: SSE (EventSource) connection for real-time notifications (see `useNotificationSse`)
- `hooks/use-franchisee-profile.ts`, `use-franchises.ts`, etc.: SWR-based data fetching hooks

#### Context Providers

Root layout wraps app in two providers:

1. `UserProvider` - manages current user state and localStorage sync
2. `NotificationProvider` - manages real-time notifications via SSE (EventSource)

### UI Component Library

Uses shadcn/ui components from `components/ui/`:

- All components follow Radix UI patterns
- Styled with Tailwind using custom brand colors
- Custom utilities for scrollbars (`.scrollbar-green`)

### Custom Shared Components

- `data-table.tsx` (`DataTable`) - Generic data table with filtering/sorting/pagination
- `NestedSection.tsx` - Collapsible nested sections with tree connectors
- `TreeConnector.tsx` - Visual tree connector lines for hierarchical data
- `notification-bell.tsx` - Real-time notification bell with SSE integration

### Dialog Wrappers

Three wrappers in `components/shared/dialog/` cover all dialog use-cases. Pick the correct one:

| Wrapper | When to use |
|---------|-------------|
| `AppDialog` | Default for any dialog with a single "page" of content. Pass a single `<AppDialogBody>` child. |
| `MultiStepDialog` | Multi-step forms with 3+ distinct steps. Takes a `steps: StepDef[]` prop, a `currentStep` index, and navigation callbacks. All step bodies share a single React Hook Form context defined in the parent. |
| Raw Radix `Dialog` | **Avoid for business logic.** Only acceptable for very thin UI wrappers where the standard header/footer layout doesn't apply (e.g., full-screen previews). |

**Never use raw Radix `Dialog` for forms or multi-step flows** — it bypasses the standard header/footer layout and focus management provided by `AppDialog`.

Step definitions belong in `lib/constants/education.ts` (`STUDENT_FORM_STEPS`, `CI_FORM_STEPS`, `FRANCHISE_FORM_STEPS`) to avoid duplicate `StepDef[]` arrays in component files.

## Important Patterns to Follow

### When Adding New Admin Pages

1. Create page in `app/admin/[feature]/page.tsx`
2. Add route to `adminNavigation` in `components/dynamic-sidebar.tsx`
3. Create service functions in `services/[feature].service.ts`
4. Use `DataTable` from `@/components/shared` for list views with pagination
5. Use `usePaginatedData` hook for data fetching if applicable

### When Adding New Franchisee Pages

1. Create page in `app/franchisee/[feature]/page.tsx`
2. Add route to `franchiseNavigation` in `components/dynamic-sidebar.tsx`
3. Consider franchisee's `franchiseStatus` - should pending franchisees access this?
4. Create service functions in `services/[feature].service.ts`

### Form Handling

Always use React Hook Form + Zod:

```typescript
const form = useForm<FormSchema>({
  resolver: zodResolver(schema),
  defaultValues: { ... }
});
```

### API Service Pattern

All services import the shared `api` instance from `lib/axios.ts` — **do not create new axios instances**. The base URL comes from `lib/config.ts` → `NEXT_PUBLIC_API_URL`.

```typescript
import { api } from "@/lib/axios";

export async function someAction(params) {
  const response = await api.post("/endpoint", params);
  return response.data;
}
```

### Color Usage

- Primary brand green: `#064e3b` or `bg-brand-green-500`, `text-primary`
- Background: `#fafafa` or `bg-background`
- Use consistent Tailwind classes: `hover:bg-accent`, `text-sidebar-foreground`

## Known Configuration Details

### Build Configuration

`next.config.mjs` has:

- `images.unoptimized: true` (swap `<img>` → `<Image>` + set to `false` when LCP images need optimization)
- TypeScript and ESLint errors **do** block builds — fix them before committing.

### Path Aliases

TypeScript paths configured in `tsconfig.json`:

```json
"paths": {
  "@/*": ["./*"]
}
```

Always use `@/` imports for project files.

### Environment Variables

See `.env.local.example`:

- `NEXT_PUBLIC_RAZORPAY_KEY_ID` - Razorpay integration
- `NEXT_PUBLIC_API_URL` - API base URL (default dev: [http://localhost:5500](http://localhost:5500)). **Required in production.**
- `NEXT_PUBLIC_CLIENT_TELEMETRY_ENABLED` - set to `true` in production to enable client-side error logging

Run `node scripts/check-env.mjs` before building to validate all required vars are set. In CI, add this step after `npm ci` and before `next build`.

### Package manager

This project uses **npm**. The lockfile is `package-lock.json`. Do not run `pnpm install` or `bun install` — use `npm install`. The dev server is started with `npm run dev` (runs `next dev`).

## Real-time Notifications

The app uses SSE (Server-Sent Events / EventSource) for real-time notifications:

- Admin stream endpoint: `/admin/notification/stream`
- Franchisee stream endpoint: `/notification/stream`
- Hook: `useNotificationSse` (`hooks/use-notification-sse.ts`) handles connection, reconnect capping (max 5 retries), and `isHardDisconnected` state
- Notifications are pushed to `NotificationBell` component via `NotificationContext`

## Data Flow Summary

1. **User logs in** → Auth service sets localStorage → UserContext hydrates
2. **User navigates** → Dynamic sidebar renders role-specific navigation
3. **Page loads** → Custom hook (e.g., `usePaginatedData`) calls service function
4. **Service function** → Makes axios request to backend with credentials
5. **Data returns** → Renders in `DataTable` or custom components
6. **Real-time updates** → SSE (EventSource) pushes notifications to NotificationBell

## Git Status Note

List pages use the unified `DataTable` component (`components/shared/data-table.tsx`). When working with data grids, prefer `DataTable` from `@/components/shared` over one-off `<Table>` layouts.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **Abacus** (7836 symbols, 16386 relationships, 284 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/Abacus/context` | Codebase overview, check index freshness |
| `gitnexus://repo/Abacus/clusters` | All functional areas |
| `gitnexus://repo/Abacus/processes` | All execution flows |
| `gitnexus://repo/Abacus/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
