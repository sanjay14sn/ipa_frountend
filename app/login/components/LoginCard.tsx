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
import { franchiseeLogin, getFranchiseeProfile } from "@/services/auth.service";
import { useUser } from "@/context/user-context";
import { getUserFriendlyMessage } from "@/lib/error-utils";
import type { User } from "@/lib/auth";

export function LoginCard() {
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
      const response = await franchiseeLogin(username.trim(), password.trim());
      const data = response.result;

      if (response.statusCode !== 201) {
        setError(response.message || "Login failed");
        setLoading(false);
        return;
      }

      if (data.role !== "franchisee" && data.role !== "franchise") {
        setError(
          "This portal is for franchisees only. Please use the admin portal for admin access."
        );
        setLoading(false);
        return;
      }

      let profileData = null;
      try {
        const profileResponse = await getFranchiseeProfile();
        if (profileResponse.statusCode === 200) {
          profileData = profileResponse.result;
        }
      } catch (profileError) {
        console.warn("Failed to fetch profile data:", profileError);
      }

      const profile = profileData
        ? {
            ...profileData,
            city: (profileData as any).franchise?.city ?? (profileData as any).city,
            address: (profileData as any).franchise?.address ?? (profileData as any).address,
          }
        : undefined;

      setUser({
        id: String(data.userId),
        name: data.name,
        role: "franchisee",
        franchiseStatus: data.franchiseStatus,
        franchiseId: data.franchiseId,
        profile,
      } as User);
      router.push("/franchisee/dashboard");
    } catch (err: any) {
      try {
        const errorMessage = getUserFriendlyMessage(
          err,
          "Invalid username or password. Please check your credentials and try again."
        );
        setError(errorMessage);
      } catch (errorHandlingError) {
        setError("Invalid username or password. Please check your credentials and try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="order-2 border-border bg-card md:order-1">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl text-primary">Sign in</CardTitle>
        <CardDescription>Access your franchisee dashboard</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="username"
              type="username"
              placeholder="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center">
              <Label htmlFor="password">Password</Label>
              <Link
                href="#"
                className="ml-auto text-sm text-brand-green-600 underline underline-offset-4"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={show ? "text" : "password"}
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
            <div className="text-red-500 text-sm text-center">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-brand-green-500 hover:bg-brand-green-600 text-white"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <div className="space-y-2">
          <div className="text-xs text-muted-foreground text-center mt-2">
            Admin users should use the{" "}
            <a href="/admin-login" className="text-brand-green-600 underline">
              Admin Portal
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
