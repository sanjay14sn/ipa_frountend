"use client";

import { LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationBell } from "@/components/shared/notification-bell";
import { useUser } from "@/context/user-context";
import { useCIAuth } from "@/context/ci-auth-context";
import { getUserFromStorage } from "@/lib/auth";
import { usePathname, useRouter } from "next/navigation";
import { franchiseeLogout, logout } from "@/services/auth.service";
import { logoutCI } from "@/services/ci-auth.service";

function headerEmail(user: ReturnType<typeof useUser>["user"]): string {
  if (!user) return "";
  if (typeof user === "object" && "email" in user) {
    const v = (user as { email?: string }).email;
    if (v) return v;
  }
  return user.profile?.mail ?? user.mail ?? "";
}

export function PortalHeaderActions() {
  const { user } = useUser();
  const { user: ciUser, clear: clearCI } = useCIAuth();
  const router = useRouter();
  const pathname = usePathname();
  const storedUser = getUserFromStorage();
  const currentUser = user ?? storedUser;
  const isCiPortal = pathname.startsWith("/ci");
  const isAdminPortal =
    currentUser?.role === "admin" || pathname.startsWith("/admin");
  const isPortalRoute = isAdminPortal || pathname.startsWith("/franchisee") || isCiPortal;

  const handleLogout = async () => {
    try {
      if (isCiPortal) {
        await logoutCI();
        clearCI();
      } else if (isAdminPortal) {
        await logout();
      } else {
        await franchiseeLogout();
      }
    } catch (e) {
      console.error(e);
    }
    localStorage.removeItem("user");
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

  return (
    <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
      <NotificationBell />
      {isPortalRoute && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 text-primary hover:bg-accent hover:text-accent-foreground"
            >
              <User className="h-4 w-4" />
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
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
