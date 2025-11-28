import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/franchisee")) {
    try {
      const apiBase =
        process.env.NEXT_PUBLIC_API_URL ||
        process.env.API_URL ||
        "http://localhost:5000";
      const apiUrl = `${apiBase}/franchisee/isActive`;
      const apiRes = await fetch(apiUrl, {
        method: "GET",
        credentials: "include",
        headers: {
          cookie: req.headers.get("cookie") ?? "",
        },
        cache: "no-store",
      });

      if (!apiRes.ok) {
        return NextResponse.redirect(new URL("/login", req.url));
      }

      const data = await apiRes.json();

      if (data.result === "Approved") {
        // force user to /franchisee/agreement
        if (pathname !== "/franchisee/agreement") {
          return NextResponse.redirect(
            new URL("/franchisee/agreement", req.url)
          );
        }
      } else if (data.result === "Active") {
        return NextResponse.next();
      } else {
        return NextResponse.redirect(new URL("/login", req.url));
      }
    } catch (err) {
      console.error("Middleware error:", err);
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  return NextResponse.next();
}

// Only match /franchisee routes
export const config = {
  matcher: ["/franchisee", "/franchisee/:path*"],
};
