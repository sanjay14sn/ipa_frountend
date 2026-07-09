"use client";

import { Award } from "lucide-react";
import { toast } from "sonner";

import { getUserFriendlyMessage } from "@/lib/error-utils";
import {
  useCertificateTemplatesForProgram,
  useCertificateTemplatesForLevel,
  invalidateLevelCertificates,
} from "@/hooks/api/certificate-template.hooks";
import {
  bulkAssignCertificateTemplatesToLevel,
  unassignCertificateTemplateFromLevel,
} from "@/services/certificate-template-level.service";
import { EntityLinkPicker } from "@/components/shared/dialog/entity-link-picker";

export function LevelCertificatesPicker({
  levelId,
  programId,
  disabled,
}: {
  levelId: number;
  programId: number;
  disabled?: boolean;
}) {
  return (
    <EntityLinkPicker
      panel="certificate"
      triggerLabel="Manage certificates"
      triggerIcon={Award}
      dialogTitle="Level Certificates"
      dialogDescription="Attach certificate templates issued when a student completes this level."
      disabled={disabled}
      useCatalog={(enabled) =>
        useCertificateTemplatesForProgram(programId, enabled)
      }
      useAssigned={(enabled) =>
        useCertificateTemplatesForLevel(levelId, enabled)
      }
      assign={async (templateIds) => {
        const { assigned: count, failed } =
          await bulkAssignCertificateTemplatesToLevel(
            levelId,
            templateIds.map((certificateTemplateId) => ({
              certificateTemplateId,
            })),
          );
        await invalidateLevelCertificates(levelId);
        if (failed.length > 0) {
          toast.error(`${count} linked, ${failed.length} failed`);
        } else {
          toast.success(
            `${templateIds.length} template${templateIds.length !== 1 ? "s" : ""} linked to level`,
          );
        }
      }}
      unassign={async (templateId) => {
        try {
          await unassignCertificateTemplateFromLevel(levelId, templateId);
          toast.success("Removed from level");
        } catch (e) {
          toast.error(getUserFriendlyMessage(e));
        }
      }}
    />
  );
}
