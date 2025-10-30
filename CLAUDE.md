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
- **Data Fetching**: Axios with SWR for some endpoints
- **Forms**: React Hook Form + Zod validation
- **Real-time**: Socket.io for notifications

### Backend Integration
- **Base API URL**: `http://localhost:5000` (hardcoded in service files)
- **Authentication**: Cookie-based with credentials
- **API Structure**: Separate endpoints for `/admin/*` and `/franchisee/*`

### Role-Based Architecture

The application has **completely separate routing and functionality** for two roles:

1. **Admin Routes** (`/admin/*`):
   - Dashboard, Franchises, Pending Approvals, CI Approvals, ID Requests, Certificate Requests, CI Training, Payments
   - Layout: `app/admin/layout.tsx`
   - Login: `/admin-login`

2. **Franchisee Routes** (`/franchisee/*`):
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

#### AdminTable Component
`components/shared/AdminTable.tsx` is a **powerful generic table component** used throughout the admin interface:
- Supports search, filtering (single-select and multi-select), sorting, pagination
- Built-in expandable rows for nested details
- Handles loading states with skeleton UI
- Configurable columns with custom render functions
- Controlled externally via props for filters/pagination (server-side filtering pattern)

#### Custom Hooks
- `hooks/usePaginatedData.ts`: Generic hook for server-side paginated data with search, sort, filters
- `hooks/useNotificationSocket.ts`: WebSocket connection for real-time notifications via Socket.io
- `hooks/use-franchisee-profile.ts`, `use-franchises.ts`, etc.: SWR-based data fetching hooks

#### Context Providers
Root layout wraps app in two providers:
1. `UserProvider` - manages current user state and localStorage sync
2. `NotificationProvider` - manages real-time notifications via WebSocket

### UI Component Library
Uses shadcn/ui components from `components/ui/`:
- All components follow Radix UI patterns
- Styled with Tailwind using custom brand colors
- Custom utilities for scrollbars (`.scrollbar-green`)

### Custom Shared Components
- `AdminTable.tsx` - Generic data table with filtering/sorting/pagination
- `NestedSection.tsx` - Collapsible nested sections with tree connectors
- `TreeConnector.tsx` - Visual tree connector lines for hierarchical data
- `notification-bell.tsx` - Real-time notification bell with WebSocket integration

## Important Patterns to Follow

### When Adding New Admin Pages
1. Create page in `app/admin/[feature]/page.tsx`
2. Add route to `adminNavigation` in `components/dynamic-sidebar.tsx`
3. Create service functions in `services/[feature].service.ts`
4. Use `AdminTable` component for list views with pagination
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
```typescript
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000",
  withCredentials: true,
});

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
- `eslint.ignoreDuringBuilds: true`
- `typescript.ignoreBuildErrors: true`
- `images.unoptimized: true`

This means TypeScript/ESLint errors won't block builds, but should still be fixed.

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
- `NEXT_PUBLIC_API_URL` - API base URL (default: http://localhost:5000)

## Real-time Notifications

The app uses Socket.io for real-time notifications:
- WebSocket namespace: `/notifications` on port 5000
- Hook: `useNotificationSocket` handles connection and registration
- User registers with `userId` and `userType` on connect
- Notifications appear in `NotificationBell` component

## Data Flow Summary

1. **User logs in** → Auth service sets localStorage → UserContext hydrates
2. **User navigates** → Dynamic sidebar renders role-specific navigation
3. **Page loads** → Custom hook (e.g., `usePaginatedData`) calls service function
4. **Service function** → Makes axios request to backend with credentials
5. **Data returns** → Renders in AdminTable or custom components
6. **Real-time updates** → WebSocket pushes notifications to NotificationBell

## Git Status Note

Recent commits show a major refactor replacing individual shared components (EmptyState, FilterBar, PaginationControls, SearchInput, SortControls, StatusFilter, TableSkeleton) with the unified `AdminTable` component. When working with tables, prefer using `AdminTable` over creating custom implementations.
