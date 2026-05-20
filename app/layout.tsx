import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { UserProvider } from "@/context/user-context";
import { AgreementProvider } from "@/context/agreement-context";
import { NotificationProvider } from "@/context/notification-context";
import QueryProvider from "@/components/providers/query-provider";
import { ClientTelemetryProvider } from "@/components/providers/client-telemetry-provider";
import { PointerEventsGuard } from "@/components/providers/pointer-events-guard";

export const metadata: Metadata = {
  title: "Abacus Portal",
  description: "Franchise management portal for Abacus education centers",
  generator: "Next.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      style={
        {
          "--font-fira-sans":
            "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
        } as React.CSSProperties
      }
    >
      <body>
        <PointerEventsGuard />
        <ClientTelemetryProvider>
          <QueryProvider>
            <UserProvider>
              <AgreementProvider>
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
              </AgreementProvider>
            </UserProvider>
          </QueryProvider>
        </ClientTelemetryProvider>
      </body>
    </html>
  );
}
