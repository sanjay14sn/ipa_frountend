"use client";

import { LogOut, Settings } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationBell } from "@/components/layout/notification-bell";
import { TourHelpButton } from "@/components/layout/tour-help-button";
import { useUser } from "@/context/user-context";
import { useCIAuth } from "@/context/ci-auth-context";
import { getUserFromStorage } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { franchiseeLogout, logout } from "@/services/auth.service";
import { logoutCI } from "@/services/ci-auth.service";
import { markLogoutStart, markLogoutEnd } from "@/lib/axios";
import { sendClientLog } from "@/lib/client-telemetry";

function headerEmail(user: ReturnType<typeof useUser>["user"]): string {
  if (!user) return "";
  if (typeof user === "object" && "email" in user) {
    const v = (user as { email?: string }).email;
    if (v) return v;
  }
  return user.profile?.mail ?? user.mail ?? "";
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export interface PortalHeaderActionsProps {
  portal: "admin" | "franchisee" | "ci";
  /** Overrides the default per-portal "Profile & settings" target. */
  profileHref?: string;
}

const DEFAULT_PROFILE_HREF: Record<
  PortalHeaderActionsProps["portal"],
  string | null
> = {
  admin: "/admin/profile",
  franchisee: "/franchisee/profile",
  ci: null,
};

export function PortalHeaderActions({
  portal,
  profileHref,
}: PortalHeaderActionsProps) {
  const { user, clearUser } = useUser();
  const { user: ciUser, clear: clearCI } = useCIAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const storedUser = getUserFromStorage();
  const currentUser = user ?? storedUser;
  const isCiPortal = portal === "ci";
  const isAdminPortal = portal === "admin";

  const handleLogout = async () => {
    // Cancel all in-flight React Query fetches before sending the logout
    // request. Any already-in-flight requests returning 401 while the logout
    // is in progress would otherwise trigger the refresh cycle, which fires
    // an inner logout that can race with and cancel the outer one.
    queryClient.cancelQueries();

    // Tell the refresh interceptor not to start a new refresh cycle while
    // the logout is in-flight. Any 401 that arrives after this point (from
    // queries re-triggered after the cancel) is silently rejected instead of
    // kicking off a refresh → inner logout that competes with ours.
    markLogoutStart();
    try {
      if (isCiPortal) {
        await logoutCI();
      } else if (isAdminPortal) {
        await logout();
      } else {
        await franchiseeLogout();
      }
    } catch (e) {
      sendClientLog({ level: "error", event: "logout-error", message: "Error during logout", context: { error: e } });
    } finally {
      markLogoutEnd();
      // Clear local state AFTER the server responds. Clearing before the
      // await causes layout auth guards (useEffect: if (!user) router.replace)
      // to fire mid-flight — proxy still sees the HttpOnly cookie and
      // redirects back to the dashboard, canceling the logout and leaving
      // cookies intact.
      clearUser();
      queryClient.clear();
      if (isCiPortal) clearCI();
    }

    // Navigate after the server has cleared the session cookies so the
    // proxy middleware allows the login page through.
    if (isCiPortal) {
      router.push("/ci/login");
    } else if (isAdminPortal) {
      router.push("/admin-login");
    } else {
      router.push("/login");
    }
  };

  const email = isCiPortal
    ? ciUser?.email ?? ciUser?.phone ?? "Course Instructor"
    : headerEmail(currentUser);
  const displayName = isCiPortal
    ? ciUser?.name ?? "Course Instructor"
    : currentUser?.name ?? (isAdminPortal ? "Admin" : "User");
  const resolvedProfileHref = profileHref ?? DEFAULT_PROFILE_HREF[portal];

  return (
    <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
      <TourHelpButton portal={portal} />
      <NotificationBell />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-full"
            data-testid="user-menu-trigger"
            data-tour="header-profile"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
              {initialsOf(displayName)}
            </span>
            <span className="sr-only">Open profile menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium leading-none">
                {displayName}
              </p>
              <p className="break-all text-xs leading-none text-muted-foreground">
                {email || (isAdminPortal ? "Administrator" : isCiPortal ? "Course Instructor" : "Signed in")}
              </p>
              {isCiPortal && ciUser?.instructorCode ? (
                <p className="truncate text-xs leading-none text-muted-foreground">
                  {ciUser.instructorCode}
                </p>
              ) : null}
              {currentUser?.role === "franchisee" &&
              currentUser.franchiseName ? (
                <p className="truncate text-xs leading-none text-muted-foreground">
                  {currentUser.franchiseName}
                </p>
              ) : null}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {resolvedProfileHref ? (
            <DropdownMenuItem asChild>
              <Link href={resolvedProfileHref}>
                <Settings className="mr-2 h-4 w-4" />
                Profile &amp; settings
              </Link>
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
