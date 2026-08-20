"use client";

import { useState, type ReactNode } from "react";
import { FormDialog } from "@/components/shared/dialog";
import {
  PasswordSetFields,
  validatePasswordSet,
  type PasswordSetErrors,
} from "@/components/shared/password-set-fields";

export interface SetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  submitLabel?: string;
  isSubmitting?: boolean;
  /** Called with the validated password; the caller owns the request. */
  onSubmit: (password: string) => void;
  formId?: string;
}

/**
 * Popup for the admin reissue flows: password + confirm password, validated
 * locally, then handed to the caller. State resets whenever the dialog closes.
 */
export function SetPasswordDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel = "Set password",
  isSubmitting = false,
  onSubmit,
  formId = "set-password-form",
}: SetPasswordDialogProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<PasswordSetErrors>({});

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setPassword("");
      setConfirmPassword("");
      setErrors({});
    }
    onOpenChange(next);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      size="md"
      title={title}
      description={description}
      formId={formId}
      onSubmit={(e) => {
        e.preventDefault();
        const nextErrors = validatePasswordSet(password, confirmPassword);
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) return;
        onSubmit(password);
      }}
      isSubmitting={isSubmitting}
      submitLabel={submitLabel}
      cancelLabel="Cancel"
    >
      <div data-testid="set-password-dialog" className="py-2">
        <PasswordSetFields
          password={password}
          confirmPassword={confirmPassword}
          onPasswordChange={(value) => {
            setPassword(value);
            if (errors.password)
              setErrors((prev) => ({ ...prev, password: undefined }));
          }}
          onConfirmPasswordChange={(value) => {
            setConfirmPassword(value);
            if (errors.confirmPassword)
              setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
          }}
          errors={errors}
          idPrefix={formId}
          disabled={isSubmitting}
        />
      </div>
    </FormDialog>
  );
}
