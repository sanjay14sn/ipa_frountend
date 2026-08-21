"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useHydrated } from "@/hooks/use-hydrated";
import Link from "next/link";
import { login, getAdminProfile } from "@/services/auth.service";
import { safeInternalPath } from "@/lib/url-utils";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser } from "@/context/user-context";
import { getUserFriendlyMessage } from "@/lib/error-utils";
import { sendClientLog } from "@/lib/client-telemetry";

function AdminLoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const hydrated = useHydrated();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await login(email.trim(), password.trim());
      const me = await getAdminProfile();
      if (me.role !== "super" && me.role !== "staff") {
        setError("Access denied. Admin credentials required.");
        setLoading(false);
        return;
      }

      setUser({
        id: String(me.id),
        mail: me.emailId?.trim() || email.trim(),
        name: me.name || email.trim(),
        role: "admin" as const,
        adminRole: me.role,
        state: me.state ?? null,
      });
      router.push(
        safeInternalPath(searchParams.get("next"), "/admin") ??
          "/admin/dashboard",
      );
    } catch (err: unknown) {
      sendClientLog({ level: "error", event: "admin-login-error", message: "Admin login error", context: { error: err } });
      setError(getUserFriendlyMessage(
        err,
        "Invalid username or password. Please check your credentials and try again.",
      ));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>

      <Card className="w-full max-w-sm rounded-2xl border-border bg-card shadow-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl text-card-foreground">Admin Portal</CardTitle>
          <CardDescription>Sign in to access the administrative dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form method="post" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                name="username"
                autoComplete="username"
                placeholder="admin"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
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
                  onClick={() => setShowPassword((s) => !s)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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

          <div className="mt-5 border-t border-border pt-4 text-center text-xs text-muted-foreground">
            <p className="mb-2 font-medium">Other portals</p>
            <div className="flex justify-center gap-4">
              <Link href="/login" className="text-primary hover:underline underline-offset-2">
                Franchisee
              </Link>
              <Link href="/ci-login" className="text-primary hover:underline underline-offset-2">
                Course Instructor
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

export default function AdminLoginPage() {
  // Suspense boundary: the inner page reads useSearchParams() for ?next=.
  return (
    <Suspense fallback={null}>
      <AdminLoginPageInner />
    </Suspense>
  );
}
