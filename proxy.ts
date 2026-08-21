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
 * Cookie names: one session cookie per realm (`adminSession` /
 * `franchiseeSession` / `ciSession`). Legacy `session` / `auth_token` AND the
 * retired dual-token names (`*AccessToken` / `*RefreshToken`) are deliberately
 * IGNORED here — the backend never validates them, so their presence can never
 * represent a session (honoring stale cookies caused login redirect loops;
 * the backend purges the retired names on every login/logout).
 *
 * STALE SELF-HEAL: sessions have a sliding idle window server-side, so
 * "cookie present, session dead" is a NORMAL state (idle-expired). When the
 * app discovers it (a 401), it redirects here with ?stale=1 — the explicit
 * marker to delete the dead cookie and render the login page. Without it, the
 * presence check below would bounce the visitor straight back into the portal
 * and the browser would loop until the user manually cleared site data (the
 * blank-screen bug). The marker must stay EXPLICIT — deleting cookies on any
 * bare login visit logs real users out on browser-back navigation.
 */

const SESSION_COOKIES = {
  admin: "adminSession",
  franchisee: "franchiseeSession",
  ci: "ciSession",
} as const;

type Realm = keyof typeof SESSION_COOKIES;

/** Login page → the realm whose session it establishes. */
const LOGIN_PAGE_REALM: Record<string, Realm> = {
  "/login": "franchisee",
  "/admin-login": "admin",
  "/ci-login": "ci",
};

function hasAdminAuthCookie(req: NextRequest): boolean {
  return req.cookies.has(SESSION_COOKIES.admin);
}

function hasFranchiseeAuthCookie(req: NextRequest): boolean {
  return req.cookies.has(SESSION_COOKIES.franchisee);
}

function hasCiAuthCookie(req: NextRequest): boolean {
  return req.cookies.has(SESSION_COOKIES.ci);
}

/** Coarse "may have a session" check for protected route prefixes. */
function hasAnyAuthCookie(req: NextRequest): boolean {
  return (
    hasAdminAuthCookie(req) ||
    hasFranchiseeAuthCookie(req) ||
    hasCiAuthCookie(req)
  );
}

function deleteSessionCookie(res: NextResponse, realm: Realm): void {
  const name = SESSION_COOKIES[realm];
  res.cookies.delete(name);
  // Dev sets COOKIE_DOMAIN=localhost; that variant needs an explicit domain match.
  res.cookies.delete({ name, path: "/", domain: "localhost" });
}

/**
 * Admin app lives under `/admin/…` — do not use raw `startsWith("/admin")` because
 * `/admin-login` would match and cause a redirect loop to `/admin-login?next=/admin-login`.
 */
function isProtectedAdminAppPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

/**
 * CI area is under `/ci/…`. The CI login page lives OUTSIDE it at /ci-login
 * (the legacy /ci/login URL 307s there via next.config.mjs redirects, which
 * run before this proxy), so the whole prefix is protected.
 */
function isProtectedCiAppPath(pathname: string): boolean {
  return pathname === "/ci" || pathname.startsWith("/ci/");
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

  // Stale self-heal: a 401 handler sent the visitor here because the session
  // behind a present cookie is dead. Delete it and let the login page render.
  const loginRealm = LOGIN_PAGE_REALM[pathname];
  if (loginRealm && req.nextUrl.searchParams.get("stale") === "1") {
    const res = NextResponse.next();
    deleteSessionCookie(res, loginRealm);
    return res;
  }

  const authenticated = hasAnyAuthCookie(req);

  // Redirect only when the portal that owns the cookie matches this login page —
  // so a franchisee session does not bounce `/admin-login`, and admins can reach it.
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
  if (pathname === "/ci-login") {
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
    const loginUrl = new URL("/ci-login", req.url);
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
