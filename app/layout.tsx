import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { Fira_Sans } from "next/font/google";
import { UserProvider } from "@/context/user-context";
import { NotificationProvider } from "@/context/notification-context";

const firaSans = Fira_Sans({
  subsets: ["latin"],
  variable: "--font-fira-sans",
  display: "swap",
  weight: ["400", "700"],
});

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
    <html lang="en" className={`${firaSans.variable}`}>
      <body>
        <UserProvider>
          <NotificationProvider>
            {children}
            <Toaster />
          </NotificationProvider>
        </UserProvider>
      </body>
    </html>
  );
}
