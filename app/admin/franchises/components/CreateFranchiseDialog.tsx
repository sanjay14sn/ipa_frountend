"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToggleField } from "@/components/shared/toggle-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  MultiStepDialog,
  SuccessDialog,
  type StepDef,
} from "@/components/shared/dialog";
import {
  FranchiseType,
  FranchiseStatus,
  BloodGroup,
} from "@/services/franchise.enums";
import { StateCitySelect } from "@/components/StateCitySelect";
import { Program } from "@/services/program.service";
import {
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle,
  UserPlus,
  IndianRupee,
  Percent,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error-utils";
import { selectInputValueOnFocus } from "@/lib/select-input-on-focus";
import {
  setupExistingFranchise,
  listAllFranchisees,
  type SetupExistingFranchisePayload,
  type SetupPriorPayment,
  type SetupProgram,
  type PaymentMode,
  type FranchiseeOption,
} from "@/services/franchisee.service";
import { Checkbox } from "@/components/ui/checkbox";
import React from "react";

const FORM_STEPS: StepDef[] = [
  { id: 1, title: "Personal Info" },
  { id: 2, title: "Franchise Details" },
  { id: 3, title: "Agreement Terms" },
  { id: 4, title: "Security" },
];

interface CreateFranchiseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programs: Program[];
  onSuccess: () => void;
}

interface PriorPaymentRow {
  amount: number;
  paidAt: string;
  mode: PaymentMode;
  reference: string;
  matchKind: "down-payment" | "installment" | "agreement-fee";
  matchSequence: number;
}

interface ProgramPayroll {
  programId: number;
  franchiseFee: number;
  kitCost: number;
  materialCost: number;
  monthlyFee: number;
  ciShare: number;
  franchiseShare: number;
  royalty: number;
  /** Number of EMI installments. 0 means lump-sum (no EMI). */
  installment: number;
  gstFranchiseFee: boolean;
  gstRoyalty: boolean;
  gstMaterialCost: boolean;
  /** Agreement signing date (YYYY-MM-DD). Drives expiry = signedAt + tenure. */
  signedAt: string;
  /** Agreement tenure in months. Drives expiry = signedAt + tenure. */
  tenure: number;
  /** EMI configuration (when installment > 0). */
  downPayment: number;
  priorPayments: PriorPaymentRow[];
  /** Lump-sum optional single payment (when installment === 0). */
  lumpSumPayment: PriorPaymentRow | null;
}

export function CreateFranchiseDialog({
  open,
  onOpenChange,
  programs,
  onSuccess,
}: CreateFranchiseDialogProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [franchiseeMode, setFranchiseeMode] = useState<"new" | "existing">(
    "new",
  );
  const [existingFranchiseeId, setExistingFranchiseeId] = useState<string>("");
  const [franchiseeOptions, setFranchiseeOptions] = useState<FranchiseeOption[]>([]);
  const [franchiseeOptionsLoading, setFranchiseeOptionsLoading] = useState(false);

  const [formData, setFormData] = useState({
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
    selectedPrograms: [] as number[],
  });

  const [programPayrolls, setProgramPayrolls] = useState<
    Record<number, ProgramPayroll>
  >({});

  // Load franchisees for the picker the first time the user switches to "existing" mode.
  useEffect(() => {
    if (franchiseeMode !== "existing" || franchiseeOptions.length > 0) return;
    setFranchiseeOptionsLoading(true);
    listAllFranchisees()
      .then(setFranchiseeOptions)
      .catch(() => {/* silently ignore; user can still type search */})
      .finally(() => setFranchiseeOptionsLoading(false));
  }, [franchiseeMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const validateCurrentStep = () => {
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
        if (formData.selectedPrograms.length === 0) {
          newErrors.selectedPrograms = "At least one program must be selected";
        }
        break;

      case 3: // Payroll — require a signing date per selected program
        for (const programId of formData.selectedPrograms) {
          const p = programPayrolls[programId];
          if (!p?.signedAt) {
            newErrors[`signedAt-${programId}`] =
              "Agreement signing date is required";
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

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep((prev) => Math.min(prev + 1, FORM_STEPS.length));
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

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
          installment: 0,
          gstFranchiseFee: false,
          gstRoyalty: false,
          gstMaterialCost: false,
          signedAt: new Date().toISOString().slice(0, 10),
          tenure: 12,
          downPayment: 0,
          priorPayments: [],
          lumpSumPayment: null,
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

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;

    setLoading(true);
    try {
      const programs: SetupProgram[] = formData.selectedPrograms.map(
        (programId) => {
          const p = programPayrolls[programId];
          const installmentEnabled = Number(p.installment) > 0;
          const base: SetupProgram = {
            programId: p.programId,
            terms: {
              franchiseFee: Number(p.franchiseFee) || 0,
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
          };

          if (installmentEnabled) {
            base.emi = {
              enabled: true,
              downPaymentAmount: Number(p.downPayment) || 0,
              installmentMonths: Number(p.installment),
              priorPayments: p.priorPayments.map((row) =>
                priorRowToPayload(row),
              ),
            };
          } else {
            base.lumpSum = {
              enabled: false,
              lumpSumPayment: p.lumpSumPayment
                ? priorRowToPayload({
                    ...p.lumpSumPayment,
                    matchKind: "agreement-fee",
                  })
                : undefined,
            };
          }

          return base;
        },
      );

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
          city: formData.city,
          state: formData.state,
          address: formData.franchiseAddress || undefined,
          pincode: formData.pincode || undefined,
        },
        programs,
      };

      await setupExistingFranchise(payload);

      setSubmitted(true);
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 2000);
    } catch (error: any) {
      console.error("Failed to create franchise:", error);
      toast.error(getErrorMessage(error, "Failed to create franchise"));
    } finally {
      setLoading(false);
    }
  };

  function priorRowToPayload(row: PriorPaymentRow): SetupPriorPayment {
    return {
      amount: Number(row.amount) || 0,
      paidAt: row.paidAt,
      mode: row.mode,
      reference: row.reference || undefined,
      matches:
        row.matchKind === "installment"
          ? {
              kind: "installment",
              sequenceNumber: Number(row.matchSequence) || 1,
            }
          : { kind: row.matchKind },
    };
  }

  const handleClose = () => {
    setCurrentStep(1);
    setFormData({
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
      selectedPrograms: [],
    });
    setProgramPayrolls({});
    setErrors({});
    setSubmitted(false);
    setLoading(false);
    setFranchiseeMode("new");
    setExistingFranchiseeId("");
    setFranchiseeOptions([]);
    onOpenChange(false);
  };

  const handleModalOpenChange = (open: boolean) => {
    if (!open) {
      handleClose();
    } else {
      onOpenChange(open);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1: // Personal Info
        return (
          <div className="space-y-4">
            <ToggleField
              tone="primary"
              label="Franchisee"
              value={franchiseeMode}
              onValueChange={(v) => setFranchiseeMode(v as typeof franchiseeMode)}
              options={[
                {
                  value: "new",
                  label: "Create new franchisee",
                  description: "Capture the franchisee's personal details below.",
                },
                {
                  value: "existing",
                  label: "Attach existing franchisee",
                  description:
                    "Skip personal-info capture and link this franchise to a franchisee already in the system.",
                },
              ]}
            />
            {franchiseeMode === "existing" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="existingFranchiseeId">
                    Existing Franchisee *
                  </Label>
                  <Select
                    value={existingFranchiseeId}
                    onValueChange={(value) => {
                      setExistingFranchiseeId(value);
                      if (errors.existingFranchiseeId)
                        setErrors({ ...errors, existingFranchiseeId: "" });
                    }}
                  >
                    <SelectTrigger
                      className={
                        errors.existingFranchiseeId ? "border-red-500" : ""
                      }
                    >
                      <SelectValue
                        placeholder={
                          franchiseeOptionsLoading
                            ? "Loading…"
                            : "Select franchisee"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {franchiseeOptions.map((f) => (
                        <SelectItem key={f.id} value={String(f.id)}>
                          {f.name} ({f.mail})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.existingFranchiseeId && (
                    <p className="text-red-500 text-sm">
                      {errors.existingFranchiseeId}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <StateCitySelect
                    stateValue={formData.state}
                    value={formData.city}
                    onStateChange={(state) => {
                      setFormData({ ...formData, state, city: "" });
                      if (errors.city) setErrors({ ...errors, city: "" });
                    }}
                    onChange={(city: string) => {
                      setFormData({ ...formData, city });
                      if (errors.city) setErrors({ ...errors, city: "" });
                    }}
                    error={errors.city}
                  />
                </div>
              </div>
            )}
            {franchiseeMode === "new" && (
            <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (errors.name) setErrors({ ...errors, name: "" });
                  }}
                  className={errors.name ? "border-red-500" : ""}
                />
                {errors.name && (
                  <p className="text-red-500 text-sm">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (errors.email) setErrors({ ...errors, email: "" });
                  }}
                  className={errors.email ? "border-red-500" : ""}
                />
                {errors.email && (
                  <p className="text-red-500 text-sm">{errors.email}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => {
                    setFormData({ ...formData, phone: e.target.value });
                    if (errors.phone) setErrors({ ...errors, phone: "" });
                  }}
                  className={errors.phone ? "border-red-500" : ""}
                />
                {errors.phone && (
                  <p className="text-red-500 text-sm">{errors.phone}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth</Label>
                <DateInput
                  id="dob"
                  value={formData.dob}
                  onChange={(v) =>
                    setFormData({ ...formData, dob: v })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bloodGroup">Blood Group</Label>
                <Select
                  value={formData.bloodGroup}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      bloodGroup: value as BloodGroup,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(BloodGroup).map((bg) => (
                      <SelectItem key={bg} value={bg}>
                        {bg}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="education">Education</Label>
                <Input
                  id="education"
                  value={formData.education}
                  onChange={(e) =>
                    setFormData({ ...formData, education: e.target.value })
                  }
                />
              </div>
            </div>

            <StateCitySelect
              id="city"
              value={formData.city}
              stateValue={formData.state}
              onChange={(val) => {
                setFormData({ ...formData, city: val });
                if (errors.city) setErrors({ ...errors, city: "" });
              }}
              onStateChange={(val) => {
                setFormData({ ...formData, state: val });
                if (errors.city) setErrors({ ...errors, city: "" });
              }}
              label="City"
              required
              error={errors.city}
            />

            <div className="space-y-2">
              <Label htmlFor="pincode">Pincode *</Label>
              <Input
                id="pincode"
                inputMode="numeric"
                maxLength={6}
                value={formData.pincode}
                onChange={(e) => {
                  setFormData({ ...formData, pincode: e.target.value });
                  if (errors.pincode) setErrors({ ...errors, pincode: "" });
                }}
                className={errors.pincode ? "border-red-500" : ""}
              />
              {errors.pincode ? (
                <p className="text-red-500 text-sm">{errors.pincode}</p>
              ) : null}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="communicationAddress">
                  Communication Address
                </Label>
                <Input
                  id="communicationAddress"
                  value={formData.communicationAddress}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      communicationAddress: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="occupation">Occupation</Label>
                <Input
                  id="occupation"
                  value={formData.occupation}
                  onChange={(e) =>
                    setFormData({ ...formData, occupation: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference">Reference</Label>
              <Input
                id="reference"
                value={formData.reference}
                onChange={(e) =>
                  setFormData({ ...formData, reference: e.target.value })
                }
              />
            </div>
            </>
            )}
          </div>
        );

      case 2: // Franchise Details
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="franchiseName">Franchise Name *</Label>
                <Input
                  id="franchiseName"
                  value={formData.franchiseName}
                  onChange={(e) => {
                    setFormData({ ...formData, franchiseName: e.target.value });
                    if (errors.franchiseName)
                      setErrors({ ...errors, franchiseName: "" });
                  }}
                  className={errors.franchiseName ? "border-red-500" : ""}
                />
                {errors.franchiseName && (
                  <p className="text-red-500 text-sm">{errors.franchiseName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="franchiseType">Franchise Type *</Label>
                <Select
                  value={formData.franchiseType}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      franchiseType: value as FranchiseType,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(FranchiseType).map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="franchiseAddress">Franchise Address *</Label>
              <Input
                id="franchiseAddress"
                value={formData.franchiseAddress}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    franchiseAddress: e.target.value,
                  });
                  if (errors.franchiseAddress)
                    setErrors({ ...errors, franchiseAddress: "" });
                }}
                className={errors.franchiseAddress ? "border-red-500" : ""}
              />
              {errors.franchiseAddress && (
                <p className="text-red-500 text-sm">
                  {errors.franchiseAddress}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Programs * (Select one or more)</Label>
              <div
                className={`border rounded-md p-4 space-y-3 ${
                  errors.selectedPrograms ? "border-red-500" : "border-border"
                }`}
              >
                {programs.map((program) => (
                  <div key={program.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`program-${program.id}`}
                      checked={formData.selectedPrograms.includes(program.id)}
                      onCheckedChange={() => handleProgramToggle(program.id)}
                    />
                    <label
                      htmlFor={`program-${program.id}`}
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      {program.name}
                    </label>
                  </div>
                ))}
              </div>
              {errors.selectedPrograms && (
                <p className="text-red-500 text-sm">
                  {errors.selectedPrograms}
                </p>
              )}
            </div>
          </div>
        );

      case 3: // Payroll Setup
        return (
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-primary">
              <IndianRupee className="h-4 w-4" />
              Selected program agreement terms
            </h3>
            {formData.selectedPrograms.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border bg-accent/20 px-4 py-10 text-center text-sm text-muted-foreground">
                Please select programs in the previous step.
              </p>
            ) : (
              formData.selectedPrograms.map((programId) => {
                const program = programs.find((p) => p.id === programId);
                const payroll = programPayrolls[programId];
                const installmentEnabled = Number(payroll?.installment ?? 0) > 0;

                return (
                  <Card
                    key={programId}
                    className="overflow-hidden rounded-xl border-border shadow-sm"
                  >
                    <CardHeader className="border-b border-border bg-accent/30 px-4 py-4">
                      <CardTitle className="text-base font-medium text-card-foreground">
                        {program?.name}
                      </CardTitle>
                      <p className="mt-1 text-sm font-normal text-muted-foreground">
                        Fixed agreement terms and recorded payments for this program.
                      </p>
                    </CardHeader>

                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {/* Franchise Fee */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label className="text-sm font-medium text-card-foreground">
                              Franchise Fee
                            </Label>
                            <label className="flex cursor-pointer items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5">
                              <input
                                type="checkbox"
                                checked={payroll?.gstFranchiseFee || false}
                                onChange={(e) =>
                                  updateProgramPayroll(
                                    programId,
                                    "gstFranchiseFee",
                                    e.target.checked,
                                  )
                                }
                              />
                              <span className="text-xs text-primary">GST Inc.</span>
                            </label>
                          </div>
                          <div className="relative">
                            <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="number"
                              min="0"
                              value={payroll?.franchiseFee || ""}
                              onChange={(e) =>
                                updateProgramPayroll(
                                  programId,
                                  "franchiseFee",
                                  e.target.value === "" ? 0 : Number(e.target.value),
                                )
                              }
                              onFocus={selectInputValueOnFocus}
                              className="h-10 pl-10"
                              placeholder="0"
                            />
                          </div>
                        </div>

                        {/* Kit Cost */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-card-foreground">
                            Kit Cost
                          </Label>
                          <div className="relative">
                            <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="number"
                              min="0"
                              value={payroll?.kitCost || ""}
                              onChange={(e) =>
                                updateProgramPayroll(
                                  programId,
                                  "kitCost",
                                  e.target.value === "" ? 0 : Number(e.target.value),
                                )
                              }
                              onFocus={selectInputValueOnFocus}
                              className="h-10 pl-10"
                              placeholder="0"
                            />
                          </div>
                        </div>

                        {/* Material Cost */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label className="text-sm font-medium text-card-foreground">
                              Material Cost
                            </Label>
                            <label className="flex cursor-pointer items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5">
                              <input
                                type="checkbox"
                                checked={payroll?.gstMaterialCost || false}
                                onChange={(e) =>
                                  updateProgramPayroll(
                                    programId,
                                    "gstMaterialCost",
                                    e.target.checked,
                                  )
                                }
                              />
                              <span className="text-xs text-primary">GST Inc.</span>
                            </label>
                          </div>
                          <div className="relative">
                            <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="number"
                              min="0"
                              value={payroll?.materialCost || ""}
                              onChange={(e) =>
                                updateProgramPayroll(
                                  programId,
                                  "materialCost",
                                  e.target.value === "" ? 0 : Number(e.target.value),
                                )
                              }
                              onFocus={selectInputValueOnFocus}
                              className="h-10 pl-10"
                              placeholder="0"
                            />
                          </div>
                        </div>

                        {/* Monthly Fee */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-card-foreground">
                            Monthly Fee
                          </Label>
                          <div className="relative">
                            <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="number"
                              min="0"
                              value={payroll?.monthlyFee || ""}
                              onChange={(e) =>
                                updateProgramPayroll(
                                  programId,
                                  "monthlyFee",
                                  e.target.value === "" ? 0 : Number(e.target.value),
                                )
                              }
                              onFocus={selectInputValueOnFocus}
                              className="h-10 pl-10"
                              placeholder="0"
                            />
                          </div>
                        </div>

                        {/* Royalty */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label className="text-sm font-medium text-card-foreground">
                              Royalty
                            </Label>
                            <label className="flex cursor-pointer items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5">
                              <input
                                type="checkbox"
                                checked={payroll?.gstRoyalty || false}
                                onChange={(e) =>
                                  updateProgramPayroll(
                                    programId,
                                    "gstRoyalty",
                                    e.target.checked,
                                  )
                                }
                              />
                              <span className="text-xs text-primary">GST Inc.</span>
                            </label>
                          </div>
                          <div className="relative">
                            <Percent className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={payroll?.royalty || ""}
                              onChange={(e) =>
                                updateProgramPayroll(
                                  programId,
                                  "royalty",
                                  e.target.value === "" ? 0 : Number(e.target.value),
                                )
                              }
                              onFocus={selectInputValueOnFocus}
                              className="h-10 pl-10"
                              placeholder="0"
                            />
                          </div>
                        </div>

                        {/* CI Share */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-card-foreground">
                            CI Share
                          </Label>
                          <div className="relative">
                            <Percent className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={payroll?.ciShare || ""}
                              onChange={(e) =>
                                updateProgramPayroll(
                                  programId,
                                  "ciShare",
                                  e.target.value === "" ? 0 : Number(e.target.value),
                                )
                              }
                              onFocus={selectInputValueOnFocus}
                              className="h-10 pl-10"
                              placeholder="0"
                            />
                          </div>
                        </div>

                        {/* Franchise Share */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-card-foreground">
                            Franchise Share
                          </Label>
                          <div className="relative">
                            <Percent className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={payroll?.franchiseShare || ""}
                              onChange={(e) =>
                                updateProgramPayroll(
                                  programId,
                                  "franchiseShare",
                                  e.target.value === "" ? 0 : Number(e.target.value),
                                )
                              }
                              onFocus={selectInputValueOnFocus}
                              className="h-10 pl-10"
                              placeholder="0"
                            />
                          </div>
                        </div>

                        {/* Agreement Signing Date */}
                        <div className="space-y-2">
                          <Label
                            htmlFor={`signed-at-${programId}`}
                            className="text-sm font-medium text-card-foreground"
                          >
                            Agreement Signing Date
                          </Label>
                          <DateInput
                            id={`signed-at-${programId}`}
                            value={payroll?.signedAt || ""}
                            max={new Date().toISOString().slice(0, 10)}
                            onChange={(v) =>
                              updateProgramPayroll(
                                programId,
                                "signedAt",
                                v,
                              )
                            }
                            className="h-10"
                          />
                          {errors[`signedAt-${programId}`] && (
                            <p className="text-xs text-destructive">
                              {errors[`signedAt-${programId}`]}
                            </p>
                          )}
                        </div>

                        {/* Agreement Tenure (months) */}
                        <div className="space-y-2">
                          <Label
                            htmlFor={`tenure-${programId}`}
                            className="text-sm font-medium text-card-foreground"
                          >
                            Agreement Tenure (months)
                          </Label>
                          <Input
                            id={`tenure-${programId}`}
                            type="number"
                            min={1}
                            step={1}
                            value={payroll?.tenure ?? ""}
                            onChange={(e) =>
                              updateProgramPayroll(
                                programId,
                                "tenure",
                                e.target.value === ""
                                  ? 0
                                  : Math.max(1, Math.floor(Number(e.target.value))),
                              )
                            }
                            onFocus={selectInputValueOnFocus}
                            className="h-10"
                            placeholder="12"
                          />
                          {errors[`tenure-${programId}`] && (
                            <p className="text-xs text-destructive">
                              {errors[`tenure-${programId}`]}
                            </p>
                          )}
                        </div>

                        {/* Installment plan (full-width subcard) */}
                        <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/10 p-4 md:col-span-2 lg:col-span-3">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`installment-plan-${programId}`}
                              checked={installmentEnabled}
                              onCheckedChange={(checked) =>
                                updateProgramPayroll(
                                  programId,
                                  "installment",
                                  checked === true
                                    ? Math.max(1, Number(payroll?.installment) || 12)
                                    : 0,
                                )
                              }
                            />
                            <Label
                              htmlFor={`installment-plan-${programId}`}
                              className="cursor-pointer text-sm font-medium text-card-foreground"
                            >
                              Installment plan
                            </Label>
                          </div>
                          <div className="grid max-w-lg grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-card-foreground">
                                Installment Months
                              </Label>
                              <Input
                                type="number"
                                min={1}
                                value={installmentEnabled ? (payroll?.installment || "") : ""}
                                disabled={!installmentEnabled}
                                onChange={(e) =>
                                  updateProgramPayroll(
                                    programId,
                                    "installment",
                                    e.target.value === ""
                                      ? 0
                                      : Math.max(
                                          1,
                                          Math.floor(Number(e.target.value)) || 1,
                                        ),
                                  )
                                }
                                className="h-10"
                                placeholder="0"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-card-foreground">
                                Down Payment Amount
                              </Label>
                              <div className="relative">
                                <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                  type="number"
                                  min="0"
                                  value={payroll?.downPayment || ""}
                                  disabled={!installmentEnabled}
                                  onChange={(e) =>
                                    updateProgramPayroll(
                                      programId,
                                      "downPayment",
                                      e.target.value === ""
                                        ? 0
                                        : Number(e.target.value),
                                    )
                                  }
                                  className="h-10 pl-10"
                                  placeholder="0"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <PaymentsAndEmiSection
                        programId={programId}
                        payroll={payroll}
                        onUpdate={updateProgramPayroll}
                      />
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        );

      case 4: // Security
        return (
          <div className="space-y-4">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-card-foreground">
              {franchiseeMode === "existing"
                ? "The selected existing franchisee keeps their current credentials. Skip this step."
                : "A temporary password is auto-generated and emailed to the new franchisee. The values entered below are informational only."}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimum 8 characters"
                    value={formData.password}
                    onChange={(e) => {
                      setFormData({ ...formData, password: e.target.value });
                      if (errors.password)
                        setErrors({ ...errors, password: "" });
                    }}
                    className={errors.password ? "border-red-500" : ""}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-card-foreground"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-sm">{errors.password}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-enter password"
                    value={formData.confirmPassword}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        confirmPassword: e.target.value,
                      });
                      if (errors.confirmPassword)
                        setErrors({ ...errors, confirmPassword: "" });
                    }}
                    className={errors.confirmPassword ? "border-red-500" : ""}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-card-foreground"
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={16} />
                    ) : (
                      <Eye size={16} />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-red-500 text-sm">
                    {errors.confirmPassword}
                  </p>
                )}
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
        title="Franchise Created!"
        description="The franchise has been successfully setup with all details and payroll configuration."
      />
    );
  }

  return (
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
  );
}

interface PaymentsAndEmiSectionProps {
  programId: number;
  payroll: ProgramPayroll | undefined;
  onUpdate: (
    programId: number,
    field: keyof ProgramPayroll,
    value: any,
  ) => void;
}

function emptyPriorPaymentRow(
  matchKind: PriorPaymentRow["matchKind"] = "down-payment",
): PriorPaymentRow {
  return {
    amount: 0,
    paidAt: new Date().toISOString().slice(0, 10),
    mode: "cash",
    reference: "",
    matchKind,
    matchSequence: 1,
  };
}

function PaymentsAndEmiSection({
  programId,
  payroll,
  onUpdate,
}: PaymentsAndEmiSectionProps) {
  if (!payroll) return null;
  const installmentsEnabled = Number(payroll.installment) > 0;

  return (
    <div className="mt-4 space-y-3 border-t border-border pt-4">
      <h3 className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-primary">
        <CreditCard className="h-4 w-4" />
        Already received payments
      </h3>

      {installmentsEnabled ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              Record installments or down-payment already collected from the
              franchisee. These will be linked to the corresponding receivable
              items.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() =>
                onUpdate(programId, "priorPayments", [
                  ...payroll.priorPayments,
                  emptyPriorPaymentRow(
                    Number(payroll.downPayment) > 0
                      ? "down-payment"
                      : "installment",
                  ),
                ])
              }
            >
              + Add payment
            </Button>
          </div>
          {payroll.priorPayments.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-accent/20 px-4 py-6 text-center text-sm text-muted-foreground">
              No prior payments recorded yet.
            </p>
          ) : (
            payroll.priorPayments.map((row, idx) => (
              <PriorPaymentEditor
                key={idx}
                row={row}
                emiMode
                onChange={(next) => {
                  const copy = [...payroll.priorPayments];
                  copy[idx] = next;
                  onUpdate(programId, "priorPayments", copy);
                }}
                onRemove={() => {
                  const copy = payroll.priorPayments.filter((_, i) => i !== idx);
                  onUpdate(programId, "priorPayments", copy);
                }}
              />
            ))
          )}
        </div>
      ) : (
        <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
          <ToggleField
            name={`lumpsum-${programId}`}
            tone="primary"
            label="One-time agreement-fee payment"
            value={payroll.lumpSumPayment ? "collected" : "none"}
            onValueChange={(v) =>
              onUpdate(
                programId,
                "lumpSumPayment",
                v === "collected" ? emptyPriorPaymentRow("agreement-fee") : null,
              )
            }
            options={[
              {
                value: "none",
                label: "Not collected",
                description: "No prior agreement-fee payment to record.",
              },
              {
                value: "collected",
                label: "Record collected payment",
                description:
                  "Capture details of a one-time agreement-fee payment already received from the franchisee.",
              },
            ]}
          />
          {payroll.lumpSumPayment && (
            <PriorPaymentEditor
              row={payroll.lumpSumPayment}
              emiMode={false}
              onChange={(next) => onUpdate(programId, "lumpSumPayment", next)}
              onRemove={() => onUpdate(programId, "lumpSumPayment", null)}
            />
          )}
        </div>
      )}
    </div>
  );
}

function PriorPaymentEditor({
  row,
  emiMode,
  onChange,
  onRemove,
}: {
  row: PriorPaymentRow;
  emiMode: boolean;
  onChange: (next: PriorPaymentRow) => void;
  onRemove: () => void;
}) {
  return (
    <div className="grid grid-cols-12 gap-2 items-end rounded-xl border border-border bg-card p-3">
      <div className="col-span-2 space-y-1">
        <Label className="text-xs">Amount (₹)</Label>
        <Input
          type="number"
          min="0"
          value={row.amount === 0 ? "" : row.amount}
          onChange={(e) =>
            onChange({
              ...row,
              amount: e.target.value === "" ? 0 : Number(e.target.value),
            })
          }
        />
      </div>
      <div className="col-span-2 space-y-1">
        <Label className="text-xs">Paid On</Label>
        <DateInput
          value={row.paidAt}
          onChange={(v) => onChange({ ...row, paidAt: v })}
        />
      </div>
      <div className="col-span-2 space-y-1">
        <Label className="text-xs">Mode</Label>
        <select
          className="w-full rounded-md border border-input bg-background h-9 text-sm px-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          value={row.mode}
          onChange={(e) =>
            onChange({ ...row, mode: e.target.value as PaymentMode })
          }
        >
          <option value="cash">Cash</option>
          <option value="upi">UPI</option>
          <option value="bank-transfer">Bank Transfer</option>
          <option value="razorpay">Razorpay</option>
          <option value="cheque">Cheque</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div className="col-span-2 space-y-1">
        <Label className="text-xs">Reference #</Label>
        <Input
          value={row.reference}
          onChange={(e) => onChange({ ...row, reference: e.target.value })}
        />
      </div>
      {emiMode && (
        <>
          <div className="col-span-1 space-y-1">
            <Label className="text-xs">Pays</Label>
            <select
              className="w-full rounded-md border border-input bg-background h-9 text-sm px-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={row.matchKind}
              onChange={(e) =>
                onChange({
                  ...row,
                  matchKind: e.target.value as PriorPaymentRow["matchKind"],
                })
              }
            >
              <option value="down-payment">Down</option>
              <option value="installment">EMI</option>
            </select>
          </div>
          <div className="col-span-1 space-y-1">
            <Label className="text-xs">EMI #</Label>
            <Input
              type="number"
              min="1"
              disabled={row.matchKind !== "installment"}
              value={row.matchSequence}
              onChange={(e) =>
                onChange({ ...row, matchSequence: Number(e.target.value) || 1 })
              }
            />
          </div>
        </>
      )}
      <div className={emiMode ? "col-span-2" : "col-span-4"}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRemove}
          className="text-destructive hover:text-destructive"
        >
          Remove
        </Button>
      </div>
    </div>
  );
}
