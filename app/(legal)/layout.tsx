import Image from "next/image";
import Link from "next/link";
import {
  COMPANY_LEGAL_NAME,
  CONTACT_EMAIL,
  CONTACT_PHONE,
  LEGAL_PAGES,
  MARKETING_SITE_URL,
} from "@/lib/legal";

/**
 * Chrome for the public legal pages (terms / privacy / refund / cancellation).
 *
 * These routes exist for Razorpay merchant verification and general
 * compliance: they are PUBLIC by design (proxy.ts only gates /admin, /ci and
 * /franchisee prefixes) and must stay reachable without a session.
 */
export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="flex justify-center px-4 pt-10 pb-6">
        <Link href="/" aria-label="Ideal Play Abacus home">
          <Image
            src="/brand/ipa-lockup.png"
            alt="Ideal Play Abacus"
            width={325}
            height={50}
            priority
          />
        </Link>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-10">
          {children}
        </div>
      </main>

      <footer
        data-testid="legal-footer"
        className="mx-auto w-full max-w-3xl px-4 py-8 text-center text-xs text-muted-foreground"
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
          <a
            href={MARKETING_SITE_URL}
            className="hover:text-foreground hover:underline"
          >
            playabacusindia.com
          </a>
        </nav>
        <p className="mt-3">
          {CONTACT_EMAIL} · {CONTACT_PHONE}
        </p>
        <p className="mt-1">
          © {new Date().getFullYear()} {COMPANY_LEGAL_NAME} All rights
          reserved.
        </p>
      </footer>
    </div>
  );
}
