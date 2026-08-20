"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DialogFormField } from "@/components/shared/dialog";

export const PASSWORD_MIN_LENGTH = 8;

export interface PasswordSetErrors {
  password?: string;
  confirmPassword?: string;
}

/**
 * Shared validation for every admin set-a-password form (create, approve,
 * reissue). Mirrors the backend DTO rule (MinLength 8) plus the confirm match.
 * Returns an empty object when valid.
 */
export function validatePasswordSet(
  password: string,
  confirmPassword: string,
): PasswordSetErrors {
  const errors: PasswordSetErrors = {};
  if (!password) {
    errors.password = "Password is required";
  } else if (password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  }
  if (!confirmPassword) {
    errors.confirmPassword = "Confirm the password";
  } else if (password && confirmPassword !== password) {
    errors.confirmPassword = "Passwords do not match";
  }
  return errors;
}

export interface PasswordSetFieldsProps {
  password: string;
  confirmPassword: string;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  errors?: PasswordSetErrors;
  /** Prefixes the input ids so two instances never collide (default "password-set"). */
  idPrefix?: string;
  disabled?: boolean;
}

/**
 * Password + confirm-password pair for the admin-sets-the-password flows.
 * Purely controlled; pair with validatePasswordSet on submit.
 */
export function PasswordSetFields({
  password,
  confirmPassword,
  onPasswordChange,
  onConfirmPasswordChange,
  errors,
  idPrefix = "password-set",
  disabled,
}: PasswordSetFieldsProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div
      data-testid="password-set-fields"
      className="grid grid-cols-1 md:grid-cols-2 gap-4"
    >
      <DialogFormField
        id={`${idPrefix}-password`}
        label="Password"
        required
        error={errors?.password}
      >
        <div className="relative">
          <Input
            id={`${idPrefix}-password`}
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder={`Minimum ${PASSWORD_MIN_LENGTH} characters`}
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            disabled={disabled}
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
      </DialogFormField>

      <DialogFormField
        id={`${idPrefix}-confirm-password`}
        label="Confirm Password"
        required
        error={errors?.confirmPassword}
      >
        <div className="relative">
          <Input
            id={`${idPrefix}-confirm-password`}
            type={showConfirm ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Re-enter password"
            value={confirmPassword}
            onChange={(e) => onConfirmPasswordChange(e.target.value)}
            disabled={disabled}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1 h-7 w-7 text-muted-foreground"
            onClick={() => setShowConfirm((s) => !s)}
          >
            {showConfirm ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            <span className="sr-only">Toggle password visibility</span>
          </Button>
        </div>
      </DialogFormField>
    </div>
  );
}
