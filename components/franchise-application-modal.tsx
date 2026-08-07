"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calculator, Check, ChevronsUpDown } from "lucide-react";
import React from "react";
import { sendClientLog } from "@/lib/client-telemetry";
import { applyFranchisee } from "@/services/franchisee.service";
import { handleFormApiError } from "@/lib/form-errors";
import {
  FranchiseeApplication,
  Franchisee,
  Franchise,
} from "@/services/franchisee.service";
import { useProgramsOnDemand } from "@/hooks/api/program.hooks";
import { StateCitySelect } from "@/components/StateCitySelect";
import { cn } from "@/lib/utils";
import { useDirtyCloseGuard } from "@/hooks/use-dirty-close-guard";
import { FRANCHISE_APPLICATION_STEPS as FORM_STEPS } from "@/lib/constants/education";
import {
  ConfirmDialog,
  MultiStepDialog,
  SuccessDialog,
  type StepDef,
  DialogFormField,
} from "@/components/shared/dialog";


/**
 * sessionStorage key for the public application draft. Contract:
 * `{ formData: FranchiseeApplication, currentStep: number }` — saved while the
 * form is dirty, restored when the modal opens, cleared on successful submit
 * and on confirmed discard.
 */
const DRAFT_STORAGE_KEY = "franchise-application-draft";

function createInitialFormData(): FranchiseeApplication {
  return {
    franchisee: {
      name: "",
      dob: new Date(),
      bloodGroup: "",
      communicationAddress: "",
      city: "",
      state: "",
      pincode: "",
      phone: "",
      mail: "",
      education: "",
      occupation: "",
      reference: "",
    } as Franchisee,
    franchise: {
      name: "",
      type: "",
      status: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      programIds: [],
      franchiseeId: 0,
    } as Franchise,
  };
}

function clearStoredDraft() {
  try {
    sessionStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // Storage unavailable (private mode etc.) — nothing to clear.
  }
}

/** SSR-safe read of a saved draft; returns null when absent or unparsable. */
function readStoredDraft(): {
  formData: FranchiseeApplication;
  currentStep: number;
} | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as {
      formData?: FranchiseeApplication;
      currentStep?: number;
    };
    if (!saved?.formData) return null;
    const fresh = createInitialFormData();
    return {
      formData: {
        franchisee: {
          ...fresh.franchisee,
          ...saved.formData.franchisee,
          dob: saved.formData.franchisee?.dob
            ? new Date(saved.formData.franchisee.dob)
            : fresh.franchisee.dob,
        } as Franchisee,
        franchise: {
          ...fresh.franchise,
          ...saved.formData.franchise,
        } as Franchise,
      },
      currentStep:
        typeof saved.currentStep === "number"
          ? Math.min(Math.max(1, saved.currentStep), FORM_STEPS.length)
          : 1,
    };
  } catch {
    return null;
  }
}

/**
 * Per-step validation rules, declared once.
 *
 * These stay zod-only rather than moving to react-hook-form like the other
 * application modals, for two reasons specific to this form:
 *  - the payload is NESTED (franchisee / franchise) and is persisted verbatim
 *    to sessionStorage as an in-progress draft, so the raw object is the unit
 *    of work, not a flat field map;
 *  - the error keys deliberately do not match field paths — `franchiseeCity`
 *    carries either the state or the city message, `centerCity` likewise —
 *    which is what lets one slot show one message at a time.
 * Moving to RHF would mean renaming every key and rewriting the draft
 * persistence for no behavioural gain.
 *
 * `else if` chains are preserved exactly: within a group only the first
 * failure is reported, in the original priority order.
 */
const issue = (
  ctx: z.RefinementCtx,
  path: string,
  message: string,
): void => {
  ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
};

export const STEP_SCHEMAS: Record<
  number,
  z.ZodType<FranchiseeApplication> | undefined
> = {
  1: z.custom<FranchiseeApplication>().superRefine((v, ctx) => {
    if (!v.franchisee.name.trim()) issue(ctx, "name", "Name is required");
    if (!v.franchisee.dob) issue(ctx, "dob", "Date of birth is required");
  }),
  2: z.custom<FranchiseeApplication>().superRefine((v, ctx) => {
    if (!v.franchisee.state?.trim()) {
      issue(ctx, "franchiseeCity", "State is required");
    } else if (!v.franchisee.city.trim()) {
      issue(ctx, "franchiseeCity", "City is required");
    } else if (!v.franchisee.pincode?.trim()) {
      issue(ctx, "franchiseePincode", "Pincode is required");
    }
  }),
  3: z.custom<FranchiseeApplication>().superRefine((v, ctx) => {
    if (!v.franchisee.phone.trim()) {
      issue(ctx, "phone", "Phone number is required");
    }
    if (!v.franchisee.mail.trim()) {
      issue(ctx, "mail", "Email is required");
    } else if (!/\S+@\S+\.\S+/.test(v.franchisee.mail)) {
      issue(ctx, "mail", "Please enter a valid email address");
    }
  }),
  4: z.custom<FranchiseeApplication>().superRefine((v, ctx) => {
    if (!v.franchise.name.trim()) {
      issue(ctx, "franchiseName", "Franchise name is required");
    }
    if (!v.franchise.type.trim()) {
      issue(ctx, "franchiseType", "Franchise type is required");
    }
    if (!v.franchise.programIds || v.franchise.programIds.length !== 1) {
      issue(ctx, "programIds", "Select exactly one program");
    }
    if (!v.franchise.address.trim()) {
      issue(ctx, "address", "Centre address is required");
    }
    if (!v.franchise.state?.trim()) {
      issue(ctx, "centerCity", "State is required");
    } else if (!v.franchise.city.trim()) {
      issue(ctx, "centerCity", "City is required");
    } else if (!v.franchise.pincode?.trim()) {
      issue(ctx, "centerPincode", "Pincode is required");
    }
  }),
};

interface FranchiseApplicationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FranchiseApplicationModal({
  open,
  onOpenChange,
}: FranchiseApplicationModalProps) {
  // Restore an in-progress draft once at mount (survives refresh / accidental
  // navigation away from the public login page). The dialog is closed during
  // hydration, so restoring state here cannot cause a DOM mismatch.
  const [restoredDraft] = useState(readStoredDraft);
  const [currentStep, setCurrentStep] = useState(restoredDraft?.currentStep ?? 1);
  const [formData, setFormData] = useState<FranchiseeApplication>(
    () => restoredDraft?.formData ?? createInitialFormData(),
  );
  // Serialized pristine snapshot — the dirty check compares against this so a
  // restored draft (or any edit) counts as dirty; updated on every reset.
  const [pristineJson, setPristineJson] = useState<string>(() =>
    JSON.stringify(restoredDraft ? createInitialFormData() : formData),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const {
    programs,
    isFetching: programsFetching,
    isError: programsError,
    ensureProgramsRequested,
    hasRequested: programsFetchRequested,
  } = useProgramsOnDemand();

  const isDirty =
    !submitted && JSON.stringify(formData) !== pristineJson;

  // Persist the draft while the form is dirty.
  useEffect(() => {
    if (!open || submitted || !isDirty) return;
    try {
      sessionStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({ formData, currentStep }),
      );
    } catch {
      // Storage unavailable — draft persistence is best-effort.
    }
  }, [formData, currentStep, open, submitted, isDirty]);

  const validateCurrentStep = () => {
    const schema = STEP_SCHEMAS[currentStep];
    if (!schema) {
      setErrors({});
      return true;
    }
    const result = schema.safeParse(formData);
    if (result.success) {
      setErrors({});
      return true;
    }
    // First issue per key wins, matching the `else if` priority above.
    const newErrors: Record<string, string> = {};
    for (const problem of result.error.issues) {
      const key = String(problem.path[0]);
      if (!(key in newErrors)) newErrors[key] = problem.message;
    }
    setErrors(newErrors);
    return false;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep((prev) => Math.min(prev + 1, FORM_STEPS.length));
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateCurrentStep()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await applyFranchisee(formData as FranchiseeApplication);

      if (response.status === 201) {
        clearStoredDraft();
        setSubmitted(true);
      }
    } catch (error) {
      sendClientLog({ level: "error", event: "franchise-application-submit-error", message: "Error submitting franchise application", context: { error } });
      handleFormApiError(error, {
        setErrors,
        fieldMap: { email: "mail", phone: "phone", franchiseName: "franchiseName" },
        fieldToStep: { mail: 3, phone: 3, franchiseName: 4 },
        goToStep: setCurrentStep,
        fallback: "Failed to submit application",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    const [object, property] = field.includes(".")
      ? field.split(".")
      : ["franchisee", field];

    setFormData((prev) => {
      let convertedValue: any = value;

      if (property === "dob" && value) {
        convertedValue = new Date(value);
      }

      return {
        ...prev,
        [object]: {
          ...(prev[object as keyof FranchiseeApplication] as unknown as Record<string, unknown>),
          [property]: convertedValue,
        },
      };
    });

    const keysToClear = [field];
    if (field === "franchise.pincode") keysToClear.push("pincode");
    if (field === "franchise.address") keysToClear.push("address");
    if (keysToClear.some((k) => errors[k])) {
      setErrors((prev) => {
        const next = { ...prev };
        keysToClear.forEach((k) => delete next[k]);
        return next;
      });
    }
  };

  const handleProgramSelect = (programId: number) => {
    setFormData((prev) => {
      const currentIds = prev.franchise.programIds || [];
      const newIds =
        currentIds.length === 1 && currentIds[0] === programId
          ? []
          : [programId];

      return {
        ...prev,
        franchise: {
          ...prev.franchise,
          programIds: newIds,
        },
      };
    });

    if (errors.programIds) {
      setErrors((prev) => ({
        ...prev,
        programIds: "",
      }));
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    const fresh = createInitialFormData();
    setFormData(fresh);
    setPristineJson(JSON.stringify(fresh));
    setErrors({});
    setSubmitted(false);
    setIsLoading(false);
    onOpenChange(false);
  };

  const { requestClose, confirmOpen, setConfirmOpen, confirmAndDiscard } =
    useDirtyCloseGuard({
      isDirty,
      onDiscard: () => {
        clearStoredDraft();
        handleClose();
      },
    });

  const handleModalOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      requestClose(false);
    } else {
      onOpenChange(nextOpen);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <DialogFormField id="name" label="Name *">
                <Input
                  id="name"
                  type="text"
                  value={formData.franchisee.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className={cn(
                    "rounded-lg border-border",
                    errors.name && "border-destructive",
                  )}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name}</p>
                )}
              </DialogFormField>
              <DialogFormField id="dob" label="Date of Birth *">
                <DateInput
                  id="dob"
                  value={
                    formData.franchisee.dob instanceof Date
                      ? formData.franchisee.dob.toISOString().split("T")[0]
                      : (formData.franchisee.dob as unknown as string)
                  }
                  onChange={(v) => handleInputChange("dob", v)}
                  className={cn(
                    "rounded-lg border-border",
                    errors.dob && "border-destructive",
                  )}
                />
                {errors.dob && (
                  <p className="text-sm text-destructive">{errors.dob}</p>
                )}
              </DialogFormField>
            </div>

            <DialogFormField id="bloodGroup" label="Blood Group">
              <Select
                value={formData.franchisee.bloodGroup}
                onValueChange={(value) =>
                  handleInputChange("bloodGroup", value)
                }
              >
                <SelectTrigger className="rounded-lg border-border">
                  <SelectValue placeholder="Select blood group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A+">A+</SelectItem>
                  <SelectItem value="A-">A-</SelectItem>
                  <SelectItem value="B+">B+</SelectItem>
                  <SelectItem value="B-">B-</SelectItem>
                  <SelectItem value="AB+">AB+</SelectItem>
                  <SelectItem value="AB-">AB-</SelectItem>
                  <SelectItem value="O+">O+</SelectItem>
                  <SelectItem value="O-">O-</SelectItem>
                </SelectContent>
              </Select>
            </DialogFormField>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <DialogFormField id="communicationAddress" label="Communication Address">
              <Textarea
                id="communicationAddress"
                value={formData.franchisee.communicationAddress}
                onChange={(e) =>
                  handleInputChange("communicationAddress", e.target.value)
                }
                rows={3}
                className="rounded-lg border-border"
              />
            </DialogFormField>

            <div className="flex justify-between gap-2">
              <StateCitySelect
                id="franchiseeCity"
                className="w-full"
                value={formData.franchisee.city}
                stateValue={formData.franchisee.state}
                onChange={(val) =>
                  handleInputChange("franchisee.city", val)
                }
                onStateChange={(val) =>
                  handleInputChange("franchisee.state", val)
                }
                label="City"
                required
                error={errors.franchiseeCity}
              />

              <DialogFormField id="franchiseePincode" label="Pincode *" className="w-[50%]">
                <Input
                  id="franchiseePincode"
                  value={formData.franchisee.pincode ?? ""}
                  onChange={(e) =>
                    handleInputChange("franchisee.pincode", e.target.value)
                  }
                  className={cn(
                    "rounded-lg border-border",
                    errors.franchiseePincode && "border-destructive",
                  )}
                />
                {errors.franchiseePincode && (
                  <p className="text-sm text-destructive">
                    {errors.franchiseePincode}
                  </p>
                )}
              </DialogFormField>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <DialogFormField id="phone" label="Phone Number *">
                <Input
                  id="phone"
                  type="tel"
                  value={formData.franchisee.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className={cn(
                    "rounded-lg border-border",
                    errors.phone && "border-destructive",
                  )}
                />
                {errors.phone && (
                  <p className="text-sm text-destructive">{errors.phone}</p>
                )}
              </DialogFormField>
              <DialogFormField id="mail" label="Email ID *">
                <Input
                  id="mail"
                  type="email"
                  value={formData.franchisee.mail}
                  onChange={(e) => handleInputChange("mail", e.target.value)}
                  className={cn(
                    "rounded-lg border-border",
                    errors.mail && "border-destructive",
                  )}
                />
                {errors.mail && (
                  <p className="text-sm text-destructive">{errors.mail}</p>
                )}
              </DialogFormField>
            </div>

            <DialogFormField id="education" label="Educational Qualification">
              <Input
                id="education"
                type="text"
                value={formData.franchisee.education}
                onChange={(e) => handleInputChange("education", e.target.value)}
                className="rounded-lg border-border"
              />
            </DialogFormField>

            <DialogFormField id="occupation" label="Present Occupation">
              <Input
                id="occupation"
                type="text"
                value={formData.franchisee.occupation}
                onChange={(e) =>
                  handleInputChange("occupation", e.target.value)
                }
                className="rounded-lg border-border"
              />
            </DialogFormField>

            <DialogFormField id="reference" label="Reference">
              <Input
                id="reference"
                type="text"
                value={formData.franchisee.reference}
                onChange={(e) => handleInputChange("reference", e.target.value)}
                className="rounded-lg border-border"
              />
            </DialogFormField>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <DialogFormField id="franchiseName" label="Franchise Name *">
              <Input
                id="franchiseName"
                type="text"
                value={formData.franchise.name}
                onChange={(e) =>
                  handleInputChange("franchise.name", e.target.value)
                }
                className={cn(
                  "rounded-lg border-border",
                  errors.franchiseName && "border-destructive",
                )}
                placeholder="Enter your desired franchise center name"
              />
              {errors.franchiseName && (
                <p className="text-sm text-destructive">{errors.franchiseName}</p>
              )}
            </DialogFormField>

            <DialogFormField id="franchiseType" label="Franchise Type *">
              <Select
                value={formData.franchise.type}
                onValueChange={(value) =>
                  handleInputChange("franchise.type", value)
                }
              >
                <SelectTrigger
                  className={cn(
                    "rounded-lg border-border",
                    errors.franchiseType && "border-destructive",
                  )}
                >
                  <SelectValue placeholder="Select franchise type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Area">Area Franchise</SelectItem>
                  <SelectItem value="Master">Master Franchise</SelectItem>
                  <SelectItem value="School">School Franchise</SelectItem>
                </SelectContent>
              </Select>
              {errors.franchiseType && (
                <p className="text-sm text-destructive">{errors.franchiseType}</p>
              )}
            </DialogFormField>

            <DialogFormField label="Program * (Select one)">
              <Popover
                onOpenChange={(open) => {
                  if (open) ensureProgramsRequested();
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "h-auto min-h-10 w-full justify-between rounded-lg border-border px-3 py-2 text-left font-normal",
                      errors.programIds && "border-destructive",
                    )}
                  >
                    <span className="line-clamp-2 pr-2">
                      {(() => {
                        const ids = formData.franchise.programIds ?? [];
                        if (ids.length === 0) {
                          return (
                            <span className="text-muted-foreground">
                              Click to choose a program...
                            </span>
                          );
                        }
                        if (
                          programsFetchRequested &&
                          programsFetching &&
                          programs.length === 0
                        ) {
                          return "Loading programs...";
                        }
                        const names = ids
                          .map(
                            (id) => programs.find((p) => p.id === id)?.name,
                          )
                          .filter(Boolean) as string[];
                        if (names.length === ids.length) {
                          return names[0];
                        }
                        return ids.length === 1
                          ? `Program #${ids[0]}`
                          : "Select exactly one program";
                      })()}
                    </span>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="z-[100] w-[var(--radix-popover-trigger-width)] max-h-80 overflow-y-auto p-3"
                  align="start"
                >
                  {programsError ? (
                    <p className="text-sm text-destructive">
                      Could not load programs. Try again.
                    </p>
                  ) : programsFetchRequested &&
                    programsFetching &&
                    programs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Loading programs...
                    </p>
                  ) : programs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No programs available
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {programs.map((program) => (
                        <div
                          key={program.id}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`program-${program.id}`}
                            checked={
                              (formData.franchise.programIds ?? [])[0] === program.id
                            }
                            onCheckedChange={() => handleProgramSelect(program.id)}
                          />
                          <label
                            htmlFor={`program-${program.id}`}
                            className="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {program.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </PopoverContent>
              </Popover>
              {errors.programIds && (
                <p className="text-sm text-destructive">{errors.programIds}</p>
              )}
            </DialogFormField>

            <div className="space-y-4 border-t border-border pt-4">
              <DialogFormField id="address" label="Centre Address *">
                <Textarea
                  id="address"
                  value={formData.franchise.address}
                  onChange={(e) =>
                    handleInputChange("franchise.address", e.target.value)
                  }
                  className={cn(
                    "rounded-lg border-border",
                    errors.address && "border-destructive",
                  )}
                  rows={3}
                  placeholder="Full address of the proposed centre"
                />
                {errors.address && (
                  <p className="text-sm text-destructive">{errors.address}</p>
                )}
              </DialogFormField>

              <div className="flex justify-between gap-2">
                <StateCitySelect
                  id="centerCity"
                  className="w-full"
                  value={formData.franchise.city}
                  stateValue={formData.franchise.state}
                  onChange={(val) => handleInputChange("franchise.city", val)}
                  onStateChange={(val) =>
                    handleInputChange("franchise.state", val)
                  }
                  label="City"
                  required
                  error={errors.centerCity}
                />

                <DialogFormField id="centerPincode" label="Pincode *" className="w-[50%]">
                  <Input
                    id="centerPincode"
                    value={formData.franchise.pincode ?? ""}
                    onChange={(e) =>
                      handleInputChange("franchise.pincode", e.target.value)
                    }
                    className={cn(
                      "rounded-lg border-border",
                      errors.centerPincode && "border-destructive",
                    )}
                  />
                  {errors.centerPincode && (
                    <p className="text-sm text-destructive">
                      {errors.centerPincode}
                    </p>
                  )}
                </DialogFormField>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (submitted) {
    return (
      <SuccessDialog
        open={open}
        onOpenChange={handleModalOpenChange}
        title="Application Submitted!"
        description="Your franchise application has been submitted successfully. Our admin team will review it first. Login credentials and agreement access will be sent only after approval."
        actionLabel="Close"
        onAction={handleClose}
      />
    );
  }

  return (
    <>
      <MultiStepDialog
        open={open}
        onOpenChange={handleModalOpenChange}
        size="xl"
        title="Franchise Application Form"
        description="Complete your franchise application step by step"
        headerIcon={Calculator}
        steps={FORM_STEPS}
        currentStep={currentStep}
        onBack={handlePrevious}
        onNext={handleNext}
        onSubmit={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
        isSubmitting={isLoading}
        submitLabel="Submit Application"
      >
        <div className="space-y-4">{renderStepContent()}</div>
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
