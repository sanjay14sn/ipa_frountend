"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calculator, ArrowRight, CheckCircle } from "lucide-react";
import React from "react";
import { applyFranchisee } from "@/services/franchisee.service";
import {
  FranchiseeApplication,
  Franchisee,
  Franchise,
} from "@/services/franchisee.service";
import { getAllPrograms, Program } from "@/services/program.service";
import { StateCitySelect } from "@/components/StateCitySelect";

const FORM_STEPS = [
  {
    id: 1,
    title: "Personal Information",
  },
  {
    id: 2,
    title: "Address Information",
  },
  {
    id: 3,
    title: "Contact & Professional",
  },
  {
    id: 4,
    title: "Franchise Details",
  },
];

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
                    ? "bg-blue-600 text-white border-blue-600 shadow-md"
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
      programIds: [],
      franchiseeId: 0,
    } as Franchise,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoadingPrograms, setIsLoadingPrograms] = useState(false);

  useEffect(() => {
    if (open) {
      const fetchPrograms = async () => {
        setIsLoadingPrograms(true);
        try {
          const programsData = await getAllPrograms();
          setPrograms(programsData);
        } catch (error) {
          console.error("Error fetching programs:", error);
          setPrograms([]);
        } finally {
          setIsLoadingPrograms(false);
        }
      };
      fetchPrograms();
    }
  }, [open]);

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
        if (!formData.franchise.address.trim()) {
          newErrors.address = "Centre address is required";
        }
        if (!formData.franchise.state?.trim()) {
          newErrors.city = "State is required";
        } else if (!formData.franchise.city.trim()) {
          newErrors.city = "City is required";
        } else if (!formData.franchise.pincode?.trim()) {
          newErrors.pincode = "Pincode is required";
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
          formData.franchise.programIds.length === 0
        ) {
          newErrors.programIds = "At least one program must be selected";
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

    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const handleProgramToggle = (programId: number) => {
    setFormData((prev) => {
      const currentIds = prev.franchise.programIds || [];
      const newIds = currentIds.includes(programId)
        ? currentIds.filter((id) => id !== programId)
        : [...currentIds, programId];

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

  const handleModalOpenChange = (open: boolean) => {
    if (!open) {
      handleClose();
    } else {
      onOpenChange(open);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.franchisee.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className={errors.name ? "border-red-500" : ""}
                />
                {errors.name && (
                  <p className="text-red-500 text-sm">{errors.name}</p>
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
                      : formData.franchisee.dob
                  }
                  onChange={(e) => handleInputChange("dob", e.target.value)}
                  className={errors.dob ? "border-red-500" : ""}
                />
                {errors.dob && (
                  <p className="text-red-500 text-sm">{errors.dob}</p>
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
                <SelectTrigger>
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
              <Label htmlFor="address">Centre Address *</Label>
              <Textarea
                id="address"
                value={formData.franchise.address}
                onChange={(e) =>
                  handleInputChange("franchise.address", e.target.value)
                }
                className={errors.address ? "border-red-500" : ""}
                rows={3}
              />
              {errors.address && (
                <p className="text-red-500 text-sm">{errors.address}</p>
              )}
            </div>

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
              />
            </div>

            <div className="flex justify-between gap-2">
              <StateCitySelect
                id="city"
                className="w-full"
                value={formData.franchise.city}
                stateValue={formData.franchise.state}
                onChange={(val) => handleInputChange("franchise.city", val)}
                onStateChange={(val) =>
                  handleInputChange("franchise.state", val)
                }
                label="City"
                required
                error={errors.city}
              />

              <div className="space-y-2 w-[50%]">
                <Label htmlFor="pinCode">Pincode</Label>
                <Input
                  id="pinCode"
                  value={formData.franchise.pincode}
                  onChange={(e) => handleInputChange("pinCode", e.target.value)}
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.franchisee.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className={errors.phone ? "border-red-500" : ""}
                />
                {errors.phone && (
                  <p className="text-red-500 text-sm">{errors.phone}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="mail">Email ID *</Label>
                <Input
                  id="mail"
                  type="email"
                  value={formData.franchisee.mail}
                  onChange={(e) => handleInputChange("mail", e.target.value)}
                  className={errors.mail ? "border-red-500" : ""}
                />
                {errors.mail && (
                  <p className="text-red-500 text-sm">{errors.mail}</p>
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
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference">Reference</Label>
              <Input
                id="reference"
                type="text"
                value={formData.franchisee.reference}
                onChange={(e) => handleInputChange("reference", e.target.value)}
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
                className={errors.franchiseName ? "border-red-500" : ""}
                placeholder="Enter your desired franchise center name"
              />
              {errors.franchiseName && (
                <p className="text-red-500 text-sm">{errors.franchiseName}</p>
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
                  className={errors.franchiseType ? "border-red-500" : ""}
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
                <p className="text-red-500 text-sm">{errors.franchiseType}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Programs * (Select one or more)</Label>
              <div
                className={`border rounded-md p-4 space-y-3 ${
                  errors.programIds ? "border-red-500" : "border-gray-200"
                }`}
              >
                {isLoadingPrograms ? (
                  <p className="text-sm text-gray-500">Loading programs...</p>
                ) : programs.length === 0 ? (
                  <p className="text-sm text-gray-500">No programs available</p>
                ) : (
                  programs.map((program) => (
                    <div
                      key={program.id}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`program-${program.id}`}
                        checked={formData.franchise.programIds.includes(
                          program.id,
                        )}
                        onCheckedChange={() => handleProgramToggle(program.id)}
                      />
                      <label
                        htmlFor={`program-${program.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {program.name}
                      </label>
                    </div>
                  ))
                )}
              </div>
              {errors.programIds && (
                <p className="text-red-500 text-sm">{errors.programIds}</p>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (submitted) {
    return (
      <Dialog open={false} onOpenChange={handleModalOpenChange}>
        <DialogContent className="max-w-md w-full mx-4">
          <DialogHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <DialogTitle className="text-2xl font-bold text-gray-900">
              Application Submitted!
            </DialogTitle>
            <DialogDescription className="text-center">
              Your franchise application has been submitted successfully. Our
              admin team will review your application and contact you with the
              next steps.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-4">
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={handleClose}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleModalOpenChange}>
      <DialogContent className="max-w-4xl w-full mx-4 max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="text-center border-b border-gray-200 pb-4 flex-shrink-0">
          <div className="flex justify-center mb-4">
            <Calculator className="h-8 w-8 text-gray-700" />
          </div>
          <DialogTitle className="text-xl font-bold text-gray-900">
            Franchise Application Form
          </DialogTitle>
          <DialogDescription>
            Complete your franchise application step by step
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <Stepper currentStep={currentStep} steps={FORM_STEPS} />
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                    {FORM_STEPS[currentStep - 1].title}
                  </h3>
                  <div className="space-y-4">{renderStepContent()}</div>
                </div>
                {currentStep < FORM_STEPS.length ? (
                  <div className="flex gap-4 pt-6">
                    <div className="flex gap-2">
                      {currentStep > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handlePrevious}
                        >
                          Previous
                        </Button>
                      )}
                    </div>

                    <div className="flex-1" />

                    <Button
                      type="button"
                      onClick={handleNext}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Next
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <div className="flex gap-4 pt-6">
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handlePrevious}
                        >
                          Previous
                        </Button>
                      </div>

                      <div className="flex-1" />

                      <Button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700"
                        disabled={isLoading}
                      >
                        {isLoading ? "Submitting..." : "Submit Application"}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
