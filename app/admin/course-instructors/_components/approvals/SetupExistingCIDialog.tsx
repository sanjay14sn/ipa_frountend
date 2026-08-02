"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DateInput } from "@/components/ui/date-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ConfirmDialog,
  DialogFormField,
  DialogFormGrid,
  MultiStepDialog,
  SuccessDialog,
  type StepDef,
} from "@/components/shared/dialog";
import { StateCitySelect } from "@/components/StateCitySelect";
import { cn } from "@/lib/utils";
import { useDirtyCloseGuard } from "@/hooks/use-dirty-close-guard";
import { getAllFranchise } from "@/services/franchisee.service";
import {
  getTrainingLevelsByProgram,
  type TrainingLevel,
} from "@/services/training-level.service";
import {
  setupExistingCourseInstructor,
  BloodGroup,
} from "@/services/course-instructor.service";
import { handleFormApiError } from "@/lib/form-errors";
import { replaceStepErrors } from "@/lib/form-utils";
import { useUniquenessCheck } from "@/hooks/api/uniqueness.hooks";
import { checkCourseInstructorEmail } from "@/services/uniqueness.service";
import { SETUP_EXISTING_CI_STEPS as FORM_STEPS } from "@/lib/constants/education";
import {
  ReceivablePlanBuilder,
  validateReceivablePlan,
  type ReceivablePlanRow,
} from "./ReceivablePlanBuilder";


const BLOOD_GROUPS = [
  BloodGroup.A_POSITIVE,
  BloodGroup.A_NEGATIVE,
  BloodGroup.B_POSITIVE,
  BloodGroup.B_NEGATIVE,
  BloodGroup.AB_POSITIVE,
  BloodGroup.AB_NEGATIVE,
  BloodGroup.O_POSITIVE,
  BloodGroup.O_NEGATIVE,
];

const errorClass = "border-destructive focus-visible:ring-destructive";

/** Fields each wizard step owns, for scoped error replacement on validate. */
const STEP_FIELDS: Record<number, readonly string[]> = {
  1: ["franchiseId", "programId"],
  2: [
    "name",
    "email",
    "phone",
    "dob",
    "bloodGroup",
    "city",
    "address",
    "education",
    "occupation",
    "reference",
  ],
  3: ["tenure", "agreementSignedAt", "receivables"],
};

interface SetupExistingCIDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface CIPersonal {
  name: string;
  dob: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  bloodGroup: string;
  education: string;
  occupation: string;
  reference: string;
}

const emptyCI: CIPersonal = {
  name: "",
  dob: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  state: "",
  bloodGroup: "",
  education: "",
  occupation: "",
  reference: "",
};

function defaultReceivable(levels: TrainingLevel[]): ReceivablePlanRow {
  const sorted = [...levels].sort((a, b) => a.displayOrder - b.displayOrder);
  const minOrder = sorted[0]?.displayOrder ?? 1;
  const maxOrder = sorted[sorted.length - 1]?.displayOrder ?? 1;
  return { label: "Receivable 1", levelFrom: minOrder, levelTo: maxOrder, fee: "", paid: false };
}

export default function SetupExistingCIDialog({
  open,
  onOpenChange,
  onSuccess,
}: SetupExistingCIDialogProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [franchiseId, setFranchiseId] = useState<string>("");
  const [programId, setProgramId] = useState<number | null>(null);
  const [ciData, setCiData] = useState<CIPersonal>(emptyCI);

  // Eager uniqueness check — advisory red highlight while typing; the
  // submit path re-checks and reports a field-level 409 on races.
  const emailUniq = useUniquenessCheck({
    keyParts: ["ci", "email"],
    value: ciData.email,
    enabled: /\S+@\S+\.\S+/.test(ciData.email),
    fetcher: (value, opts) => checkCourseInstructorEmail("admin", value, opts),
    takenMessage:
      "An account with this email already exists. Please use a different email.",
  });

  // Merged view for rendering: base errors + live "taken" result.
  const displayErrors: Record<string, string> = { ...errors };
  if (emailUniq.error && !errors.email) displayErrors.email = emailUniq.error;

  const today = new Date().toISOString().slice(0, 10);
  const [tenure, setTenure] = useState(12);
  const [agreementSignedAt, setAgreementSignedAt] = useState(today);
  const [completedThrough, setCompletedThrough] = useState<number | null>(null);
  const [receivables, setReceivables] = useState<ReceivablePlanRow[]>([
    { label: "Receivable 1", levelFrom: 1, levelTo: 1, fee: "", paid: false },
  ]);

  const franchisesQuery = useQuery({
    queryKey: ["admin-franchises-for-existing-ci"],
    queryFn: () => getAllFranchise({ status: "Approved", page: 1, limit: 5000 }),
    enabled: open,
  });

  const selectedFranchise = useMemo(
    () => franchisesQuery.data?.result.find((f) => f.id === franchiseId),
    [franchisesQuery.data, franchiseId],
  );

  const programOptions = useMemo<Array<{ id: number; name: string }>>(() => {
    const agreements = selectedFranchise?.agreements ?? [];
    const seen = new Map<number, string>();
    for (const a of agreements) {
      const status = (a.status ?? "").trim();
      if (status !== "ACTIVE") continue;
      const pid = a.programId;
      if (typeof pid !== "number") continue;
      if (seen.has(pid)) continue;
      const pname =
        a.programName ??
        (a as { program?: { name?: string } }).program?.name ??
        `Program #${pid}`;
      seen.set(pid, pname);
    }
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [selectedFranchise]);

  const levelsQuery = useQuery({
    queryKey: ["setup-existing-ci-levels", programId],
    queryFn: () => getTrainingLevelsByProgram(programId as number),
    enabled: Boolean(programId),
  });

  const sortedLevels: TrainingLevel[] = useMemo(
    () =>
      (levelsQuery.data ?? [])
        .slice()
        .sort((a, b) =>
          a.displayOrder === b.displayOrder ? a.id - b.id : a.displayOrder - b.displayOrder,
        ),
    [levelsQuery.data],
  );

  useEffect(() => {
    if (programOptions.length === 1) {
      setProgramId(programOptions[0].id);
    } else if (
      programId != null &&
      !programOptions.some((p) => p.id === programId)
    ) {
      setProgramId(null);
    }
  }, [programOptions, programId]);

  // Seed receivables with sensible defaults once levels load
  useEffect(() => {
    if (sortedLevels.length > 0) {
      setReceivables([defaultReceivable(sortedLevels)]);
    }
  }, [sortedLevels]);

  useEffect(() => {
    if (open) return;
    setCurrentStep(1);
    setSubmitted(false);
    setLoading(false);
    setErrors({});
    setFranchiseId("");
    setProgramId(null);
    setCiData(emptyCI);
    setTenure(12);
    setAgreementSignedAt(today);
    setCompletedThrough(null);
    setReceivables([{ label: "Receivable 1", levelFrom: 1, levelTo: 1, fee: "", paid: false }]);
  }, [open, today]);

  const updateCi = (patch: Partial<CIPersonal>) =>
    setCiData((d) => ({ ...d, ...patch }));

  const validateStep = (step: number): boolean => {
    const e: Record<string, string> = {};
    if (step === 1) {
      if (!franchiseId) {
        e.franchiseId = "Select a franchise";
      } else if (programOptions.length === 0) {
        e.programId =
          "Selected franchise has no valid program agreements — run Setup Existing Franchise first";
      } else if (!programId) {
        e.programId = "Select a program";
      }
    }
    if (step === 2) {
      if (!ciData.name.trim()) e.name = "Name is required";
      if (!ciData.email.trim()) e.email = "Email is required";
      else if (!/\S+@\S+\.\S+/.test(ciData.email)) e.email = "Enter a valid email";
      if (!e.email && emailUniq.isTaken) e.email = emailUniq.error!;
      if (!/^\d{10}$/.test(ciData.phone)) e.phone = "10-digit phone required";
      if (!ciData.dob) e.dob = "DOB required";
      if (!ciData.bloodGroup) e.bloodGroup = "Blood group required";
      if (!ciData.city) e.city = "City required";
      if (!ciData.address.trim()) e.address = "Address required";
      if (!ciData.education.trim()) e.education = "Education required";
      if (!ciData.occupation.trim()) e.occupation = "Occupation required";
      if (!ciData.reference.trim()) e.reference = "Reference required";
    }
    if (step === 3) {
      if (!tenure || tenure < 1) e.tenure = "Tenure must be at least 1 month";
      if (agreementSignedAt > today) e.agreementSignedAt = "Cannot be in the future";
      const planErr = validateReceivablePlan(receivables, sortedLevels);
      if (planErr) e.receivables = planErr;
    }
    // Replace only this step's errors so API/async errors reported on other
    // steps survive navigation (a full-replace wiped them).
    setErrors((prev) => replaceStepErrors(prev, STEP_FIELDS[step] ?? [], e));
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep))
      setCurrentStep((s) => Math.min(s + 1, FORM_STEPS.length));
  };
  const handleBack = () => setCurrentStep((s) => Math.max(s - 1, 1));

  // Dirty when any user input deviates from the pristine defaults (programId /
  // receivables are derived from the franchise/levels selection, so franchiseId
  // covers them).
  const isDirty =
    !submitted &&
    (franchiseId !== "" ||
      JSON.stringify(ciData) !== JSON.stringify(emptyCI) ||
      tenure !== 12 ||
      agreementSignedAt !== today ||
      completedThrough != null);

  const { requestClose, confirmOpen, setConfirmOpen, confirmAndDiscard } =
    useDirtyCloseGuard({
      isDirty,
      onDiscard: () => onOpenChange(false),
    });

  const handleSubmit = async () => {
    if (!validateStep(3) || !programId) return;
    setLoading(true);
    try {
      await setupExistingCourseInstructor({
        franchiseId,
        programId,
        ci: {
          name: ciData.name,
          dob: ciData.dob,
          phone: ciData.phone,
          email: ciData.email,
          address: ciData.address,
          city: ciData.city,
          state: ciData.state || undefined,
          bloodGroup: ciData.bloodGroup,
          education: ciData.education,
          occupation: ciData.occupation,
          reference: ciData.reference,
        },
        tenure,
        agreementSignedAt,
        completedThrough,
        receivables: receivables.map((r) => ({
          levelFrom: r.levelFrom,
          levelTo: r.levelTo,
          fee: Number(r.fee) || 0,
          label: r.label.trim() || undefined,
          paid:
            r.paid ||
            (completedThrough != null && r.levelTo <= completedThrough),
        })),
      });
      setSubmitted(true);
      onSuccess();
    } catch (err) {
      handleFormApiError(err, {
        setErrors,
        fieldMap: { email: "email" },
        fieldToStep: { email: 2 },
        goToStep: setCurrentStep,
        fallback: "Failed to set up course instructor",
      });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <SuccessDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Course Instructor created"
        description="The CI is now active with credentials emailed and receivables assigned."
        actionLabel="Close"
        onAction={() => onOpenChange(false)}
      />
    );
  }

  return (
    <>
    <MultiStepDialog
      open={open}
      onOpenChange={(o) => (o ? onOpenChange(o) : requestClose(false))}
      size="xl"
      title="Setup Existing Course Instructor"
      description="Back-fill a CI who already exists, with training history and pending receivables."
      headerIcon={User}
      steps={FORM_STEPS}
      currentStep={currentStep}
      onBack={handleBack}
      onNext={handleNext}
      onSubmit={handleSubmit}
      isSubmitting={loading}
      submitLabel="Create Course Instructor"
    >
      {currentStep === 1 && (
        <div className="space-y-4">
          <DialogFormField id="franchiseId" label="Franchise" required error={errors.franchiseId}>
            <Select value={franchiseId} onValueChange={setFranchiseId}>
              <SelectTrigger className={cn(errors.franchiseId && errorClass)}>
                <SelectValue
                  placeholder={franchisesQuery.isLoading ? "Loading…" : "Select franchise"}
                />
              </SelectTrigger>
              <SelectContent>
                {franchisesQuery.data?.result.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name} — {f.city ?? "—"} ({f.code ?? "—"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </DialogFormField>
          {selectedFranchise && (
            <DialogFormField
              id="programId"
              label="Program"
              required
              error={errors.programId}
              hint={
                programOptions.length === 0
                  ? "This franchise has no valid program agreements. Set one up via Setup Existing Franchise first."
                  : programOptions.length === 1
                    ? "Auto-selected — this franchise has one valid program agreement."
                    : "Pick the program this CI will teach. Only programs the franchise has a Valid agreement for are listed."
              }
            >
              <Select
                value={programId != null ? String(programId) : ""}
                onValueChange={(v) => {
                  setProgramId(v ? Number(v) : null);
                  if (errors.programId) setErrors((e) => ({ ...e, programId: "" }));
                }}
                disabled={programOptions.length === 0}
              >
                <SelectTrigger className={cn(errors.programId && errorClass)}>
                  <SelectValue
                    placeholder={
                      programOptions.length === 0
                        ? "No valid programs"
                        : "Select program"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {programOptions.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </DialogFormField>
          )}
          {selectedFranchise && (
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <strong>State:</strong> {selectedFranchise.state ?? "—"}
            </div>
          )}
        </div>
      )}

      {currentStep === 2 && (
        <DialogFormGrid cols={2}>
          <DialogFormField id="name" label="Full Name" required error={errors.name}>
            <Input
              value={ciData.name}
              onChange={(e) => updateCi({ name: e.target.value })}
              className={cn(errors.name && errorClass)}
            />
          </DialogFormField>
          <DialogFormField id="email" label="Email" required error={displayErrors.email}>
            <Input
              type="email"
              value={ciData.email}
              onChange={(e) => updateCi({ email: e.target.value })}
              className={cn(displayErrors.email && errorClass)}
            />
          </DialogFormField>
          <DialogFormField id="phone" label="Phone (10 digits)" required error={errors.phone}>
            <Input
              value={ciData.phone}
              onChange={(e) => updateCi({ phone: e.target.value })}
              className={cn(errors.phone && errorClass)}
            />
          </DialogFormField>
          <DialogFormField id="dob" label="Date of Birth" required error={errors.dob}>
            <DateInput
              value={ciData.dob}
              onChange={(v) => updateCi({ dob: v })}
              className={cn(errors.dob && errorClass)}
            />
          </DialogFormField>
          <DialogFormField id="bloodGroup" label="Blood Group" required error={errors.bloodGroup}>
            <Select
              value={ciData.bloodGroup}
              onValueChange={(v) => updateCi({ bloodGroup: v })}
            >
              <SelectTrigger className={cn(errors.bloodGroup && errorClass)}>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {BLOOD_GROUPS.map((bg) => (
                  <SelectItem key={bg} value={bg}>
                    {bg}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </DialogFormField>
          <StateCitySelect
            id="city"
            value={ciData.city}
            stateValue={ciData.state}
            onChange={(c) => updateCi({ city: c })}
            onStateChange={(s) => updateCi({ state: s, city: "" })}
            label="City"
            required
            error={errors.city}
            mode="flat"
          />
          <DialogFormField id="education" label="Education" required error={errors.education}>
            <Input
              value={ciData.education}
              onChange={(e) => updateCi({ education: e.target.value })}
              className={cn(errors.education && errorClass)}
            />
          </DialogFormField>
          <DialogFormField id="occupation" label="Occupation" required error={errors.occupation}>
            <Input
              value={ciData.occupation}
              onChange={(e) => updateCi({ occupation: e.target.value })}
              className={cn(errors.occupation && errorClass)}
            />
          </DialogFormField>
          <DialogFormField id="reference" label="Reference" required error={errors.reference}>
            <Input
              value={ciData.reference}
              onChange={(e) => updateCi({ reference: e.target.value })}
              className={cn(errors.reference && errorClass)}
            />
          </DialogFormField>
          <DialogFormField
            id="address"
            label="Address"
            required
            error={errors.address}
            className="md:col-span-2"
          >
            <Textarea
              value={ciData.address}
              onChange={(e) => updateCi({ address: e.target.value })}
              className={cn(errors.address && errorClass)}
              rows={3}
            />
          </DialogFormField>
        </DialogFormGrid>
      )}

      {currentStep === 3 && (
        <div className="space-y-4">
          <DialogFormGrid cols={2}>
            <DialogFormField id="tenure" label="Tenure (months)" required error={errors.tenure}>
              <Input
                id="tenure"
                type="number"
                min={1}
                step={1}
                value={tenure}
                onChange={(e) => setTenure(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                className={cn(errors.tenure && errorClass)}
              />
            </DialogFormField>
            <DialogFormField
              id="agreementSignedAt"
              label="Agreement Signed"
              required
              error={errors.agreementSignedAt}
            >
              <DateInput
                value={agreementSignedAt}
                max={today}
                onChange={setAgreementSignedAt}
              />
            </DialogFormField>
          </DialogFormGrid>

          <DialogFormField
            id="completedThrough"
            label="Training completed through"
            hint="Receivables entirely within the completed range are auto-marked paid."
          >
            <Select
              value={completedThrough != null ? String(completedThrough) : "none"}
              onValueChange={(v) =>
                setCompletedThrough(v === "none" ? null : Number(v))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {sortedLevels.map((l) => (
                  <SelectItem key={l.id} value={String(l.displayOrder)}>
                    {l.name || `Level ${l.displayOrder}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </DialogFormField>

          {levelsQuery.isLoading ? (
            <div className="rounded-md border p-3 text-sm text-muted-foreground">
              Loading levels…
            </div>
          ) : sortedLevels.length === 0 ? (
            <div className="rounded-md border p-3 text-sm text-muted-foreground">
              No CI training levels found for the selected program.
            </div>
          ) : (
            <ReceivablePlanBuilder
              levels={sortedLevels}
              rows={receivables}
              onChange={setReceivables}
              showPaid
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
