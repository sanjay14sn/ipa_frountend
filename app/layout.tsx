import type { Metadata } from "next";
import { Caveat } from "next/font/google";
// Primary + monospace fonts live in ./fonts.css (single source of truth).
// Imported before globals.css so its CSS variables are defined first.
import "./fonts.css";
import "./globals.css";
import { Toaster } from "sonner";
import { UserProvider } from "@/context/user-context";
import { NotificationProvider } from "@/context/notification-context";
import QueryProvider from "@/components/providers/query-provider";
import { ClientTelemetryProvider } from "@/components/providers/client-telemetry-provider";
import { PointerEventsGuard } from "@/components/providers/pointer-events-guard";
import { WebVitalsReporter } from "@/components/providers/web-vitals-reporter";

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-caveat",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Abacus Portal",
    template: "%s | Abacus Portal",
  },
  description: "Franchise management portal for Abacus education centers",
  generator: "Next.js",
  // Private portal — no search-engine indexing.
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={caveat.variable}>
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
