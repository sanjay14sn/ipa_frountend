"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FranchiseType, FranchiseStatus, BloodGroup } from "@/services/franchise.enums";
import { Program } from "@/services/program.service";
import { Eye, EyeOff, ArrowRight, CheckCircle, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { createFranchiseeByAdmin, createPayrollDetails, type ProgramPayrollRequest } from "@/services/franchisee.service";
import { Checkbox } from "@/components/ui/checkbox";
import React from "react";

// Define the steps for the form
const FORM_STEPS = [
  { id: 1, title: "Personal Info" },
  { id: 2, title: "Franchise Details" },
  { id: 3, title: "Payroll Setup" },
  { id: 4, title: "Security" },
];

// Stepper Component
const Stepper = ({
  currentStep,
  steps,
}: {
  currentStep: number;
  steps: typeof FORM_STEPS;
}) => {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all duration-200 ${
                  currentStep === step.id
                    ? "bg-green-600 text-white border-green-600 shadow-md"
                    : currentStep > step.id
                    ? "bg-green-600 text-white border-green-600"
                    : "bg-white text-gray-400 border-gray-300"
                }`}
              >
                {currentStep > step.id ? "✓" : step.id}
              </div>
              <div className="mt-2 text-center max-w-[80px]">
                <p
                  className={`text-xs font-medium leading-tight ${
                    currentStep >= step.id ? "text-gray-900" : "text-gray-400"
                  }`}
                >
                  {step.title}
                </p>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className="flex items-center justify-center flex-1 max-w-[60px] px-2">
                <div
                  className={`h-0.5 w-full transition-all duration-200 ${
                    currentStep > step.id ? "bg-green-600" : "bg-gray-300"
                  }`}
                />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

interface CreateFranchiseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programs: Program[];
  onSuccess: () => void;
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
  installment: number;
  totalAmount: number;
  gstInclusive: boolean;
  freeload: boolean;
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
  
  const [formData, setFormData] = useState({
    name: "Rajesh Kumar",
    email: "rajesh.test2025@example.com",
    phone: "+919123456789",
    dob: "1985-05-15",
    bloodGroup: BloodGroup.O_POSITIVE,
    communicationAddress: "123, MG Road, Koramangala, Bangalore, Karnataka - 560034",
    city: "Bangalore",
    education: "MBA in Business Administration",
    occupation: "Former IT Professional",
    reference: "Referred by existing franchisee",
    password: "Test@123",
    confirmPassword: "Test@123",
    franchiseName: "IPA Koramangala Center",
    franchiseType: FranchiseType.AREA,
    franchiseAddress: "456, 1st Floor, HSR Layout, Bangalore, Karnataka - 560102",
    selectedPrograms: [1, 2] as number[],
  });

  const [programPayrolls, setProgramPayrolls] = useState<Record<number, ProgramPayroll>>({
    1: {
      programId: 1,
      franchiseFee: 50000,
      kitCost: 15000,
      materialCost: 10000,
      monthlyFee: 5000,
      ciShare: 30,
      franchiseShare: 60,
      royalty: 10,
      installment: 3,
      totalAmount: 75000,
      gstInclusive: true,
      freeload: false,
    },
    2: {
      programId: 2,
      franchiseFee: 45000,
      kitCost: 12000,
      materialCost: 8000,
      monthlyFee: 4500,
      ciShare: 30,
      franchiseShare: 60,
      royalty: 10,
      installment: 2,
      totalAmount: 65000,
      gstInclusive: true,
      freeload: false,
    },
  });

  const validateCurrentStep = () => {
    const newErrors: Record<string, string> = {};

    switch (currentStep) {
      case 1: // Personal Info
        if (!formData.name.trim()) newErrors.name = "Name is required";
        if (!formData.email.trim()) {
          newErrors.email = "Email is required";
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
          newErrors.email = "Please enter a valid email";
        }
        if (!formData.phone.trim()) newErrors.phone = "Phone is required";
        if (!formData.city.trim()) newErrors.city = "City is required";
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

      case 3: // Payroll - no validation needed, defaults are OK
        break;

      case 4: // Security
        if (!formData.password) {
          newErrors.password = "Password is required";
        } else if (formData.password.length < 8) {
          newErrors.password = "Password must be at least 8 characters";
        }
        if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = "Passwords do not match";
        }
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
        selectedPrograms: formData.selectedPrograms.filter((id) => id !== programId),
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
          totalAmount: 0,
          gstInclusive: false,
          freeload: false,
        },
      });
    }

    if (errors.selectedPrograms) {
      setErrors((prev) => ({ ...prev, selectedPrograms: "" }));
    }
  };

  const updateProgramPayroll = (programId: number, field: keyof ProgramPayroll, value: any) => {
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
      const response = await createFranchiseeByAdmin({
        franchisee: {
          name: formData.name,
          mail: formData.email,
          phone: formData.phone,
          dob: new Date(formData.dob),
          bloodGroup: formData.bloodGroup,
          communicationAddress: formData.communicationAddress,
          city: formData.city,
          education: formData.education,
          occupation: formData.occupation,
          reference: formData.reference,
          refreshToken: "",
          password: formData.password,
        },
        franchise: {
          name: formData.franchiseName,
          type: formData.franchiseType,
          status: FranchiseStatus.ACTIVE,
          address: formData.franchiseAddress,
          programIds: formData.selectedPrograms,
          franchiseeId: 0,
        },
      });

      const franchiseId = response.result.franchise.id;
      const payrollRequests: ProgramPayrollRequest[] = formData.selectedPrograms.map(
        (programId) => programPayrolls[programId]
      );

      await createPayrollDetails(franchiseId, {
        programPayrolls: payrollRequests,
      });

      setSubmitted(true);
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 2000);
    } catch (error: any) {
      console.error("Failed to create franchise:", error);
      toast.error(error.response?.data?.message || "Failed to create franchise");
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
                {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
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
                {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
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
                {errors.phone && <p className="text-red-500 text-sm">{errors.phone}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth</Label>
                <Input
                  id="dob"
                  type="date"
                  value={formData.dob}
                  onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bloodGroup">Blood Group</Label>
                <Select
                  value={formData.bloodGroup}
                  onValueChange={(value) =>
                    setFormData({ ...formData, bloodGroup: value as BloodGroup })
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
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => {
                    setFormData({ ...formData, city: e.target.value });
                    if (errors.city) setErrors({ ...errors, city: "" });
                  }}
                  className={errors.city ? "border-red-500" : ""}
                />
                {errors.city && <p className="text-red-500 text-sm">{errors.city}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="education">Education</Label>
                <Input
                  id="education"
                  value={formData.education}
                  onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="communicationAddress">Communication Address</Label>
                <Input
                  id="communicationAddress"
                  value={formData.communicationAddress}
                  onChange={(e) =>
                    setFormData({ ...formData, communicationAddress: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="occupation">Occupation</Label>
                <Input
                  id="occupation"
                  value={formData.occupation}
                  onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference">Reference</Label>
              <Input
                id="reference"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              />
            </div>
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
                    if (errors.franchiseName) setErrors({ ...errors, franchiseName: "" });
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
                    setFormData({ ...formData, franchiseType: value as FranchiseType })
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
                  setFormData({ ...formData, franchiseAddress: e.target.value });
                  if (errors.franchiseAddress) setErrors({ ...errors, franchiseAddress: "" });
                }}
                className={errors.franchiseAddress ? "border-red-500" : ""}
              />
              {errors.franchiseAddress && (
                <p className="text-red-500 text-sm">{errors.franchiseAddress}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Programs * (Select one or more)</Label>
              <div
                className={`border rounded-md p-4 space-y-3 ${
                  errors.selectedPrograms ? "border-red-500" : "border-gray-200"
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
                <p className="text-red-500 text-sm">{errors.selectedPrograms}</p>
              )}
            </div>
          </div>
        );

      case 3: // Payroll Setup
        return (
          <div className="space-y-4">
            {formData.selectedPrograms.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                Please select programs in the previous step
              </p>
            ) : (
              formData.selectedPrograms.map((programId) => {
                const program = programs.find((p) => p.id === programId);
                const payroll = programPayrolls[programId];

                return (
                  <div key={programId} className="border rounded-lg p-4 space-y-3 bg-gray-50">
                    <h4 className="font-medium text-sm text-gray-800">{program?.name}</h4>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Franchise Fee (₹)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={payroll?.franchiseFee || 0}
                          onChange={(e) =>
                            updateProgramPayroll(programId, "franchiseFee", Number(e.target.value))
                          }
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Kit Cost (₹)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={payroll?.kitCost || 0}
                          onChange={(e) =>
                            updateProgramPayroll(programId, "kitCost", Number(e.target.value))
                          }
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Material Cost (₹)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={payroll?.materialCost || 0}
                          onChange={(e) =>
                            updateProgramPayroll(programId, "materialCost", Number(e.target.value))
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Monthly Fee (₹)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={payroll?.monthlyFee || 0}
                          onChange={(e) =>
                            updateProgramPayroll(programId, "monthlyFee", Number(e.target.value))
                          }
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">CI Share (%)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={payroll?.ciShare || 0}
                          onChange={(e) =>
                            updateProgramPayroll(programId, "ciShare", Number(e.target.value))
                          }
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Franchise Share (%)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={payroll?.franchiseShare || 0}
                          onChange={(e) =>
                            updateProgramPayroll(programId, "franchiseShare", Number(e.target.value))
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Royalty (%)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={payroll?.royalty || 0}
                          onChange={(e) =>
                            updateProgramPayroll(programId, "royalty", Number(e.target.value))
                          }
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Installment</Label>
                        <Input
                          type="number"
                          min="0"
                          value={payroll?.installment || 0}
                          onChange={(e) =>
                            updateProgramPayroll(programId, "installment", Number(e.target.value))
                          }
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Total Amount (₹)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={payroll?.totalAmount || 0}
                          onChange={(e) =>
                            updateProgramPayroll(programId, "totalAmount", Number(e.target.value))
                          }
                        />
                      </div>
                    </div>

                    <div className="flex gap-6">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`gst-${programId}`}
                          checked={payroll?.gstInclusive || false}
                          onCheckedChange={(checked) =>
                            updateProgramPayroll(programId, "gstInclusive", checked)
                          }
                        />
                        <Label htmlFor={`gst-${programId}`} className="text-xs">
                          GST Inclusive
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`freeload-${programId}`}
                          checked={payroll?.freeload || false}
                          onCheckedChange={(checked) =>
                            updateProgramPayroll(programId, "freeload", checked)
                          }
                        />
                        <Label htmlFor={`freeload-${programId}`} className="text-xs">
                          Freeload
                        </Label>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        );

      case 4: // Security
        return (
          <div className="space-y-4">
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
                      if (errors.password) setErrors({ ...errors, password: "" });
                    }}
                    className={errors.password ? "border-red-500" : ""}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}
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
                      setFormData({ ...formData, confirmPassword: e.target.value });
                      if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: "" });
                    }}
                    className={errors.confirmPassword ? "border-red-500" : ""}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-red-500 text-sm">{errors.confirmPassword}</p>
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
      <Dialog open={open} onOpenChange={handleModalOpenChange}>
        <DialogContent className="max-w-md w-full mx-4">
          <DialogHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <DialogTitle className="text-2xl font-bold text-gray-900">
              Franchise Created!
            </DialogTitle>
            <DialogDescription className="text-center">
              The franchise has been successfully setup with all details and payroll configuration.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleModalOpenChange}>
      <DialogContent className="max-w-4xl w-full mx-4 max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="text-center border-b border-gray-200 pb-4 flex-shrink-0">
          <div className="flex justify-center mb-4">
            <UserPlus className="h-8 w-8 text-green-700" />
          </div>
          <DialogTitle className="text-xl font-bold text-gray-900">
            Setup Existing Franchise
          </DialogTitle>
          <DialogDescription>
            Complete all sections to setup the franchise with payroll
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Progress Stepper */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <Stepper currentStep={currentStep} steps={FORM_STEPS} />
            </div>

            {/* Form Content */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                    {FORM_STEPS[currentStep - 1].title}
                  </h3>
                  <div className="space-y-4">{renderStepContent()}</div>
                </div>

                {/* Navigation Buttons */}
                {currentStep < FORM_STEPS.length ? (
                  <div className="flex gap-4 pt-6">
                    <div className="flex gap-2">
                      {currentStep > 1 && (
                        <Button type="button" variant="outline" onClick={handlePrevious}>
                          Previous
                        </Button>
                      )}
                    </div>

                    <div className="flex-1" />

                    <Button
                      type="button"
                      onClick={handleNext}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Next
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-4 pt-6">
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={handlePrevious}>
                        Previous
                      </Button>
                    </div>

                    <div className="flex-1" />

                    <Button
                      type="button"
                      onClick={handleSubmit}
                      className="bg-green-600 hover:bg-green-700"
                      disabled={loading}
                    >
                      {loading ? "Setting up..." : "Setup Franchise"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
