"use client";

import { useState, useEffect } from "react";
import {
  ConfirmDialog,
  MultiStepDialog,
  SuccessDialog,
  type StepDef,
} from "@/components/shared/dialog";
import { useDirtyCloseGuard } from "@/hooks/use-dirty-close-guard";
import { FranchiseType, BloodGroup } from "@/services/franchise.enums";
import { UserPlus } from "lucide-react";
import { handleFormApiError } from "@/lib/form-errors";
import {
  setupExistingFranchise,
  listAllFranchisees,
  type SetupExistingFranchisePayload,
  type SetupAdvancePayment,
  type SetupProgram,
  type FranchiseeOption,
} from "@/services/franchisee.service";
import { Program } from "@/services/program.service";
import { sendClientLog } from "@/lib/client-telemetry";
import { useFormSteps } from "@/hooks/use-form-steps";
import { CREATE_FRANCHISE_STEPS as FORM_STEPS } from "@/lib/constants/education";
import {
  StepBasicInfo,
  StepFranchiseDetails,
  StepAgreement,
  StepSecurity,
  type FormData,
  type ProgramPayroll,
  type FranchiseeMode,
} from "./create-franchise";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------


const INITIAL_FORM_DATA: FormData = {
  name: "",
  email: "",
  phone: "",
  dob: "",
  bloodGroup: BloodGroup.O_POSITIVE,
  communicationAddress: "",
  city: "",
  state: "",
  pincode: "",
  education: "",
  occupation: "",
  reference: "",
  password: "",
  confirmPassword: "",
  franchiseName: "",
  franchiseType: FranchiseType.AREA,
  franchiseAddress: "",
  franchiseCity: "",
  franchiseState: "",
  franchisePincode: "",
  selectedPrograms: [],
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CreateFranchiseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programs: Program[];
  onSuccess: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CreateFranchiseDialog({
  open,
  onOpenChange,
  programs,
  onSuccess,
}: CreateFranchiseDialogProps) {
  const { currentStep, setCurrentStep, handleNext, handlePrevious } =
    useFormSteps(FORM_STEPS.length, () => validateCurrentStep());
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [franchiseeMode, setFranchiseeMode] = useState<FranchiseeMode>("new");
  const [existingFranchiseeId, setExistingFranchiseeId] = useState<string>("");
  const [franchiseeOptions, setFranchiseeOptions] = useState<FranchiseeOption[]>([]);
  const [franchiseeOptionsLoading, setFranchiseeOptionsLoading] = useState(false);

  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [programPayrolls, setProgramPayrolls] = useState<Record<number, ProgramPayroll>>({});

  // Load franchisees for the picker the first time the user switches to "existing" mode.
  useEffect(() => {
    if (franchiseeMode !== "existing" || franchiseeOptions.length > 0) return;
    setFranchiseeOptionsLoading(true);
    listAllFranchisees()
      .then(setFranchiseeOptions)
      .catch(() => {/* silently ignore; user can still type search */})
      .finally(() => setFranchiseeOptionsLoading(false));
  }, [franchiseeMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  const validateCurrentStep = (): boolean => {
    const newErrors: Record<string, string> = {};

    switch (currentStep) {
      case 1: // Personal Info
        if (franchiseeMode === "existing") {
          if (!existingFranchiseeId.trim() || Number.isNaN(Number(existingFranchiseeId))) {
            newErrors.existingFranchiseeId =
              "Please select a franchisee from the dropdown";
          }
          if (!formData.state.trim()) newErrors.city = "State is required";
          else if (!formData.city.trim()) newErrors.city = "City is required";
          break;
        }
        if (!formData.name.trim()) newErrors.name = "Name is required";
        if (!formData.email.trim()) {
          newErrors.email = "Email is required";
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
          newErrors.email = "Please enter a valid email";
        }
        if (!formData.phone.trim()) newErrors.phone = "Phone is required";
        if (!formData.state.trim()) newErrors.city = "State is required";
        else if (!formData.city.trim()) newErrors.city = "City is required";
        if (!formData.pincode.trim()) newErrors.pincode = "Pincode is required";
        else if (!/^\d{6}$/.test(formData.pincode.trim())) {
          newErrors.pincode = "Enter a valid 6-digit pincode";
        }
        break;

      case 2: // Franchise Details
        if (!formData.franchiseName.trim()) {
          newErrors.franchiseName = "Franchise name is required";
        }
        if (!formData.franchiseAddress.trim()) {
          newErrors.franchiseAddress = "Franchise address is required";
        }
        if (!formData.franchiseState.trim()) {
          newErrors.franchiseState = "State is required";
        }
        if (!formData.franchiseCity.trim()) {
          newErrors.franchiseCity = "City is required";
        }
        if (formData.franchisePincode && !/^\d{6}$/.test(formData.franchisePincode)) {
          newErrors.franchisePincode = "Pincode must be 6 digits";
        }
        if (formData.selectedPrograms.length === 0) {
          newErrors.selectedPrograms = "At least one program must be selected";
        }
        break;

      case 3: // Agreement Terms — require a signing date and validate payments
        for (const programId of formData.selectedPrograms) {
          const p = programPayrolls[programId];
          if (!p?.signedAt) {
            newErrors[`signedAt-${programId}`] =
              "Agreement signing date is required";
          }
          if (!p) continue;
          const franchiseFee = Number(p.franchiseFee) || 0;
          const paidSum = p.paidPayments.reduce(
            (acc, r) => acc + (Number(r.amount) || 0),
            0,
          );
          if (paidSum > franchiseFee + 0.001) {
            newErrors[`paid-${programId}`] = "Paid total exceeds franchise fee";
          }
          p.paidPayments.forEach((row, idx) => {
            if (!(Number(row.amount) > 0)) {
              newErrors[`paid-${programId}-${idx}-amount`] = "Amount required";
            }
            if (!row.paidAt) {
              newErrors[`paid-${programId}-${idx}-paidAt`] = "Date required";
            } else if (new Date(row.paidAt) > new Date()) {
              newErrors[`paid-${programId}-${idx}-paidAt`] = "Payment date cannot be in the future";
            }
          });
          if (
            p.unpaidSplitEnabled &&
            (!Number.isInteger(Number(p.unpaidSplitCount)) ||
              Number(p.unpaidSplitCount) < 1)
          ) {
            newErrors[`split-${programId}`] =
              "Installment count must be at least 1";
          }
          const unpaidAmount = Math.max(0, franchiseFee - paidSum);
          if (unpaidAmount > 0 && !p.unpaidFirstDueDate) {
            newErrors[`unpaidDueDate-${programId}`] =
              "Due date is required for the unpaid amount";
          }
        }
        break;

      case 4: // Security (only for new franchisee; password is auto-emailed)
        if (franchiseeMode === "existing") break;
        // Password field is informational only — backend auto-generates and
        // emails the credentials. Skip strict validation.
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ---------------------------------------------------------------------------
  // Program helpers
  // ---------------------------------------------------------------------------

  const handleProgramToggle = (programId: number) => {
    const isSelected = formData.selectedPrograms.includes(programId);

    if (isSelected) {
      setFormData({
        ...formData,
        selectedPrograms: formData.selectedPrograms.filter(
          (id) => id !== programId,
        ),
      });
      const newPayrolls = { ...programPayrolls };
      delete newPayrolls[programId];
      setProgramPayrolls(newPayrolls);
    } else {
      setFormData({
        ...formData,
        selectedPrograms: [...formData.selectedPrograms, programId],
      });
      setProgramPayrolls({
        ...programPayrolls,
        [programId]: {
          programId,
          franchiseFee: 0,
          kitCost: 0,
          materialCost: 0,
          monthlyFee: 0,
          ciShare: 0,
          franchiseShare: 0,
          royalty: 0,
          gstFranchiseFee: false,
          gstRoyalty: false,
          gstMaterialCost: false,
          signedAt: new Date().toISOString().slice(0, 10),
          tenure: 12,
          paidPayments: [],
          unpaidSplitEnabled: false,
          unpaidSplitCount: 1,
          unpaidFirstDueDate: (() => {
            const d = new Date();
            d.setMonth(d.getMonth() + 1);
            return d.toISOString().slice(0, 10);
          })(),
        },
      });
    }

    if (errors.selectedPrograms) {
      setErrors((prev) => ({ ...prev, selectedPrograms: "" }));
    }
  };

  const updateProgramPayroll = (
    programId: number,
    field: keyof ProgramPayroll,
    value: any,
  ) => {
    setProgramPayrolls({
      ...programPayrolls,
      [programId]: {
        ...programPayrolls[programId],
        [field]: value,
      },
    });
  };

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;

    setLoading(true);
    try {
      const setupPrograms: SetupProgram[] = formData.selectedPrograms.map(
        (programId) => {
          const p = programPayrolls[programId];
          const franchiseFee = Number(p.franchiseFee) || 0;
          const paidSum = p.paidPayments.reduce(
            (acc, r) => acc + (Number(r.amount) || 0),
            0,
          );
          const unpaidAmount = Math.max(0, franchiseFee - paidSum);
          const installmentEnabled = unpaidAmount > 0;

          const advancePayments: SetupAdvancePayment[] = p.paidPayments.map(
            (row) => ({
              amount: Number(row.amount) || 0,
              paidAt: row.paidAt,
              mode: row.mode,
              reference: row.reference || undefined,
            }),
          );

          const base: SetupProgram = {
            programId: p.programId,
            terms: {
              franchiseFee,
              kitCost: Number(p.kitCost) || 0,
              materialCost: Number(p.materialCost) || 0,
              monthlyFee: Number(p.monthlyFee) || 0,
              ciShare: Number(p.ciShare) || 0,
              franchiseShare: Number(p.franchiseShare) || 0,
              royalty: Number(p.royalty) || 0,
              gstFranchiseFee: !!p.gstFranchiseFee,
              gstRoyalty: !!p.gstRoyalty,
              gstMaterialCost: !!p.gstMaterialCost,
              tenure: Math.max(1, Math.floor(Number(p.tenure) || 12)),
            },
            signedAt: p.signedAt,
            installmentEnabled,
            advancePayments,
          };

          if (installmentEnabled) {
            const installmentMonths = p.unpaidSplitEnabled
              ? Math.max(1, Math.floor(Number(p.unpaidSplitCount) || 1))
              : 1;
            base.emi = {
              enabled: true,
              downPaymentAmount: 0,
              installmentMonths,
              priorPayments: [],
              firstDueDate: p.unpaidFirstDueDate || undefined,
            };
          } else {
            base.lumpSum = { enabled: false };
          }

          return base;
        },
      );

      // Amounts are NET principal; backend grosses up GST on payment rows (RCV-1).
      const payload: SetupExistingFranchisePayload = {
        franchisee:
          franchiseeMode === "existing"
            ? {
                mode: "existing",
                franchiseeId: Number(existingFranchiseeId),
              }
            : {
                mode: "new",
                newFranchisee: {
                  name: formData.name,
                  dob: formData.dob,
                  bloodGroup: formData.bloodGroup,
                  communicationAddress: formData.communicationAddress,
                  city: formData.city,
                  state: formData.state,
                  pincode: formData.pincode,
                  phone: formData.phone,
                  email: formData.email,
                  education: formData.education || undefined,
                  occupation: formData.occupation || undefined,
                  reference: formData.reference || undefined,
                },
              },
        franchise: {
          name: formData.franchiseName,
          type: formData.franchiseType,
          city: formData.franchiseCity,
          state: formData.franchiseState,
          address: formData.franchiseAddress || undefined,
          pincode: formData.franchisePincode || undefined,
        },
        programs: setupPrograms,
      };

      await setupExistingFranchise(payload);

      setSubmitted(true);
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 2000);
    } catch (error: any) {
      sendClientLog({
        level: "error",
        event: "franchise-create-error",
        message: "Failed to create franchise",
        context: { error },
      });
      handleFormApiError(error, {
        setErrors,
        fieldMap: { email: "email", phone: "phone", franchiseName: "franchiseName" },
        fieldToStep: { email: 1, phone: 1, franchiseName: 2 },
        goToStep: setCurrentStep,
        fallback: "Failed to create franchise",
      });
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Close / reset
  // ---------------------------------------------------------------------------

  const handleClose = () => {
    setCurrentStep(1);
    setFormData(INITIAL_FORM_DATA);
    setProgramPayrolls({});
    setErrors({});
    setSubmitted(false);
    setLoading(false);
    setFranchiseeMode("new");
    setExistingFranchiseeId("");
    setFranchiseeOptions([]);
    onOpenChange(false);
  };

  const isDirty =
    !submitted &&
    (JSON.stringify(formData) !== JSON.stringify(INITIAL_FORM_DATA) ||
      Object.keys(programPayrolls).length > 0 ||
      franchiseeMode !== "new" ||
      existingFranchiseeId !== "");

  const { requestClose, confirmOpen, setConfirmOpen, confirmAndDiscard } =
    useDirtyCloseGuard({ isDirty, onDiscard: handleClose });

  const handleModalOpenChange = (open: boolean) => {
    if (!open) {
      requestClose(false);
    } else {
      onOpenChange(open);
    }
  };

  // ---------------------------------------------------------------------------
  // Step content
  // ---------------------------------------------------------------------------

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <StepBasicInfo
            formData={formData}
            setFormData={setFormData}
            errors={errors}
            setErrors={setErrors}
            franchiseeMode={franchiseeMode}
            setFranchiseeMode={setFranchiseeMode}
            existingFranchiseeId={existingFranchiseeId}
            setExistingFranchiseeId={setExistingFranchiseeId}
            franchiseeOptions={franchiseeOptions}
            franchiseeOptionsLoading={franchiseeOptionsLoading}
          />
        );
      case 2:
        return (
          <StepFranchiseDetails
            formData={formData}
            setFormData={setFormData}
            errors={errors}
            setErrors={setErrors}
            programs={programs}
            onProgramToggle={handleProgramToggle}
          />
        );
      case 3:
        return (
          <StepAgreement
            selectedPrograms={formData.selectedPrograms}
            programs={programs}
            programPayrolls={programPayrolls}
            onUpdatePayroll={updateProgramPayroll}
            errors={errors}
          />
        );
      case 4:
        return (
          <StepSecurity
            formData={formData}
            setFormData={setFormData}
            errors={errors}
            setErrors={setErrors}
            franchiseeMode={franchiseeMode}
          />
        );
      default:
        return null;
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (submitted) {
    return (
      <SuccessDialog
        open={open}
        onOpenChange={handleModalOpenChange}
        title="Franchise Created!"
        description="The franchise has been successfully setup with all details and payroll configuration."
      />
    );
  }

  return (
    <>
      <MultiStepDialog
        open={open}
        onOpenChange={handleModalOpenChange}
        size="xl"
        title="Setup Existing Franchise"
        description="Complete all sections to setup the franchise with payroll"
        headerIcon={UserPlus}
        steps={FORM_STEPS}
        currentStep={currentStep}
        onBack={handlePrevious}
        onNext={handleNext}
        onSubmit={handleSubmit}
        isSubmitting={loading}
        submitLabel="Setup Franchise"
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
