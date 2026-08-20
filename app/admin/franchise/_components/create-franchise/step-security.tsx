"use client";

import type { FormData, FranchiseeMode } from "./types";
import { PasswordSetFields } from "@/components/shared/password-set-fields";

interface StepSecurityProps {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  franchiseeMode: FranchiseeMode;
}

export function StepSecurity({
  formData,
  setFormData,
  errors,
  setErrors,
  franchiseeMode,
}: StepSecurityProps) {
  if (franchiseeMode === "existing") {
    return (
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-card-foreground">
        The selected existing franchisee keeps their current credentials. Use
        the resend-credentials action on the franchise table to set a new
        password.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-card-foreground">
        Set the password the new franchisee will use to log in. It is emailed
        to them along with their login details.
      </div>
      <PasswordSetFields
        password={formData.password}
        confirmPassword={formData.confirmPassword}
        onPasswordChange={(value) => {
          setFormData((prev) => ({ ...prev, password: value }));
          if (errors.password) setErrors({ ...errors, password: "" });
        }}
        onConfirmPasswordChange={(value) => {
          setFormData((prev) => ({ ...prev, confirmPassword: value }));
          if (errors.confirmPassword)
            setErrors({ ...errors, confirmPassword: "" });
        }}
        errors={{
          password: errors.password || undefined,
          confirmPassword: errors.confirmPassword || undefined,
        }}
        idPrefix="franchisee"
      />
    </div>
  );
}
