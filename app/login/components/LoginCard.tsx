"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { getEffectiveFranchiseStatus, type User } from "@/lib/auth";
import { sendClientLog } from "@/lib/client-telemetry";

export function LoginCard({
  onStartApplication,
}: {
  onStartApplication: () => void;
}) {
  const router = useRouter();
  const { setUser } = useUser();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

      const franchisesRaw = await getFranchiseList();
      const franchises = franchisesRaw.map((f) => ({
        id: f.id,
        name: f.name,
        type: f.type,
        status: f.status,
      }));
      const current = franchises.find(
        (f) => f.id === loginResult.franchiseId,
      );

      let profileData: Record<string, unknown> | null = null;
      try {
        const profileResponse = await getFranchiseeProfile();
        if (profileResponse?.result) {
          profileData = profileResponse.result as Record<string, unknown>;
        }
      } catch (profileError) {
        sendClientLog({ level: "warn", event: "login-profile-fetch-error", message: "Failed to fetch franchisee profile after login", context: { error: profileError } });
      }

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
        franchiseId: loginResult.franchiseId,
        franchiseName:
          current?.name ??
          (profile as User["profile"] | undefined)?.franchise?.name,
        franchises,
        profile: profile as User["profile"],
      } as User;

      setUser(nextUser);
      const franchiseStatus = getEffectiveFranchiseStatus(
        nextUser,
        loginResult.franchiseId,
      );
      router.push(
        franchiseStatus === "Active"
          ? "/franchisee/dashboard"
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
    <Card className="order-2 w-[500px] rounded-2xl border-border bg-card shadow-sm md:order-1">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl text-primary">Sign in</CardTitle>
        <CardDescription>Access your franchisee dashboard</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-5">
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
            <div className="flex items-center">
              <Label htmlFor="password">Password</Label>
            </div>
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
                {show ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                <span className="sr-only">Toggle password visibility</span>
              </Button>
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}

          <Button type="submit" className="w-full rounded-lg" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <div className="space-y-2">
          <div className="text-xs text-muted-foreground text-center mt-2">
            Admin users should use the{" "}
            <a href="/admin-login" className="text-primary underline">
              Admin Portal
            </a>
            <br></br>
            New user?{" "}
            <button
              type="button"
              onClick={onStartApplication}
              className="text-primary underline"
            >
              Apply Now
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
