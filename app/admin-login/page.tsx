"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";
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
import { login } from "@/services/auth.service";
import { getUserFriendlyMessage } from "@/lib/error-utils";

export default function AdminLoginPage() {
  const router = useRouter();
  const { setUser } = useUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await login(email.trim(), password.trim());
      const data = response.result;

      if (response.statusCode !== 201) {
        setError(response.message || "Login failed");
        return;
      }

      if (data.role !== "admin") {
        setError("Access denied. Admin credentials required.");
        return;
      }

      const loggedInUser = {
        id: String(data.userId),
        email,
        name: email,
        role: "admin" as const,
      };

      setUser(loggedInUser);
      setDone(true);

      setTimeout(() => {
        router.push("/admin/dashboard");
      }, 600);
    } catch (err) {
      console.error("Admin login error:", err);
      const errorMessage = getUserFriendlyMessage(
        err,
        "Invalid username or password. Please check your credentials and try again."
      );
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="w-full max-w-md border-border bg-card">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl text-primary">Admin Sign in</CardTitle>
          <CardDescription>Access the administrative dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
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
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  <span className="sr-only">Toggle password visibility</span>
                </Button>
              </div>
            </div>

            {error && (
              <div className="text-destructive-foreground text-sm text-center bg-destructive/10 border border-destructive/20 rounded-md p-2">
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

            {done && (
              <div className="flex items-center gap-2 rounded-md border border-brand-green-200 bg-brand-green-50 px-3 py-2 text-brand-green-700">
                <CheckCircle2 className="h-4 w-4" />
                <p className="text-sm">Success! Redirecting to dashboard…</p>
              </div>
            )}
          </form>

          <div className="mt-6 p-4 bg-brand-white-100 rounded-lg border border-border">
            <div className="text-xs text-muted-foreground text-center">
              <Link href="/" className="text-brand-green-600 underline">
                ← Back to Franchisee Portal
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
