"use client";

import React from "react";
import { Info } from "lucide-react";
import {
  AppDialog,
  AppDialogBody,
  AppDialogFooter,
  AppDialogHeader,
} from "@/components/shared/dialog";

interface RequestMaterialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  instructorId: number;
  instructorName: string;
  onSuccess?: () => void;
}

/**
 * Training-materials request flow.
 *
 * The backend endpoint for previewing and ordering CI training materials is not
 * available in this deployment. The modal remains in the codebase so the
 * triggering UI surface (PaymentCourseInstructorsTable) does not need to be
 * changed, but it shows an informational message rather than an actionable
 * form until the feature lands.
 */
export function RequestMaterialsModal({
  isOpen,
  onClose,
  instructorName,
}: RequestMaterialsModalProps) {
  return (
    <AppDialog
      open={isOpen}
      onOpenChange={onClose}
      size="lg"
      padding="flush"
      scrollBody
    >
      <AppDialogHeader
        title="Request Training Materials"
        description={`Request materials for ${instructorName}'s active training level`}
        icon={Info}
        sticky
      />

      <AppDialogBody className="space-y-4">
        <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
          <Info className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm font-medium text-card-foreground">
            Materials ordering is not available yet
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            The training-materials request feature will be enabled in a future
            release. Please contact support if you need materials for this
            instructor in the meantime.
          </p>
        </div>
      </AppDialogBody>

      <AppDialogFooter
        sticky
        padded
        secondary={{
          label: "Close",
          onClick: onClose,
        }}
      />
    </AppDialog>
  );
}
