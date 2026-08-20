"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  ConfirmDialog,
  DialogFormField,
  DialogFormGrid,
  MultiStepDialog,
  type StepDef,
} from "@/components/shared/dialog";
import { cn } from "@/lib/utils";
import { useDirtyCloseGuard } from "@/hooks/use-dirty-close-guard";
import {
  approveCourseInstructor,
  type AdminCourseInstructorData,
} from "@/services/course-instructor.service";
import {
  getTrainingLevelsByProgram,
  type TrainingLevel,
} from "@/services/training-level.service";
import { getUserFriendlyMessage } from "@/lib/error-utils";
import { APPROVE_CI_STEPS as FORM_STEPS } from "@/lib/constants/education";
import {
  PasswordSetFields,
  validatePasswordSet,
} from "@/components/shared/password-set-fields";
import {
  ReceivablePlanBuilder,
  validateReceivablePlan,
  type ReceivablePlanRow,
} from "./ReceivablePlanBuilder";


const errorClass = "border-destructive focus-visible:ring-destructive";

interface ApproveCIModalProps {
  instructor: AdminCourseInstructorData | null;
  onClose: () => void;
  onSuccess: () => void;
}

function defaultReceivable(levels: TrainingLevel[]): ReceivablePlanRow {
  const sorted = [...levels].sort((a, b) => a.displayOrder - b.displayOrder);
  const minOrder = sorted[0]?.displayOrder ?? 1;
  const maxOrder = sorted[sorted.length - 1]?.displayOrder ?? 1;
  return {
    label: "Receivable 1",
    levelFrom: minOrder,
    levelTo: maxOrder,
    fee: "",
    paid: false,
  };
}

export default function ApproveCIModal({
  instructor,
  onClose,
  onSuccess,
}: ApproveCIModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [tenure, setTenure] = useState(12);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [receivables, setReceivables] = useState<ReceivablePlanRow[]>([
    { label: "Receivable 1", levelFrom: 1, levelTo: 1, fee: "", paid: false },
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const open = !!instructor;
  const programId = instructor?.programId ?? null;

  const levelsQuery = useQuery({
    queryKey: ["approve-ci-levels", programId],
    queryFn: () => getTrainingLevelsByProgram(programId as number),
    enabled: open && Boolean(programId),
  });

  const sortedLevels: TrainingLevel[] = useMemo(
    () =>
      (levelsQuery.data ?? [])
        .slice()
        .sort((a, b) =>
          a.displayOrder === b.displayOrder
            ? a.id - b.id
            : a.displayOrder - b.displayOrder,
        ),
    [levelsQuery.data],
  );

  // Seed receivables with full-program default once levels load.
  useEffect(() => {
    if (sortedLevels.length > 0) {
      setReceivables([defaultReceivable(sortedLevels)]);
    }
  }, [sortedLevels]);

  // Reset state whenever the modal closes.
  useEffect(() => {
    if (open) return;
    setCurrentStep(1);
    setLoading(false);
    setTenure(12);
    setPassword("");
    setConfirmPassword("");
    setErrors({});
    setReceivables([
      { label: "Receivable 1", levelFrom: 1, levelTo: 1, fee: "", paid: false },
    ]);
  }, [open]);

  const validateStep = (step: number): boolean => {
    const e: Record<string, string> = {};
    if (step === 1) {
      if (!tenure || tenure < 1) e.tenure = "Tenure must be at least 1 month";
      Object.assign(e, validatePasswordSet(password, confirmPassword));
    }
    if (step === 2) {
      const planErr = validateReceivablePlan(receivables, sortedLevels);
      if (planErr) e.receivables = planErr;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep))
      setCurrentStep((s) => Math.min(s + 1, FORM_STEPS.length));
  };
  const handleBack = () => setCurrentStep((s) => Math.max(s - 1, 1));

  // The receivable plan is auto-seeded once levels load — compare against that
  // seed (not the pre-load initial row) so an untouched plan is not "dirty".
  const seedReceivables = useMemo<ReceivablePlanRow[]>(
    () =>
      sortedLevels.length > 0
        ? [defaultReceivable(sortedLevels)]
        : [{ label: "Receivable 1", levelFrom: 1, levelTo: 1, fee: "", paid: false }],
    [sortedLevels],
  );

  const isDirty =
    tenure !== 12 ||
    password !== "" ||
    confirmPassword !== "" ||
    JSON.stringify(receivables) !== JSON.stringify(seedReceivables);

  const { requestClose, confirmOpen, setConfirmOpen, confirmAndDiscard } =
    useDirtyCloseGuard({ isDirty, onDiscard: onClose });

  const handleSubmit = async () => {
    if (!instructor) return;
    if (!validateStep(1)) {
      setCurrentStep(1);
      return;
    }
    if (!validateStep(2)) return;

    setLoading(true);
    try {
      // Single-call approval: the training-fee plan rides the approve payload
      // and the backend builds the receivable plan at agreement issuance.
      await approveCourseInstructor(instructor.id, {
        tenure,
        password,
        trainingPlan: receivables.map((r, index) => ({
          order: index + 1,
          label: r.label.trim() || undefined,
          levelFrom: r.levelFrom,
          levelTo: r.levelTo,
          fee: Number(r.fee) || 0,
        })),
      });
      toast.success(`${instructor.name} has been approved.`);
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(
        getUserFriendlyMessage(
          error,
          "Failed to approve instructor. Please try again.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <MultiStepDialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !loading) requestClose(false);
      }}
      size="xl"
      title="Approve Course Instructor"
      description={
        instructor
          ? `Set the agreement tenure and receivable plan for ${instructor.name}.`
          : ""
      }
      headerIcon={CheckCircle}
      steps={FORM_STEPS}
      currentStep={currentStep}
      onBack={handleBack}
      onNext={handleNext}
      onSubmit={handleSubmit}
      isSubmitting={loading}
      submitLabel="Approve"
    >
      {currentStep === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The agreement expiry date is derived from the signing date plus this
            tenure.
          </p>
          <DialogFormGrid cols={2}>
            <DialogFormField
              id="tenure"
              label="Tenure (months)"
              required
              error={errors.tenure}
            >
              <Input
                id="tenure"
                type="number"
                min={1}
                step={1}
                value={tenure}
                onChange={(e) =>
                  setTenure(
                    Math.max(1, Math.floor(Number(e.target.value) || 1)),
                  )
                }
                className={cn(errors.tenure && errorClass)}
              />
            </DialogFormField>
          </DialogFormGrid>
          <p className="text-sm text-muted-foreground">
            Set the password the instructor will use to log in. It is emailed
            to them on approval.
          </p>
          <PasswordSetFields
            password={password}
            confirmPassword={confirmPassword}
            onPasswordChange={(value) => {
              setPassword(value);
              if (errors.password)
                setErrors((prev) => ({ ...prev, password: "" }));
            }}
            onConfirmPasswordChange={(value) => {
              setConfirmPassword(value);
              if (errors.confirmPassword)
                setErrors((prev) => ({ ...prev, confirmPassword: "" }));
            }}
            errors={{
              password: errors.password || undefined,
              confirmPassword: errors.confirmPassword || undefined,
            }}
            idPrefix="approve-ci"
          />
        </div>
      )}

      {currentStep === 2 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Define how the program fee is split across training levels. The CI
            pays each receivable in order before unlocking the next set of
            levels.
          </p>
          {!programId ? (
            <div className="rounded-md border p-3 text-sm text-destructive">
              This instructor has no program assigned — cannot set up receivables.
            </div>
          ) : levelsQuery.isLoading ? (
            <div className="rounded-md border p-3 text-sm text-muted-foreground">
              Loading levels…
            </div>
          ) : sortedLevels.length === 0 ? (
            <div className="rounded-md border p-3 text-sm text-muted-foreground">
              No CI training levels found for this program.
            </div>
          ) : (
            <ReceivablePlanBuilder
              levels={sortedLevels}
              rows={receivables}
              onChange={setReceivables}
            />
          )}
          {errors.receivables && (
            <p className="text-sm text-destructive">{errors.receivables}</p>
          )}
        </div>
      )}
    </MultiStepDialog>
    <ConfirmDialog
      open={confirmOpen}
      onOpenChange={setConfirmOpen}
      variant="destructive"
      title="Discard changes?"
      description="Your in-progress input will be lost."
      confirmLabel="Discard"
      onConfirm={confirmAndDiscard}
    />
    </>
  );
}
