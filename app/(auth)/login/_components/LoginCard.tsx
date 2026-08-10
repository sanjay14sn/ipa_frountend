"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useHydrated } from "@/hooks/use-hydrated";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  franchiseeLogin,
  getFranchiseeProfile,
} from "@/services/auth.service";
import { getFranchiseList } from "@/services/franchise.service";
import { useUser } from "@/context/user-context";
import { getErrorMessage, getUserFriendlyMessage } from "@/lib/error-utils";
import { isFranchiseOperational, type User } from "@/lib/auth";
import { safeInternalPath } from "@/lib/url-utils";
import { sendClientLog } from "@/lib/client-telemetry";

export function LoginCard({
  onStartApplication,
}: {
  onStartApplication: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useUser();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const hydrated = useHydrated();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const loginResult = await franchiseeLogin(
        username.trim(),
        password.trim(),
      );
      if (loginResult.role !== "franchisee") {
        setError("This portal is for franchisees only.");
        setLoading(false);
        return;
      }

      let profileData: Record<string, unknown> | null = null;
      try {
        const profileResponse = await getFranchiseeProfile();
        if (profileResponse?.result) {
          profileData = profileResponse.result as Record<string, unknown>;
        }
      } catch (profileError) {
        sendClientLog({ level: "warn", event: "login-profile-fetch-error", message: "Failed to fetch franchisee profile after login", context: { error: profileError } });
      }

      // The me response carries the switcher list; the dedicated list
      // endpoint is only the fallback when the profile fetch failed (or an
      // older backend omits the field). A logged-in franchisee always owns at
      // least one franchise, so an empty list means "field missing".
      let franchises: Array<{
        id: string;
        name: string;
        type?: string;
        status: string;
      }> = (
        (profileData as {
          franchises?: Array<{ id: string; name: string; status: string }>;
        } | null)?.franchises ?? []
      ).map((f) => ({ id: String(f.id), name: f.name, status: f.status }));
      if (franchises.length === 0) {
        franchises = (await getFranchiseList()).map((f) => ({
          id: f.id,
          name: f.name,
          type: f.type,
          status: f.status,
        }));
      }
      const current = franchises.find(
        (f) => f.id === loginResult.franchiseId,
      );

      const profile = profileData
        ? {
            ...profileData,
            city:
              (profileData as { franchise?: { city?: string }; city?: string })
                .franchise?.city ?? profileData.city,
            state:
              (profileData as { franchise?: { state?: string }; state?: string })
                .franchise?.state ?? profileData.state,
            pincode:
              (profileData as {
                franchise?: { pincode?: string };
                pincode?: string;
              }).franchise?.pincode ?? profileData.pincode,
            address:
              (profileData as {
                franchise?: { address?: string };
                address?: string;
              }).franchise?.address ?? profileData.address,
            franchise:
              (profileData as { franchise?: unknown }).franchise ??
              (current
                ? {
                    id: current.id,
                    name: current.name,
                    type: current.type,
                    status: current.status,
                  }
                : undefined),
          }
        : current
          ? {
              franchise: {
                id: current.id,
                name: current.name,
                type: current.type,
                status: current.status,
              },
            }
          : undefined;

      const nextUser = {
        id: String(loginResult.franchiseeId),
        name:
          (typeof profileData?.name === "string" && profileData.name) ||
          username.trim(),
        role: "franchisee",
        franchiseStatus:
          current?.status ??
          (profile as User["profile"] | undefined)?.franchise?.status,
        isOperational:
          (profile as User["profile"] | undefined)?.franchise?.isOperational ??
          ((profile as User["profile"] | undefined)?.franchise
            ?.validAgreementsCount ?? 0) > 0,
        franchiseId: loginResult.franchiseId,
        franchiseName:
          current?.name ??
          (profile as User["profile"] | undefined)?.franchise?.name,
        franchises,
        profile: profile as User["profile"],
      } as User;

      setUser(nextUser);
      // `?next=` (set by the proxy when bouncing a protected path) only
      // overrides the operational destination — pre-active franchisees still
      // funnel to the agreement page.
      const nextPath = safeInternalPath(searchParams.get("next"), "/franchisee");
      router.push(
        isFranchiseOperational(nextUser, loginResult.franchiseId)
          ? nextPath ?? "/franchisee/dashboard"
          : `/franchisee/agreement?franchiseId=${loginResult.franchiseId}`,
      );
    } catch (err: any) {
      try {
        const rawMessage = getErrorMessage(err, "");
        if (
          rawMessage.toLowerCase().includes("credentials have not been issued")
        ) {
          setError(
            "Your portal access is not ready yet. Please wait for approval and the credential email.",
          );
          return;
        }
        const errorMessage = getUserFriendlyMessage(
          err,
          "Invalid username or password. Please check your credentials and try again.",
        );
        setError(errorMessage);
      } catch {
        setError(
          "Invalid username or password. Please check your credentials and try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-sm rounded-2xl border-border bg-card shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl text-card-foreground">Franchisee Portal</CardTitle>
        <CardDescription>Sign in to access your franchise dashboard</CardDescription>
      </CardHeader>
      <CardContent>
        <form method="post" onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Email</Label>
            <Input
              id="username"
              type="text"
              name="username"
              autoComplete="username"
              placeholder="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={show ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1 h-7 w-7 text-muted-foreground"
                onClick={() => setShow((s) => !s)}
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                <span className="sr-only">Toggle password visibility</span>
              </Button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <Button type="submit" className="w-full rounded-lg" disabled={loading || !hydrated}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <div className="mt-4 text-center text-xs text-muted-foreground">
          New franchisee?{" "}
          <button
            type="button"
            onClick={onStartApplication}
            className="text-primary underline underline-offset-2"
          >
            Apply Now
          </button>
        </div>

        <div className="mt-5 border-t border-border pt-4 text-center text-xs text-muted-foreground">
          <p className="mb-2 font-medium">Other portals</p>
          <div className="flex justify-center gap-4">
            <Link href="/admin-login" className="text-primary hover:underline underline-offset-2">
              Admin
            </Link>
            <Link href="/ci/login" className="text-primary hover:underline underline-offset-2">
              Course Instructor
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
