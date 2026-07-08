"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
import { changeFranchiseePassword } from "@/services/auth.service";
import { getUserFriendlyMessage } from "@/lib/error-utils";
import { queryKeys } from "@/hooks/api/query-keys";
import { useUser } from "@/context/user-context";

/**
 * Blocking gate rendered instead of portal content while the franchisee is
 * still on an issued temporary password (`profile.mustChangePassword`).
 * On success the flag is cleared optimistically on the stored user (the
 * profile-merge effect's skip-guard would otherwise hold the stale flag) and
 * the profile query is invalidated for good measure.
 */
export function ChangePasswordGate() {
  const { setUser } = useUser();
  const queryClient = useQueryClient();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      await changeFranchiseePassword(currentPassword, newPassword);
      toast.success("Password updated.");
      setUser((prev) =>
        prev
          ? {
              ...prev,
              profile: prev.profile
                ? { ...prev.profile, mustChangePassword: false }
                : prev.profile,
            }
          : prev,
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.auth.franchiseeProfile(),
      });
    } catch (err) {
      setError(getUserFriendlyMessage(err, "Could not update password."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm rounded-2xl border-border bg-card shadow-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl text-card-foreground">
            Set a new password
          </CardTitle>
          <CardDescription>
            Your account is using a temporary password. Choose a new one to
            continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                At least 8 characters.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            <Button type="submit" className="w-full rounded-lg" disabled={submitting}>
              {submitting ? "Updating…" : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
