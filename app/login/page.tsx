"use client";

import type React from "react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calculator, Eye, EyeOff } from "lucide-react";
import { saveUserToStorage } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Login failed");
        return;
      }

      // Save user to localStorage
      saveUserToStorage(data.user);

      // Redirect to appropriate dashboard based on role and onboarding status
      if (data.user.role === "admin") {
        router.push("/admin/dashboard");
      } else if (data.user.role === "franchise") {
        // Check if franchise has completed onboarding
        if (data.user.onboardingCompleted) {
          router.push("/franchisee/dashboard");
        } else {
          // New franchisee needs to complete agreement and payment
          router.push("/franchisee/agreement");
        }
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = (userType: "admin" | "franchise") => {
    if (userType === "admin") {
      setEmail("admin@abacus.com");
      setPassword("admin123");
    } else {
      setEmail("franchise@abacus.com");
      setPassword("franchise123");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md border-gray-200 shadow-sm">
        <CardHeader className="text-center border-b border-gray-100">
          <div className="flex justify-center mb-4">
            <Calculator className="h-12 w-12 text-gray-700" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Abacus Portal
          </CardTitle>
          <CardDescription className="text-gray-600">
            Sign in to access your dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Demo Credentials */}
          <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-gray-200">
            <h3 className="text-sm font-semibold mb-3 text-gray-900">
              Demo Credentials:
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge
                  variant="outline"
                  className="bg-white border-gray-300 text-gray-700"
                >
                  Admin
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDemoLogin("admin")}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 text-xs"
                >
                  Use Admin Login
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <Badge
                  variant="outline"
                  className="bg-white border-gray-300 text-gray-700"
                >
                  Franchise
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDemoLogin("franchise")}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 text-xs"
                >
                  Use Franchise Login
                </Button>
              </div>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-gray-300 focus:border-gray-500 focus:ring-gray-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700 font-medium">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="border-gray-300 focus:border-gray-500 focus:ring-gray-500 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-auto p-1 hover:bg-gray-100"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-500" />
                  )}
                </Button>
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center bg-red-50 border border-red-200 rounded-md p-2">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-gray-900 hover:bg-gray-800 text-white"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              Interested in becoming a franchise partner?{" "}
              <Link
                href="/franchise-application"
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Apply now
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
