"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
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
  DialogFormField,
  DialogFormGrid,
  MultiStepDialog,
  SuccessDialog,
  type StepDef,
} from "@/components/shared/dialog";
import { StateCitySelect } from "@/components/StateCitySelect";
import { cn } from "@/lib/utils";
import { getAllFranchise } from "@/services/franchisee.service";
import {
  getTrainingLevelsByProgram,
  type TrainingLevel,
} from "@/services/training-level.service";
import {
  setupExistingCourseInstructor,
  BloodGroup,
} from "@/services/course-instructor.service";
import { getUserFriendlyMessage } from "@/lib/error-utils";
import {
  TrainingPackageMatrix,
  type ApprovalPackageForm,
  createDefaultPackage,
  validatePackages,
} from "./TrainingPackageMatrix";

const FORM_STEPS: StepDef[] = [
  { id: 1, title: "Franchise & Program" },
  { id: 2, title: "CI Personal Details" },
  { id: 3, title: "Training Matrix & Validity" },
];

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

  const today = new Date().toISOString().slice(0, 10);
  const oneYearLater = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  }, []);
  const [validFrom, setValidFrom] = useState(today);
  const [validUntil, setValidUntil] = useState(oneYearLater);
  const [agreementSignedAt, setAgreementSignedAt] = useState(today);
  const [completedThrough, setCompletedThrough] = useState<number | null>(null);
  const [packages, setPackages] = useState<ApprovalPackageForm[]>([
    createDefaultPackage(1),
  ]);

  const franchisesQuery = useQuery({
    queryKey: ["admin-franchises-for-existing-ci"],
    queryFn: () => getAllFranchise({ status: "Active", page: 1, limit: 5000 }),
    enabled: open,
  });

  const selectedFranchise = useMemo(
    () => franchisesQuery.data?.result.find((f) => f.id === franchiseId),
    [franchisesQuery.data, franchiseId],
  );

  // Programs the admin can pick — one entry per program the franchise has a
  // currently valid agreement for (status `Valid` or legacy `Signed`).
  const programOptions = useMemo<Array<{ id: number; name: string }>>(() => {
    const agreements = selectedFranchise?.agreements ?? [];
    const seen = new Map<number, string>();
    for (const a of agreements) {
      const status = (a.status ?? "").trim();
      if (status !== "Valid" && status !== "Signed") continue;
      const pid = a.programId;
      if (typeof pid !== "number") continue;
      if (seen.has(pid)) continue;
      const pname =
        a.programName ?? (a as any).program?.name ?? `Program #${pid}`;
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

  // When the franchise changes, drop the selected program and either auto-pick
  // (if exactly one option) or force the admin to choose.
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

  // Reset state when dialog closes
  useEffect(() => {
    if (open) return;
    setCurrentStep(1);
    setSubmitted(false);
    setLoading(false);
    setErrors({});
    setFranchiseId("");
    setProgramId(null);
    setCiData(emptyCI);
    setValidFrom(today);
    setValidUntil(oneYearLater);
    setAgreementSignedAt(today);
    setCompletedThrough(null);
    setPackages([createDefaultPackage(1)]);
  }, [open, today, oneYearLater]);

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
      if (validUntil <= validFrom) e.validity = "Valid Until must be after Valid From";
      if (agreementSignedAt > today) e.agreementSignedAt = "Cannot be in the future";
      const pkgErr = validatePackages(packages, sortedLevels);
      if (pkgErr) e.packages = pkgErr;
      if (completedThrough != null) {
        for (const pkg of packages) {
          const containsCompleted = pkg.trainingLevelIds.some((id) => {
            const lvl = sortedLevels.find((l) => l.id === id);
            return lvl != null && lvl.displayOrder <= completedThrough;
          });
          if (containsCompleted && pkg.paid !== true) {
            e.packages = `Package "${pkg.name}" contains completed levels — mark it as paid.`;
            break;
          }
        }
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep))
      setCurrentStep((s) => Math.min(s + 1, FORM_STEPS.length));
  };
  const handleBack = () => setCurrentStep((s) => Math.max(s - 1, 1));

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
        validity: { validFrom, validUntil },
        agreementSignedAt,
        completedThrough,
        trainingPackages: packages.map((p) => ({
          name: p.name.trim(),
          code: p.code.trim(),
          description: p.description.trim() || undefined,
          packageOrder: p.packageOrder,
          fee: Number(p.fee) || 0,
          trainingLevelIds: p.trainingLevelIds,
          paid: p.paid === true,
        })),
      });
      setSubmitted(true);
      onSuccess();
    } catch (err) {
      toast.error(getUserFriendlyMessage(err, "Failed to set up course instructor"));
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
        description="The CI is now active with credentials emailed and training packages assigned."
        actionLabel="Close"
        onAction={() => onOpenChange(false)}
      />
    );
  }

  return (
    <MultiStepDialog
      open={open}
      onOpenChange={onOpenChange}
      size="xl"
      title="Setup Existing Course Instructor"
      description="Back-fill a CI who already exists, with training history and pending packages."
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
                    {f.name} — {f.city ?? "—"} ({f.id})
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
          <DialogFormField id="email" label="Email" required error={errors.email}>
            <Input
              type="email"
              value={ciData.email}
              onChange={(e) => updateCi({ email: e.target.value })}
              className={cn(errors.email && errorClass)}
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
          <DialogFormField id="address" label="Address" required error={errors.address}>
            <Textarea
              value={ciData.address}
              onChange={(e) => updateCi({ address: e.target.value })}
              className={cn(errors.address && errorClass)}
              rows={2}
            />
          </DialogFormField>
          <DialogFormField id="reference" label="Reference" required error={errors.reference}>
            <Textarea
              value={ciData.reference}
              onChange={(e) => updateCi({ reference: e.target.value })}
              className={cn(errors.reference && errorClass)}
              rows={2}
            />
          </DialogFormField>
        </DialogFormGrid>
      )}

      {currentStep === 3 && (
        <div className="space-y-4">
          <DialogFormGrid cols={3}>
            <DialogFormField id="validFrom" label="Valid From" required>
              <DateInput value={validFrom} onChange={setValidFrom} />
            </DialogFormField>
            <DialogFormField id="validUntil" label="Valid Until" required>
              <DateInput value={validUntil} onChange={setValidUntil} />
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
          {errors.validity && (
            <p className="text-sm text-destructive">{errors.validity}</p>
          )}

          <div className="rounded-md border bg-muted/10 p-3 text-sm">
            <strong>Tip:</strong> Check the "Completed?" box on the highest level the CI
            has finished. All levels up to that point are auto-marked complete. Packages
            containing a completed level are locked as Paid.
          </div>

          {levelsQuery.isLoading ? (
            <div className="rounded-md border p-3 text-sm text-muted-foreground">
              Loading levels…
            </div>
          ) : sortedLevels.length === 0 ? (
            <div className="rounded-md border p-3 text-sm text-muted-foreground">
              No CI training levels found for the selected program.
            </div>
          ) : (
            <TrainingPackageMatrix
              levels={sortedLevels}
              packages={packages}
              onChangePackages={setPackages}
              showCompletionColumn
              showPaidToggle
              completedThrough={completedThrough}
              onCompletedThroughChange={setCompletedThrough}
            />
          )}
          {errors.packages && (
            <p className="text-sm text-destructive">{errors.packages}</p>
          )}
        </div>
      )}
    </MultiStepDialog>
  );
}
