"use client";

import React, { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertCircle } from "lucide-react";
import {
  requestAdditionalTraining,
  RequestAdditionalTrainingRequest,
  getAvailableTrainingLevelsForCI,
  type AvailableNextTrainingLevelCounts,
} from "@/services/course-instructor.service";
import { toast } from "sonner";
import { getUserFriendlyMessage } from "@/lib/error-utils";
import {
  AppDialog,
  DialogFormField,
  FormDialog,
} from "@/components/shared/dialog";

interface RequestTrainingModalProps {
  isOpen: boolean;
  onClose: () => void;
  instructorId: number;
  instructorName: string;
  onSuccess?: () => void;
}

function levelLabel(n: number) {
  return `${n} level${n === 1 ? "" : "s"}`;
}

export function RequestTrainingModal({
  isOpen,
  onClose,
  instructorId,
  instructorName,
  onSuccess,
}: RequestTrainingModalProps) {
  const [counts, setCounts] = useState<AvailableNextTrainingLevelCounts | null>(
    null,
  );
  const [scope, setScope] = useState<"half" | "all">("half");
  const [loading, setLoading] = useState(false);
  const [loadingLevels, setLoadingLevels] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (isOpen) {
      loadData();
    } else {
      setScope("half");
      setCounts(null);
      setError(null);
    }
  }, [isOpen, instructorId]);

  const loadData = async () => {
    try {
      setLoadingLevels(true);
      setError(null);

      const data = await getAvailableTrainingLevelsForCI(instructorId);
      setCounts(data);
      if (data.totalNextLevels <= 0) {
        setScope("half");
      } else if (data.halfOfAvailableCount === data.allAvailableCount) {
        setScope("all");
      } else {
        setScope("half");
      }
    } catch (err: any) {
      setError(getUserFriendlyMessage(err, "Failed to load training options"));
    } finally {
      setLoadingLevels(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!counts || counts.totalNextLevels === 0) return;

    setLoading(true);
    setError(null);

    try {
      const requestData: RequestAdditionalTrainingRequest = { scope };

      await requestAdditionalTraining(instructorId, requestData);

      toast.success("Training request submitted successfully");

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(getUserFriendlyMessage(err, "Failed to submit training request"));
    } finally {
      setLoading(false);
    }
  };

  const hasLevels = counts != null && counts.totalNextLevels > 0;
  const halfEqualsAll =
    counts != null &&
    counts.halfOfAvailableCount === counts.allAvailableCount;
  const selectDisabled = hasLevels && halfEqualsAll;

  if (loadingLevels) {
    return (
      <AppDialog open={isOpen} onOpenChange={onClose} size="sm">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppDialog>
    );
  }

  if (error && !counts) {
    return (
      <AppDialog open={isOpen} onOpenChange={onClose} size="sm">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </AppDialog>
    );
  }

  return (
    <FormDialog
      open={isOpen}
      onOpenChange={onClose}
      size="sm"
      title="Request additional training"
      description={instructorName}
      onSubmit={handleSubmit}
      isSubmitting={loading}
      canSubmit={Boolean(hasLevels)}
      submitLabel="Submit request"
    >
      {!hasLevels ? (
        <p className="text-sm text-muted-foreground">
          No further levels are available for this instructor.
        </p>
      ) : (
        <DialogFormField
          id="training-scope"
          label={
            <span className="flex flex-wrap items-baseline gap-x-2">
              Levels to request
              <span className="text-sm text-muted-foreground font-normal">
                ({levelLabel(counts!.totalNextLevels)})
              </span>
            </span>
          }
        >
          <Select
            value={scope}
            onValueChange={(v) => setScope(v as "half" | "all")}
            disabled={selectDisabled}
          >
            <SelectTrigger id="training-scope" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {halfEqualsAll ? (
                <SelectItem value="all">
                  {levelLabel(counts!.allAvailableCount)}
                </SelectItem>
              ) : (
                <>
                  <SelectItem value="half">
                    {levelLabel(counts!.halfOfAvailableCount)}
                  </SelectItem>
                  <SelectItem value="all">
                    {levelLabel(counts!.allAvailableCount)}
                  </SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </DialogFormField>
      )}

      {error && counts && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </FormDialog>
  );
}
