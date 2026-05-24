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
  type SetupAdvancePayment,
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

interface PaidPaymentRow {
  amount: number;
  paidAt: string;
  mode: PaymentMode;
  reference: string;
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
  gstFranchiseFee: boolean;
  gstRoyalty: boolean;
  gstMaterialCost: boolean;
  /** Agreement signing date (YYYY-MM-DD). Drives expiry = signedAt + tenure. */
  signedAt: string;
  /** Agreement tenure in months. Drives expiry = signedAt + tenure. */
  tenure: number;
  /** Historical payments already received against this program. */
  paidPayments: PaidPaymentRow[];
  /** When true, the unpaid remainder is split into N equal EMIs. */
  unpaidSplitEnabled: boolean;
  /** Number of EMI receivables to create for the unpaid remainder. */
  unpaidSplitCount: number;
  /**
   * Explicit due date of the first unpaid receivable (yyyy-mm-dd).
   * When the unpaid amount is split, subsequent EMIs are scheduled at
   * monthly intervals from this date.
   */
  unpaidFirstDueDate: string;
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
    franchiseCity: "",
    franchiseState: "",
    franchisePincode: "",
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
            newErrors[`paid-${programId}`] =
              "Paid total exceeds franchise fee";
          }
          p.paidPayments.forEach((row, idx) => {
            if (!(Number(row.amount) > 0)) {
              newErrors[`paid-${programId}-${idx}-amount`] = "Amount required";
            }
            if (!row.paidAt) {
              newErrors[`paid-${programId}-${idx}-paidAt`] = "Date required";
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

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;

    setLoading(true);
    try {
      const programs: SetupProgram[] = formData.selectedPrograms.map(
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
      franchiseCity: "",
      franchiseState: "",
      franchisePincode: "",
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

            <StateCitySelect
              id="franchiseCity"
              value={formData.franchiseCity}
              stateValue={formData.franchiseState}
              onChange={(val) => {
                setFormData({ ...formData, franchiseCity: val });
                if (errors.franchiseCity)
                  setErrors({ ...errors, franchiseCity: "" });
              }}
              onStateChange={(val) => {
                setFormData({ ...formData, franchiseState: val });
                if (errors.franchiseState)
                  setErrors({ ...errors, franchiseState: "" });
              }}
              label="City"
              required
              error={errors.franchiseCity || errors.franchiseState}
            />

            <div className="space-y-2">
              <Label htmlFor="franchisePincode">Pincode</Label>
              <Input
                id="franchisePincode"
                inputMode="numeric"
                maxLength={6}
                value={formData.franchisePincode}
                onChange={(e) => {
                  const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setFormData({ ...formData, franchisePincode: digitsOnly });
                  if (errors.franchisePincode)
                    setErrors({ ...errors, franchisePincode: "" });
                }}
                placeholder="6-digit pincode"
                className={errors.franchisePincode ? "border-red-500" : ""}
              />
              {errors.franchisePincode && (
                <p className="text-red-500 text-sm">
                  {errors.franchisePincode}
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

                      </div>

                      <PaidUnpaidSection
                        programId={programId}
                        payroll={payroll}
                        onUpdate={updateProgramPayroll}
                        errors={errors}
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

interface PaidUnpaidSectionProps {
  programId: number;
  payroll: ProgramPayroll | undefined;
  onUpdate: (
    programId: number,
    field: keyof ProgramPayroll,
    value: any,
  ) => void;
  errors: Record<string, string>;
}

function emptyPaidRow(): PaidPaymentRow {
  return {
    amount: 0,
    paidAt: new Date().toISOString().slice(0, 10),
    mode: "cash",
    reference: "",
  };
}

function formatRupees(n: number): string {
  return n.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
}

function formatDueDateDisplay(iso: string): string {
  if (!iso) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function PaidUnpaidSection({
  programId,
  payroll,
  onUpdate,
  errors,
}: PaidUnpaidSectionProps) {
  if (!payroll) return null;
  const franchiseFee = Number(payroll.franchiseFee) || 0;
  const paidSum = payroll.paidPayments.reduce(
    (acc, r) => acc + (Number(r.amount) || 0),
    0,
  );
  const unpaidAmount = Math.max(0, franchiseFee - paidSum);
  const splitCount = payroll.unpaidSplitEnabled
    ? Math.max(1, Math.floor(Number(payroll.unpaidSplitCount) || 1))
    : 1;
  const perInstallment = unpaidAmount > 0 ? unpaidAmount / splitCount : 0;

  return (
    <div className="mt-4 space-y-4 border-t border-border pt-4">
      <h3 className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-primary">
        <CreditCard className="h-4 w-4" />
        Received payments
      </h3>

      {/* Paid subcard */}
      <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-card-foreground">
              Paid payments{" "}
              <span className="ml-1 text-xs text-muted-foreground">
                ({payroll.paidPayments.length})
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              Record any amounts already received against the franchise fee.
              Paid is optional.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() =>
              onUpdate(programId, "paidPayments", [
                ...payroll.paidPayments,
                emptyPaidRow(),
              ])
            }
          >
            + Add payment
          </Button>
        </div>

        {payroll.paidPayments.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-background px-4 py-5 text-center text-sm text-muted-foreground">
            No payments recorded yet.
          </p>
        ) : (
          <div className="space-y-2">
            {payroll.paidPayments.map((row, idx) => (
              <PaidPaymentEditor
                key={idx}
                row={row}
                amountError={errors[`paid-${programId}-${idx}-amount`]}
                paidAtError={errors[`paid-${programId}-${idx}-paidAt`]}
                onChange={(next) => {
                  const copy = [...payroll.paidPayments];
                  copy[idx] = next;
                  onUpdate(programId, "paidPayments", copy);
                }}
                onRemove={() => {
                  const copy = payroll.paidPayments.filter((_, i) => i !== idx);
                  onUpdate(programId, "paidPayments", copy);
                }}
              />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-primary/10 pt-2 text-sm">
          <span className="text-muted-foreground">Total paid</span>
          <span className="font-medium text-card-foreground">
            ₹{formatRupees(paidSum)}
          </span>
        </div>
        {errors[`paid-${programId}`] && (
          <p className="text-xs text-destructive">
            {errors[`paid-${programId}`]}
          </p>
        )}
      </div>

      {/* Unpaid subcard */}
      <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-card-foreground">
            Unpaid balance
          </p>
          <span className="text-sm font-semibold text-card-foreground">
            ₹{formatRupees(unpaidAmount)}
          </span>
        </div>

        {unpaidAmount === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-background px-4 py-3 text-center text-sm text-muted-foreground">
            Fully paid — no receivable plan will be created.
          </p>
        ) : (
          <>
            <ToggleField
              name={`unpaid-split-${programId}`}
              tone="primary"
              label="Split unpaid balance into EMIs"
              value={payroll.unpaidSplitEnabled ? "split" : "single"}
              onValueChange={(v) =>
                onUpdate(programId, "unpaidSplitEnabled", v === "split")
              }
              options={[
                {
                  value: "single",
                  label: "Single receivable",
                  description:
                    "One receivable for the full unpaid amount.",
                },
                {
                  value: "split",
                  label: "Split into EMIs",
                  description:
                    "Break the unpaid amount into N equal monthly receivables.",
                },
              ]}
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {payroll.unpaidSplitEnabled && (
                <div className="space-y-2">
                  <Label
                    htmlFor={`unpaid-count-${programId}`}
                    className="text-sm font-medium text-card-foreground"
                  >
                    Number of EMIs
                  </Label>
                  <Input
                    id={`unpaid-count-${programId}`}
                    type="number"
                    min={1}
                    step={1}
                    value={payroll.unpaidSplitCount || ""}
                    onChange={(e) =>
                      onUpdate(
                        programId,
                        "unpaidSplitCount",
                        e.target.value === ""
                          ? 1
                          : Math.max(
                              1,
                              Math.floor(Number(e.target.value)) || 1,
                            ),
                      )
                    }
                    onFocus={selectInputValueOnFocus}
                    className="h-10"
                    placeholder="1"
                  />
                  {errors[`split-${programId}`] && (
                    <p className="text-xs text-destructive">
                      {errors[`split-${programId}`]}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label
                  htmlFor={`unpaid-due-date-${programId}`}
                  className="text-sm font-medium text-card-foreground"
                >
                  {payroll.unpaidSplitEnabled && splitCount > 1
                    ? "First due date"
                    : "Due date"}
                </Label>
                <DateInput
                  id={`unpaid-due-date-${programId}`}
                  value={payroll.unpaidFirstDueDate}
                  onChange={(v) =>
                    onUpdate(programId, "unpaidFirstDueDate", v)
                  }
                  min={payroll.signedAt || undefined}
                  className="h-10"
                />
                {errors[`unpaidDueDate-${programId}`] && (
                  <p className="text-xs text-destructive">
                    {errors[`unpaidDueDate-${programId}`]}
                  </p>
                )}
              </div>
            </div>

            <p className="rounded-lg border border-dashed border-border bg-background px-4 py-3 text-sm text-card-foreground">
              {splitCount > 1
                ? `${splitCount} receivables of ₹${formatRupees(perInstallment)} each, starting ${formatDueDateDisplay(payroll.unpaidFirstDueDate)}`
                : `1 receivable of ₹${formatRupees(unpaidAmount)} due ${formatDueDateDisplay(payroll.unpaidFirstDueDate)}`}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function PaidPaymentEditor({
  row,
  amountError,
  paidAtError,
  onChange,
  onRemove,
}: {
  row: PaidPaymentRow;
  amountError?: string;
  paidAtError?: string;
  onChange: (next: PaidPaymentRow) => void;
  onRemove: () => void;
}) {
  return (
    <div className="grid grid-cols-12 items-end gap-2 rounded-lg border border-border bg-card p-3">
      <div className="col-span-3 space-y-1">
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
          onFocus={selectInputValueOnFocus}
          className={amountError ? "border-destructive" : ""}
          placeholder="0"
        />
        {amountError && (
          <p className="text-[11px] text-destructive">{amountError}</p>
        )}
      </div>
      <div className="col-span-3 space-y-1">
        <Label className="text-xs">Paid On</Label>
        <DateInput
          value={row.paidAt}
          onChange={(v) => onChange({ ...row, paidAt: v })}
          className={paidAtError ? "border-destructive" : ""}
        />
        {paidAtError && (
          <p className="text-[11px] text-destructive">{paidAtError}</p>
        )}
      </div>
      <div className="col-span-2 space-y-1">
        <Label className="text-xs">Mode</Label>
        <select
          className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
      <div className="col-span-3 space-y-1">
        <Label className="text-xs">Reference</Label>
        <Input
          value={row.reference}
          onChange={(e) => onChange({ ...row, reference: e.target.value })}
          placeholder="Optional"
        />
      </div>
      <div className="col-span-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRemove}
          className="w-full text-destructive hover:text-destructive"
          aria-label="Remove payment"
        >
          ×
        </Button>
      </div>
    </div>
  );
}
