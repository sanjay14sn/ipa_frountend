import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * proxy.ts — Server-side routing gate (Next.js 16 convention).
 *
 * Renamed from middleware.ts per Next.js 16 migration (`middleware` → `proxy`).
 * @see https://nextjs.org/docs/messages/middleware-to-proxy
 *
 * Runs before any HTML is rendered. Inspects the httpOnly session cookie set
 * by the backend and redirects unauthenticated requests to the appropriate
 * login page. This prevents a flash of protected UI content and reduces the
 * number of round-trips needed to discover an expired session.
 *
 * SECURITY NOTE (CVE-2025-29927): proxy.ts is a "soft" UX gate only — it
 * checks cookie *presence*, not signature validity. Every layout and Route
 * Handler must still verify the session server-side. If the backend rejects
 * the cookie the existing client-side auth checks handle the redirect.
 * @see https://nextjs.org/docs/app/getting-started/proxy
 *
 * Cookie names (ipa-new): admin + franchisee + course-instructor use JWT pair
 * cookies (`*AccessToken` / `*RefreshToken`). Legacy `session` / `auth_token`
 * names are deliberately IGNORED here — the backend never validates them, so
 * their presence can never represent a session. Honoring them caused stale
 * legacy cookies to bounce visitors off /login in a loop (backend clears the
 * legacy names on login/logout as a separate workstream).
 */

function hasAdminAuthCookie(req: NextRequest): boolean {
  return (
    req.cookies.has("adminAccessToken") || req.cookies.has("adminRefreshToken")
  );
}

function hasFranchiseeAuthCookie(req: NextRequest): boolean {
  return (
    req.cookies.has("franchiseeAccessToken") ||
    req.cookies.has("franchiseeRefreshToken")
  );
}

function hasCiAuthCookie(req: NextRequest): boolean {
  return (
    req.cookies.has("courseInstructorAccessToken") ||
    req.cookies.has("courseInstructorRefreshToken")
  );
}

/** Coarse "may have a session" check for protected route prefixes. */
function hasAnyAuthCookie(req: NextRequest): boolean {
  return (
    hasAdminAuthCookie(req) ||
    hasFranchiseeAuthCookie(req) ||
    hasCiAuthCookie(req)
  );
}

/**
 * Admin app lives under `/admin/…` — do not use raw `startsWith("/admin")` because
 * `/admin-login` would match and cause a redirect loop to `/admin-login?next=/admin-login`.
 */
function isProtectedAdminAppPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

/**
 * CI area is under `/ci/…` but `/ci/login` is the auth page — exclude it so
 * unauthenticated visitors are not bounced in a loop.
 */
function isProtectedCiAppPath(pathname: string): boolean {
  return (
    (pathname === "/ci" || pathname.startsWith("/ci/")) &&
    !pathname.startsWith("/ci/login")
  );
}

/** Routes that require a logged-in session, mapped to their login redirect. */
const PROTECTED_PREFIXES: { prefix: string; loginPath: string }[] = [
  { prefix: "/franchisee", loginPath: "/login" },
];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public assets and API routes skip auth entirely.
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname === "/robots.txt"
  ) {
    return NextResponse.next();
  }

  const authenticated = hasAnyAuthCookie(req);

  // Redirect only when the portal that owns the cookie matches this login page —
  // so franchisee JWT does not bounce `/admin-login`, and admins can reach it.
  if (pathname === "/login") {
    if (hasFranchiseeAuthCookie(req)) {
      return NextResponse.redirect(new URL("/franchisee/dashboard", req.url));
    }
    if (hasAdminAuthCookie(req)) {
      return NextResponse.redirect(new URL("/admin/dashboard", req.url));
    }
    if (hasCiAuthCookie(req)) {
      return NextResponse.redirect(new URL("/ci/dashboard", req.url));
    }
  }
  if (pathname === "/admin-login") {
    if (hasAdminAuthCookie(req)) {
      return NextResponse.redirect(new URL("/admin/dashboard", req.url));
    }
  }
  if (pathname === "/ci/login") {
    if (hasCiAuthCookie(req)) {
      return NextResponse.redirect(new URL("/ci/dashboard", req.url));
    }
  }

  // Gate protected routes.
  if (!authenticated && isProtectedAdminAppPath(pathname)) {
    const loginUrl = new URL("/admin-login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }
  if (!authenticated && isProtectedCiAppPath(pathname)) {
    const loginUrl = new URL("/ci/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  for (const { prefix, loginPath } of PROTECTED_PREFIXES) {
    if (pathname.startsWith(prefix) && !authenticated) {
      const loginUrl = new URL(loginPath, req.url);
      // Preserve the intended destination so the login page can redirect back.
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, robots.txt
     * - Static asset file extensions (svg, png, jpg, …, css, js, fonts)
     *
     * Excluding these here avoids waking the middleware for assets that
     * NextResponse.next() immediately anyway, which reduces dev-mode
     * compilation overhead and narrows the window before login pages hydrate.
     */
    "/((?!api|_next/static|_next/image|favicon\\.ico|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?|ttf|map)$).*)",
  ],
};
