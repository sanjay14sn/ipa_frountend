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
import { CertificateCheckboxLinkPanel } from "@/components/certification/CertificateCheckboxLinkPanel";
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
  const assign = async (templateIds: number[]) => {
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
  };

  return (
    <EntityLinkPicker
      triggerLabel="Manage certificates"
      triggerIcon={Award}
      dialogTitle="Level Certificates"
      dialogDescription="Attach certificate templates issued when a student completes this level."
      disabled={disabled}
      useCatalog={(enabled) =>
        // eslint-disable-next-line react-hooks/rules-of-hooks -- invoked during EntityLinkPicker render (hook-injection API, CMP-09)
        useCertificateTemplatesForProgram(programId, enabled)
      }
      useAssigned={(enabled) =>
        // eslint-disable-next-line react-hooks/rules-of-hooks -- invoked during EntityLinkPicker render (hook-injection API, CMP-09)
        useCertificateTemplatesForLevel(levelId, enabled)
      }
      unassign={async (templateId) => {
        try {
          await unassignCertificateTemplateFromLevel(levelId, templateId);
          toast.success("Removed from level");
        } catch (e) {
          toast.error(getUserFriendlyMessage(e));
        }
      }}
      renderPanel={({
        catalog,
        isCatalogLoading,
        assigned,
        assignedIds,
        onUnlink,
        refetchAssigned,
      }) => (
        <CertificateCheckboxLinkPanel
          linkedItems={assigned as never}
          linkedTemplateIds={assignedIds}
          catalogItems={catalog as never}
          isCatalogLoading={isCatalogLoading}
          onUnlink={(item) => {
            if (typeof item.id === "number") onUnlink(item.id);
          }}
          onSave={async (ids) => {
            await assign(ids);
            await refetchAssigned();
          }}
        />
      )}
    />
  );
}
