"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  User,
  Users,
  ArrowRight,
  Save,
  AlertCircle,
  CheckCircle,
  X,
  ChevronDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import React from "react";
import { BloodGroup } from "@/services/course-instructor.service";
import { createCourseInstructorWithRevalidation } from "@/hooks/use-course-instructors";
import { useUser } from "@/context/user-context";
import { getAllPrograms, Program } from "@/services/program.service";
import {
  getActiveTrainingLevels,
  TrainingLevel,
} from "@/services/training-level.service";

// Define the steps for the form
const FORM_STEPS = [
  {
    id: 1,
    title: "Basic Information",
  },
  {
    id: 2,
    title: "Personal Details",
  },
  {
    id: 3,
    title: "Contact & Address",
  },
  {
    id: 4,
    title: "Professional Details",
  },
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
                    ? "bg-blue-600 text-white border-blue-600 shadow-md"
                    : currentStep > step.id
                    ? "bg-green-600 text-white border-green-600"
                    : "bg-white text-gray-400 border-gray-300"
                }`}
              >
                {currentStep > step.id ? "✓" : step.id}
              </div>
              <div className="mt-2 text-center max-w-[100px]">
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

interface AddCourseInstructorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface CourseInstructorFormData {
  // Basic Information
  name: string;
  instructorId: string;
  dob: string;
  bloodGroup: string;
  city: string;
  programId: number;

  // Personal Details
  address: string;
  phone: string;
  mail: string;

  // Professional Details
  education: string;
  occupation: string;
  reference: string;
  expiryDate: string;
  trainingLevelId: number;
  trainingLevelIds: number[];
  additionalDetails: string;
  trainingProof: string;
  hasTrainingProof: boolean;
}

export default function AddCourseInstructorModal({
  open,
  onOpenChange,
  onSuccess,
}: AddCourseInstructorModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [programs, setPrograms] = useState<Program[]>([]);
  const [trainingLevels, setTrainingLevels] = useState<TrainingLevel[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [loadingTrainingLevels, setLoadingTrainingLevels] = useState(false);
  const [isTrainingDropdownOpen, setIsTrainingDropdownOpen] = useState(false);

  const { user } = useUser();

  const fetchPrograms = async () => {
    try {
      setLoadingPrograms(true);
      const data = await getAllPrograms();
      setPrograms(data);
    } catch (error) {
      console.error("Error fetching programs:", error);
    } finally {
      setLoadingPrograms(false);
    }
  };

  const fetchTrainingLevels = async () => {
    try {
      setLoadingTrainingLevels(true);
      const data = await getActiveTrainingLevels();
      setTrainingLevels(data.filter((level) => level.isActive));
    } catch (error) {
      console.error("Error fetching training levels:", error);
      setTrainingLevels([]);
    } finally {
      setLoadingTrainingLevels(false);
    }
  };

  const [formData, setFormData] = useState<CourseInstructorFormData>({
    // Basic Information
    name: "",
    instructorId: "",
    dob: "",
    bloodGroup: "",
    city: "",
    programId: 0,

    // Personal Details
    address: "",
    phone: "",
    mail: "",

    // Professional Details
    education: "",
    occupation: "",
    reference: "",
    expiryDate: "",
    trainingLevelId: 0,
    trainingLevelIds: [],
    additionalDetails: "",
    trainingProof: "",
    hasTrainingProof: false,
  });

  const validateCurrentStep = () => {
    const newErrors: Record<string, string> = {};

    switch (currentStep) {
      case 1:
        if (!formData.name.trim()) {
          newErrors.name = "Name is required";
        }
        if (!formData.programId || formData.programId === 0) {
          newErrors.programId = "Program selection is required";
        }
        if (!formData.dob) {
          newErrors.dob = "Date of birth is required";
        }
        if (!formData.bloodGroup) {
          newErrors.bloodGroup = "Blood group is required";
        }
        if (!formData.city) {
          newErrors.city = "City is required";
        }
        break;

      case 2:
        if (!formData.address.trim()) {
          newErrors.address = "Address is required";
        }
        if (!formData.phone.trim()) {
          newErrors.phone = "Phone number is required";
        } else if (!/^\d{10}$/.test(formData.phone)) {
          newErrors.phone = "Please enter a valid 10-digit phone number";
        }
        if (!formData.mail.trim()) {
          newErrors.mail = "Email is required";
        } else if (!/\S+@\S+\.\S+/.test(formData.mail)) {
          newErrors.mail = "Please enter a valid email address";
        }
        break;

      case 3:
        if (!formData.education.trim()) {
          newErrors.education = "Education is required";
        }
        if (!formData.occupation.trim()) {
          newErrors.occupation = "Occupation is required";
        }
        if (!formData.reference.trim()) {
          newErrors.reference = "Reference is required";
        }
        break;

      case 4:
        if (!formData.expiryDate) {
          newErrors.expiryDate = "Expiry date is required";
        }
        if (!formData.hasTrainingProof) {
          // If no training proof, at least one training level is required
          if (
            !formData.trainingLevelIds ||
            formData.trainingLevelIds.length === 0
          ) {
            newErrors.trainingLevelIds =
              "Please select at least one training level";
          }
        } else {
          // If training proof is provided, it's required
          if (!formData.trainingProof.trim()) {
            newErrors.trainingProof = "Training proof is required";
          }
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

  const handleInputChange = (field: string, value: string | boolean) => {
    let convertedValue: any = value;

    // Convert programId and trainingLevelId to number
    if (
      (field === "programId" || field === "trainingLevelId") &&
      typeof value === "string"
    ) {
      convertedValue = parseInt(value, 10) || 0;
    }

    setFormData((prev) => ({
      ...prev,
      [field]: convertedValue,
    }));

    // Fetch training levels when program is selected
    if (field === "programId" && convertedValue && convertedValue !== 0) {
      fetchTrainingLevels();
    } else if (field === "programId") {
      // Clear training levels if program is cleared
      setTrainingLevels([]);
      setFormData((prev) => ({
        ...prev,
        trainingLevelId: 0,
        trainingLevelIds: [],
      }));
    }

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const handleProgramSelectOpen = (open: boolean) => {
    // Fetch programs when dropdown opens if not already loaded
    if (open && programs.length === 0 && !loadingPrograms) {
      fetchPrograms();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateCurrentStep()) {
      return;
    }

    if (!user) {
      alert("User not found. Please log in again.");
      return;
    }

    if (!user.franchiseId) {
      alert("Franchise ID not found. Please contact support.");
      return;
    }

    setIsLoading(true);

    try {
      // Prepare course instructor data for the service
      const courseInstructorData: any = {
        franchiseId: Number(user.franchiseId), // Ensure it's a number
        programId: Number(formData.programId),
        instructorId: formData.instructorId || `CI${Date.now()}`, // Auto-generate if empty
        name: formData.name,
        dob: new Date(formData.dob),
        bloodGroup: formData.bloodGroup as BloodGroup,
        address: formData.address,
        city: formData.city,
        phone: formData.phone,
        mail: formData.mail,
        education: formData.education,
        occupation: formData.occupation,
        reference: formData.reference,
        expiryDate: new Date(formData.expiryDate),
      };

      // If training proof is provided, add it and skip training fields
      if (formData.hasTrainingProof && formData.trainingProof) {
        courseInstructorData.trainingProof = formData.trainingProof;
      } else {
        // Otherwise, add training request fields
        // Support multiple training levels
        if (formData.trainingLevelIds && formData.trainingLevelIds.length > 0) {
          courseInstructorData.trainingLevelIds = formData.trainingLevelIds;
        }
        if (formData.additionalDetails) {
          courseInstructorData.additionalDetails = formData.additionalDetails;
        }
      }

      // Call the course instructor service with SWR revalidation
      const result = await createCourseInstructorWithRevalidation(
        courseInstructorData
      );

      setSubmitted(true);
      onSuccess();
    } catch (error) {
      console.error("Error registering course instructor:", error);
      alert("Failed to register course instructor. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setFormData({
      name: "",
      instructorId: "",
      dob: "",
      bloodGroup: "",
      city: "",
      programId: 0,
      address: "",
      phone: "",
      mail: "",
      education: "",
      occupation: "",
      reference: "",
      expiryDate: "",
      trainingLevelId: 0,
      trainingLevelIds: [],
      additionalDetails: "",
      trainingProof: "",
      hasTrainingProof: false,
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
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className={errors.name ? "border-red-500" : ""}
                  placeholder="Enter full name"
                />
                {errors.name && (
                  <p className="text-red-500 text-sm flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.name}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="instructorId">Instructor ID</Label>
                <Input
                  id="instructorId"
                  type="text"
                  value="Auto-generated upon submission"
                  disabled
                  className="bg-gray-100"
                />
                <p className="text-sm text-muted-foreground">
                  Instructor ID will be automatically generated
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth *</Label>
                <Input
                  id="dob"
                  type="date"
                  value={formData.dob}
                  onChange={(e) => handleInputChange("dob", e.target.value)}
                  className={errors.dob ? "border-red-500" : ""}
                />
                {errors.dob && (
                  <p className="text-red-500 text-sm flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.dob}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bloodGroup">Blood Group *</Label>
                <Select
                  value={formData.bloodGroup}
                  onValueChange={(value) =>
                    handleInputChange("bloodGroup", value)
                  }
                >
                  <SelectTrigger
                    className={errors.bloodGroup ? "border-red-500" : ""}
                  >
                    <SelectValue placeholder="Select blood group" />
                  </SelectTrigger>
                  <SelectContent>
                    {BLOOD_GROUPS.map((bloodGroup) => (
                      <SelectItem key={bloodGroup} value={bloodGroup}>
                        {bloodGroup}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.bloodGroup && (
                  <p className="text-red-500 text-sm flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.bloodGroup}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleInputChange("city", e.target.value)}
                  className={errors.city ? "border-red-500" : ""}
                  placeholder="Enter city"
                />
                {errors.city && (
                  <p className="text-red-500 text-sm flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.city}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="programId">Program *</Label>
                <Select
                  value={
                    formData.programId && formData.programId !== 0
                      ? formData.programId.toString()
                      : undefined
                  }
                  onValueChange={(value) =>
                    handleInputChange("programId", value)
                  }
                  onOpenChange={handleProgramSelectOpen}
                >
                  <SelectTrigger
                    className={errors.programId ? "border-red-500" : ""}
                  >
                    <SelectValue placeholder="Select program" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingPrograms ? (
                      <SelectItem value="loading" disabled>
                        Loading programs...
                      </SelectItem>
                    ) : programs.length === 0 ? (
                      <SelectItem value="no-programs" disabled>
                        Click to load programs
                      </SelectItem>
                    ) : (
                      programs.map((program) => (
                        <SelectItem
                          key={program.id}
                          value={program.id.toString()}
                        >
                          {program.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {errors.programId && (
                  <p className="text-red-500 text-sm flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.programId}
                  </p>
                )}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Address *</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                className={errors.address ? "border-red-500" : ""}
                placeholder="Enter complete address"
                rows={3}
              />
              {errors.address && (
                <p className="text-red-500 text-sm flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.address}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className={errors.phone ? "border-red-500" : ""}
                  placeholder="Enter 10-digit phone number"
                />
                {errors.phone && (
                  <p className="text-red-500 text-sm flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.phone}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="mail">Email Address *</Label>
                <Input
                  id="mail"
                  type="email"
                  value={formData.mail}
                  onChange={(e) => handleInputChange("mail", e.target.value)}
                  className={errors.mail ? "border-red-500" : ""}
                  placeholder="Enter email address"
                />
                {errors.mail && (
                  <p className="text-red-500 text-sm flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.mail}
                  </p>
                )}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="education">Education *</Label>
                <Input
                  id="education"
                  type="text"
                  value={formData.education}
                  onChange={(e) =>
                    handleInputChange("education", e.target.value)
                  }
                  className={errors.education ? "border-red-500" : ""}
                  placeholder="e.g., B.Tech, MBA, etc."
                />
                {errors.education && (
                  <p className="text-red-500 text-sm flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.education}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="occupation">Occupation *</Label>
                <Input
                  id="occupation"
                  type="text"
                  value={formData.occupation}
                  onChange={(e) =>
                    handleInputChange("occupation", e.target.value)
                  }
                  className={errors.occupation ? "border-red-500" : ""}
                  placeholder="e.g., Software Engineer, Teacher, etc."
                />
                {errors.occupation && (
                  <p className="text-red-500 text-sm flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.occupation}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference">Reference *</Label>
              <Textarea
                id="reference"
                value={formData.reference}
                onChange={(e) => handleInputChange("reference", e.target.value)}
                className={errors.reference ? "border-red-500" : ""}
                placeholder="Enter reference information"
                rows={3}
              />
              {errors.reference && (
                <p className="text-red-500 text-sm flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.reference}
                </p>
              )}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="expiryDate">Expiry Date *</Label>
              <Input
                id="expiryDate"
                type="date"
                value={formData.expiryDate}
                onChange={(e) =>
                  handleInputChange("expiryDate", e.target.value)
                }
                className={errors.expiryDate ? "border-red-500" : ""}
              />
              {errors.expiryDate && (
                <p className="text-red-500 text-sm flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.expiryDate}
                </p>
              )}
            </div>

            <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasTrainingProof"
                  checked={formData.hasTrainingProof}
                  onCheckedChange={(checked) =>
                    handleInputChange("hasTrainingProof", checked as boolean)
                  }
                />
                <Label htmlFor="hasTrainingProof" className="font-medium">
                  CI has training proof (skip training request)
                </Label>
              </div>
              <p className="text-sm text-muted-foreground ml-6">
                If the CI already has training proof, they can be added directly
                without requesting training.
              </p>
            </div>

            {formData.hasTrainingProof ? (
              <div className="space-y-2">
                <Label htmlFor="trainingProof">Training Proof URL *</Label>
                <Input
                  id="trainingProof"
                  type="text"
                  value={formData.trainingProof}
                  onChange={(e) =>
                    handleInputChange("trainingProof", e.target.value)
                  }
                  className={errors.trainingProof ? "border-red-500" : ""}
                  placeholder="Enter URL or path to training proof document"
                />
                {errors.trainingProof && (
                  <p className="text-red-500 text-sm flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.trainingProof}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  Provide the URL or file path to the training proof document.
                  The CI will be approved directly.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="trainingLevelIds">
                  Training Levels (Select Multiple) *
                </Label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        !loadingTrainingLevels &&
                        formData.programId &&
                        formData.programId !== 0 &&
                        trainingLevels.length > 0
                      ) {
                        setIsTrainingDropdownOpen(!isTrainingDropdownOpen);
                      }
                    }}
                    disabled={
                      !formData.programId ||
                      formData.programId === 0 ||
                      loadingTrainingLevels ||
                      trainingLevels.length === 0
                    }
                    className={`w-full min-h-[40px] px-3 py-2 text-left border rounded-md flex items-center justify-between ${
                      errors.trainingLevelIds
                        ? "border-red-500"
                        : "border-gray-300"
                    } ${
                      !formData.programId ||
                      formData.programId === 0 ||
                      loadingTrainingLevels ||
                      trainingLevels.length === 0
                        ? "bg-gray-100 cursor-not-allowed"
                        : "bg-white hover:border-gray-400"
                    }`}
                  >
                    <div className="flex-1 flex flex-wrap gap-1 items-center">
                      {formData.trainingLevelIds.length === 0 ? (
                        <span className="text-gray-500 text-sm">
                          {!formData.programId || formData.programId === 0
                            ? "Select a program first"
                            : loadingTrainingLevels
                            ? "Loading levels..."
                            : trainingLevels.length === 0
                            ? "No training levels available"
                            : "Select training levels"}
                        </span>
                      ) : (
                        <>
                          {formData.trainingLevelIds.map((levelId) => {
                            const level = trainingLevels.find(
                              (l) => l.id === levelId
                            );
                            return level ? (
                              <Badge
                                key={levelId}
                                variant="secondary"
                                className="flex items-center gap-1 pr-1"
                              >
                                {level.name}
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const updatedLevels =
                                      formData.trainingLevelIds.filter(
                                        (id) => id !== levelId
                                      );
                                    setFormData((prev) => ({
                                      ...prev,
                                      trainingLevelIds: updatedLevels,
                                    }));
                                    if (
                                      errors.trainingLevelIds &&
                                      updatedLevels.length > 0
                                    ) {
                                      setErrors((prev) => ({
                                        ...prev,
                                        trainingLevelIds: "",
                                      }));
                                    }
                                  }}
                                  className="ml-1 rounded-full p-0.5 hover:bg-gray-300 cursor-pointer inline-flex items-center justify-center"
                                  role="button"
                                  tabIndex={0}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      const updatedLevels =
                                        formData.trainingLevelIds.filter(
                                          (id) => id !== levelId
                                        );
                                      setFormData((prev) => ({
                                        ...prev,
                                        trainingLevelIds: updatedLevels,
                                      }));
                                      if (
                                        errors.trainingLevelIds &&
                                        updatedLevels.length > 0
                                      ) {
                                        setErrors((prev) => ({
                                          ...prev,
                                          trainingLevelIds: "",
                                        }));
                                      }
                                    }
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </span>
                              </Badge>
                            ) : null;
                          })}
                        </>
                      )}
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 text-gray-500 ml-2 flex-shrink-0 transition-transform ${
                        isTrainingDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Dropdown Menu */}
                  {isTrainingDropdownOpen && trainingLevels.length > 0 && (
                    <>
                      {/* Backdrop */}
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsTrainingDropdownOpen(false)}
                      />
                      {/* Dropdown Content */}
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-[300px] overflow-y-auto">
                        <div className="p-2">
                          {trainingLevels.map((level) => (
                            <div
                              key={level.id}
                              onClick={() => {
                                const isSelected =
                                  formData.trainingLevelIds.includes(level.id);
                                const updatedLevels = isSelected
                                  ? formData.trainingLevelIds.filter(
                                      (id) => id !== level.id
                                    )
                                  : [...formData.trainingLevelIds, level.id];
                                setFormData((prev) => ({
                                  ...prev,
                                  trainingLevelIds: updatedLevels,
                                }));
                                if (
                                  errors.trainingLevelIds &&
                                  updatedLevels.length > 0
                                ) {
                                  setErrors((prev) => ({
                                    ...prev,
                                    trainingLevelIds: "",
                                  }));
                                }
                              }}
                              className={`flex items-start space-x-3 p-3 rounded cursor-pointer transition-colors ${
                                formData.trainingLevelIds.includes(level.id)
                                  ? "bg-blue-50 hover:bg-blue-100"
                                  : "hover:bg-gray-50"
                              }`}
                            >
                              <Checkbox
                                checked={formData.trainingLevelIds.includes(
                                  level.id
                                )}
                                onCheckedChange={() => {}}
                                className="mt-0.5"
                              />
                              <div className="flex-1">
                                <div className="font-medium text-sm">
                                  {level.name}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  ₹{level.amount.toLocaleString()}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Summary Section */}
                {formData.trainingLevelIds.length > 0 && (
                  <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-md">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium text-gray-700">
                        Selected Levels:
                      </span>
                      <span className="text-blue-600 font-semibold">
                        {formData.trainingLevelIds.length} level(s)
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm mt-2 pt-2 border-t border-gray-200">
                      <span className="font-medium text-gray-700">
                        Total Amount:
                      </span>
                      <span className="text-green-600 font-semibold text-base">
                        ₹
                        {trainingLevels
                          .filter((level) =>
                            formData.trainingLevelIds.includes(level.id)
                          )
                          .reduce((sum, level) => sum + level.amount, 0)
                          .toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                {errors.trainingLevelIds && (
                  <p className="text-red-500 text-sm flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.trainingLevelIds}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  {!formData.programId || formData.programId === 0
                    ? "Please select a program first to see available training levels"
                    : "Select one or more training levels. The CI will progress through them sequentially."}
                </p>
              </div>
            )}

            {!formData.hasTrainingProof && (
              <div className="space-y-2">
                <Label htmlFor="additionalDetails">Additional Details</Label>
                <Textarea
                  id="additionalDetails"
                  value={formData.additionalDetails}
                  onChange={(e) =>
                    handleInputChange("additionalDetails", e.target.value)
                  }
                  placeholder="Enter any additional details"
                  rows={3}
                />
              </div>
            )}
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
              Course Instructor Registered Successfully!
            </DialogTitle>
            <DialogDescription className="text-center">
              The course instructor has been registered successfully. You can
              now view and manage the course instructor from the course
              instructors list.
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
            <User className="h-8 w-8 text-gray-700" />
          </div>
          <DialogTitle className="text-xl font-bold text-gray-900">
            Register New Course Instructor
          </DialogTitle>
          <DialogDescription>
            Complete course instructor registration step by step
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Progress Stepper with clear separation */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <Stepper currentStep={currentStep} steps={FORM_STEPS} />
            </div>

            {/* Form Content with clear separation */}
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
                        {isLoading ? (
                          <div className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Registering...</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <Save className="w-4 h-4" />
                            <span>Register Course Instructor</span>
                          </div>
                        )}
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
