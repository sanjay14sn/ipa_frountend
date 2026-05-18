// THIS FILE IS DEAD CODE — Next.js only runs middleware.ts, not proxy.ts.
// This file is never executed. Delete it or rename to middleware.ts with real logic.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * ipa-new has no `/franchisee/isActive`. Franchise-gating is handled client-side.
 * API auth uses httpOnly cookies from ipa-new; with `enableCors({ credentials: true })`
 * the browser sends them on cross-origin XHR when `NEXT_PUBLIC_API_URL` points at the API.
 */
export async function proxy(_req: NextRequest) {
  return NextResponse.next();
}

// Only match /franchisee routes
export const config = {
  matcher: ["/franchisee", "/franchisee/:path*"],
};
