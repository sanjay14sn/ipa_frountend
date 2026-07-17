import type { Metadata } from "next";
import { Caveat, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { UserProvider } from "@/context/user-context";
import { NotificationProvider } from "@/context/notification-context";
import QueryProvider from "@/components/providers/query-provider";
import { ClientTelemetryProvider } from "@/components/providers/client-telemetry-provider";
import { PointerEventsGuard } from "@/components/providers/pointer-events-guard";
import { WebVitalsReporter } from "@/components/providers/web-vitals-reporter";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-caveat",
  display: "swap",
});

const SITE_NAME = "IPA Portal — Ideal Play Abacus";
const SITE_DESCRIPTION =
  "Franchise management portal for Abacus education centers";

export const metadata: Metadata = {
  // Absolute base for og:image/og:url — link scrapers (WhatsApp, iMessage,
  // Slack) reject relative URLs.
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://app.playabacusindia.com",
  ),
  title: {
    default: SITE_NAME,
    template: "%s | IPA Portal",
  },
  description: SITE_DESCRIPTION,
  generator: "Next.js",
  // Private portal — no search-engine indexing.
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    siteName: "IPA Portal",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: "/",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "IPA Portal — Ideal Play Abacus franchise management portal",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${jetbrainsMono.variable} ${caveat.variable}`}
    >
      <body>
        <PointerEventsGuard />
        <WebVitalsReporter />
        <ClientTelemetryProvider>
          <QueryProvider>
            <UserProvider>
              <NotificationProvider>
                {children}
                <Toaster
                  position="top-right"
                  toastOptions={{
                    classNames: {
                      toast:
                        "rounded-xl border border-border bg-card text-card-foreground shadow-xl",
                      title: "text-sm font-medium text-card-foreground",
                      description: "text-sm text-muted-foreground",
                      actionButton: "rounded-lg bg-primary text-primary-foreground",
                      cancelButton: "rounded-lg bg-secondary text-secondary-foreground",
                    },
                  }}
                />
              </NotificationProvider>
            </UserProvider>
          </QueryProvider>
        </ClientTelemetryProvider>
      </body>
    </html>
  );
}
