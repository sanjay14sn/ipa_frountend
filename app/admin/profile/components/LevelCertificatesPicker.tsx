"use client";

import { useMemo, useState } from "react";
import { Award } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  AppDialog,
  AppDialogBody,
  AppDialogHeader,
} from "@/components/shared/dialog";

export function LevelCertificatesPicker({
  levelId,
  programId,
  disabled,
}: {
  levelId: number;
  programId: number;
  disabled?: boolean;
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);

  const { data: catalog = [], isLoading: isLoadingCatalog } =
    useCertificateTemplatesForProgram(programId, hasRequested);
  const {
    data: assigned = [],
    isLoading: isLoadingAssigned,
    refetch: refetchAssigned,
  } = useCertificateTemplatesForLevel(levelId, hasRequested);

  const assignedIds = useMemo(
    () => new Set(assigned.map((item) => item.id)),
    [assigned],
  );

  const handleRemove = async (templateId: number) => {
    try {
      await unassignCertificateTemplateFromLevel(levelId, templateId);
      toast.success("Removed from level");
      await invalidateLevelCertificates(levelId);
      await refetchAssigned();
    } catch (e) {
      toast.error(getUserFriendlyMessage(e));
    }
  };

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1">
      {!hasRequested ? (
        <span className="text-xs text-muted-foreground">Open to load</span>
      ) : isLoadingAssigned || isLoadingCatalog ? (
        <span className="text-xs text-muted-foreground">Loading...</span>
      ) : (
        <span className="text-xs text-muted-foreground">
          {assigned.length} linked
        </span>
      )}

      {!disabled ? (
        <>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-6 w-6 shrink-0"
            title="Manage certificates"
            aria-label="Manage certificates"
            onClick={() => {
              if (!hasRequested) setHasRequested(true);
              setIsDialogOpen(true);
            }}
          >
            <Award className="h-3.5 w-3.5" />
          </Button>

          <AppDialog
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            size="xl"
            padding="flush"
            scrollBody
          >
            <AppDialogHeader
              title="Level Certificates"
              description="Attach certificate templates issued when a student completes this level."
              sticky
            />
            <AppDialogBody>
              <CertificateCheckboxLinkPanel
                key={levelId}
                linkedItems={assigned}
                linkedTemplateIds={assignedIds}
                catalogItems={catalog}
                isCatalogLoading={isLoadingCatalog}
                onUnlink={(item) => void handleRemove(item.id)}
                onSave={async (templateIds) => {
                  const { assigned: count, failed } =
                    await bulkAssignCertificateTemplatesToLevel(
                      levelId,
                      templateIds.map((certificateTemplateId) => ({
                        certificateTemplateId,
                      })),
                    );
                  await invalidateLevelCertificates(levelId);
                  await refetchAssigned();
                  if (failed.length > 0) {
                    toast.error(`${count} linked, ${failed.length} failed`);
                  } else {
                    toast.success(
                      `${templateIds.length} template${templateIds.length !== 1 ? "s" : ""} linked to level`,
                    );
                  }
                }}
              />
            </AppDialogBody>
          </AppDialog>
        </>
      ) : null}
    </div>
  );
}
