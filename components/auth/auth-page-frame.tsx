import Image from "next/image";
import Link from "next/link";
import { COMPANY_LEGAL_NAME, LEGAL_PAGES } from "@/lib/legal";

export interface AuthPageFrameProps {
  children: React.ReactNode;
}

/**
 * Shared chrome for the login pages: full-page centered column on the app
 * background with the IPA lockup above the card slot. Applied to /login,
 * /admin-login and /ci-login via app/(auth)/layout.tsx.
 *
 * The legal-page links in the footer are a compliance requirement (Razorpay
 * merchant verification checks that the policies are linked from the site's
 * public entry point) — keep them on every login page.
 */
export function AuthPageFrame({ children }: AuthPageFrameProps) {
  return (
    <div
      data-testid="auth-page-frame"
      className="min-h-screen bg-background flex flex-col items-center justify-center p-4 gap-6"
    >
      <Image
        src="/brand/ipa-lockup.png"
        alt="Ideal Play Abacus"
        width={433}
        height={66}
        priority
      />
      {children}
      <footer
        data-testid="auth-legal-footer"
        className="flex flex-col items-center gap-1 text-center text-xs text-muted-foreground"
      >
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          {LEGAL_PAGES.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="hover:text-foreground hover:underline"
            >
              {label}
            </Link>
          ))}
        </nav>
        <p>
          © {new Date().getFullYear()} {COMPANY_LEGAL_NAME} All rights
          reserved.
        </p>
      </footer>
    </div>
  );
}
