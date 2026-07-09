"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useHydrated } from "@/hooks/use-hydrated";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { loginCI } from "@/services/ci-auth.service";
import { useCIAuth } from "@/context/ci-auth-context";
import { safeInternalPath } from "@/lib/url-utils";

function CILoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useCIAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const hydrated = useHydrated();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await loginCI(email.trim(), password);
      await refresh();
      router.replace(
        safeInternalPath(searchParams.get("next"), "/ci") ?? "/ci/agreement",
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 gap-6">
      <Image
        src="/brand/ipa-lockup.png"
        alt="Ideal Play Abacus"
        width={433}
        height={66}
        priority
      />

      <Card className="w-full max-w-sm rounded-2xl border-border bg-card shadow-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl text-card-foreground">Course Instructor Portal</CardTitle>
          <CardDescription>Sign in with your CI credentials</CardDescription>
        </CardHeader>
        <CardContent>
          <form method="post" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                name="email"
                autoComplete="email"
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
              <Link href="/admin-login" className="text-primary hover:underline underline-offset-2">
                Admin
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CILoginPage() {
  // Suspense boundary: the inner page reads useSearchParams() for ?next=.
  return (
    <Suspense fallback={null}>
      <CILoginPageInner />
    </Suspense>
  );
}
