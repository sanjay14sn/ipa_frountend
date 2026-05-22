"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { applyFranchisee } from "@/services/franchisee.service";
import { getErrorMessage } from "@/lib/error-utils";
import { toast } from "sonner";
import {
  FranchiseeApplication,
  Franchisee,
  Franchise,
} from "@/services/franchisee.service";
import { useProgramsOnDemand } from "@/hooks/api/program.hooks";
import { StateCitySelect } from "@/components/StateCitySelect";
import { cn } from "@/lib/utils";
import {
  MultiStepDialog,
  SuccessDialog,
  type StepDef,
} from "@/components/shared/dialog";

const FORM_STEPS: StepDef[] = [
  { id: 1, title: "Personal Information" },
  { id: 2, title: "Location & Communication" },
  { id: 3, title: "Contact & Professional" },
  { id: 4, title: "Franchise Details" },
];

interface FranchiseApplicationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FranchiseApplicationModal({
  open,
  onOpenChange,
}: FranchiseApplicationModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FranchiseeApplication>({
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
  });
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

  const validateCurrentStep = () => {
    const newErrors: Record<string, string> = {};

    switch (currentStep) {
      case 1:
        if (!formData.franchisee.name.trim()) {
          newErrors.name = "Name is required";
        }
        if (!formData.franchisee.dob) {
          newErrors.dob = "Date of birth is required";
        }
        break;

      case 2:
        if (!formData.franchisee.state?.trim()) {
          newErrors.franchiseeCity = "State is required";
        } else if (!formData.franchisee.city.trim()) {
          newErrors.franchiseeCity = "City is required";
        } else if (!formData.franchisee.pincode?.trim()) {
          newErrors.franchiseePincode = "Pincode is required";
        }
        break;

      case 3:
        if (!formData.franchisee.phone.trim()) {
          newErrors.phone = "Phone number is required";
        }
        if (!formData.franchisee.mail.trim()) {
          newErrors.mail = "Email is required";
        } else if (!/\S+@\S+\.\S+/.test(formData.franchisee.mail)) {
          newErrors.mail = "Please enter a valid email address";
        }
        break;

      case 4:
        if (!formData.franchise.name.trim()) {
          newErrors.franchiseName = "Franchise name is required";
        }
        if (!formData.franchise.type.trim()) {
          newErrors.franchiseType = "Franchise type is required";
        }
        if (
          !formData.franchise.programIds ||
          formData.franchise.programIds.length !== 1
        ) {
          newErrors.programIds = "Select exactly one program";
        }
        if (!formData.franchise.address.trim()) {
          newErrors.address = "Centre address is required";
        }
        if (!formData.franchise.state?.trim()) {
          newErrors.centerCity = "State is required";
        } else if (!formData.franchise.city.trim()) {
          newErrors.centerCity = "City is required";
        } else if (!formData.franchise.pincode?.trim()) {
          newErrors.centerPincode = "Pincode is required";
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateCurrentStep()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await applyFranchisee(formData as FranchiseeApplication);

      if (response.status === 201) {
        setSubmitted(true);
      }
    } catch (error) {
      console.error("Error submitting application:", error);
      toast.error(getErrorMessage(error, "Failed to submit application"));
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
          ...(prev[object as keyof FranchiseeApplication] as any),
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
    setFormData({
      franchisee: {
        name: "",
        dob: new Date(),
        bloodGroup: "",
        communicationAddress: "",
        phone: "",
        mail: "",
        education: "",
        occupation: "",
        reference: "",
        refreshToken: "",
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
    });
    setErrors({});
    setSubmitted(false);
    setIsLoading(false);
    onOpenChange(false);
  };

  const handleModalOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      handleClose();
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
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
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
              </div>
              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth *</Label>
                <Input
                  id="dob"
                  type="date"
                  value={
                    formData.franchisee.dob instanceof Date
                      ? formData.franchisee.dob.toISOString().split("T")[0]
                      : (formData.franchisee.dob as unknown as string)
                  }
                  onChange={(e) => handleInputChange("dob", e.target.value)}
                  className={cn(
                    "rounded-lg border-border",
                    errors.dob && "border-destructive",
                  )}
                />
                {errors.dob && (
                  <p className="text-sm text-destructive">{errors.dob}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bloodGroup">Blood Group</Label>
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
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="communicationAddress">
                Communication Address
              </Label>
              <Textarea
                id="communicationAddress"
                value={formData.franchisee.communicationAddress}
                onChange={(e) =>
                  handleInputChange("communicationAddress", e.target.value)
                }
                rows={3}
                className="rounded-lg border-border"
              />
            </div>

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

              <div className="w-[50%] space-y-2">
                <Label htmlFor="franchiseePincode">Pincode *</Label>
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
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
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
              </div>
              <div className="space-y-2">
                <Label htmlFor="mail">Email ID *</Label>
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
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="education">Educational Qualification</Label>
              <Input
                id="education"
                type="text"
                value={formData.franchisee.education}
                onChange={(e) => handleInputChange("education", e.target.value)}
                className="rounded-lg border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="occupation">Present Occupation</Label>
              <Input
                id="occupation"
                type="text"
                value={formData.franchisee.occupation}
                onChange={(e) =>
                  handleInputChange("occupation", e.target.value)
                }
                className="rounded-lg border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference">Reference</Label>
              <Input
                id="reference"
                type="text"
                value={formData.franchisee.reference}
                onChange={(e) => handleInputChange("reference", e.target.value)}
                className="rounded-lg border-border"
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="franchiseName">Franchise Name *</Label>
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="franchiseType">Franchise Type *</Label>
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
            </div>

            <div className="space-y-2">
              <Label>Program * (Select one)</Label>
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
            </div>

            <div className="space-y-4 border-t border-border pt-4">
              <div className="space-y-2">
                <Label htmlFor="address">Centre Address *</Label>
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
              </div>

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

                <div className="w-[50%] space-y-2">
                  <Label htmlFor="centerPincode">Pincode *</Label>
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
                </div>
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
  );
}
