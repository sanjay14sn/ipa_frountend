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
import { Badge } from "@/components/ui/badge";
import {
  User,
  Users,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Camera,
  GraduationCap,
  ArrowRight,
  Save,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import React from "react";
import { getUserFromStorage } from "@/lib/auth";
import {
  StudentLevel,
  StudentStream,
  StudentIdStatus,
  createStudent,
} from "@/services/student.service";

// Define the steps for the form
const FORM_STEPS = [
  {
    id: 1,
    title: "Basic Information",
  },
  {
    id: 2,
    title: "Parent Details",
  },
  {
    id: 3,
    title: "Contact & Address",
  },
  {
    id: 4,
    title: "Academic Details",
  },
];

const LEVELS = [
  "EL1", "EL2", "EL3", "EL4", "EL5", "EL6",
  "RL1", "RL2", "RL3", "RL4", "RL5", "RL6", "RL7", "RL8", "RL9", "RL10",
  "GML1", "GML2", "GML3",
];

const STANDARDS = [
  "Pre-KG", "LKG", "UKG", "1st", "2nd", "3rd", "4th", "5th", "6th",
  "7th", "8th", "9th", "10th", "11th", "12th",
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

interface AddStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface StudentFormData {
  // Basic Information
  studentName: string;
  rollNo: string;
  dob: string;
  sex: string;
  standard: string;
  level: string;
  stream: string;
  status: string;
  photoImage: File | null;

  // Parent Information
  fatherName: string;
  fatherQualification: string;
  fatherOccupation: string;
  fatherContactNo: string;
  motherName: string;
  motherQualification: string;
  motherOccupation: string;
  motherContactNo: string;

  // Contact & Address
  residentialAddress: string;
  mailId: string;

  // Status Management
  isDiscontinued: boolean;
  discontinueReason: string;
}

export default function AddStudentModal({
  open,
  onOpenChange,
  onSuccess,
}: AddStudentModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<StudentFormData>({
    // Basic Information
    studentName: "",
    rollNo: "",
    dob: "",
    sex: "",
    standard: "",
    level: "",
    stream: "regular",
    status: "active",
    photoImage: null,

    // Parent Information
    fatherName: "",
    fatherQualification: "",
    fatherOccupation: "",
    fatherContactNo: "",
    motherName: "",
    motherQualification: "",
    motherOccupation: "",
    motherContactNo: "",

    // Contact & Address
    residentialAddress: "",
    mailId: "",

    // Status Management
    isDiscontinued: false,
    discontinueReason: "",
  });

  useEffect(() => {
    const userData = getUserFromStorage();
    setUser(userData);
  }, []);

  const validateCurrentStep = () => {
    const newErrors: Record<string, string> = {};

    switch (currentStep) {
      case 1:
        if (!formData.studentName.trim()) {
          newErrors.studentName = "Student name is required";
        }
        if (!formData.dob) {
          newErrors.dob = "Date of birth is required";
        }
        if (!formData.sex) {
          newErrors.sex = "Gender is required";
        }
        if (!formData.standard) {
          newErrors.standard = "Standard is required";
        }
        if (!formData.level) {
          newErrors.level = "Level is required";
        }
        break;

      case 2:
        if (!formData.fatherName.trim()) {
          newErrors.fatherName = "Father's name is required";
        }
        if (!formData.motherName.trim()) {
          newErrors.motherName = "Mother's name is required";
        }
        if (!formData.fatherContactNo.trim()) {
          newErrors.fatherContactNo = "Father's contact number is required";
        } else if (!/^\d{10}$/.test(formData.fatherContactNo)) {
          newErrors.fatherContactNo = "Please enter a valid 10-digit contact number";
        }
        if (!formData.motherContactNo.trim()) {
          newErrors.motherContactNo = "Mother's contact number is required";
        } else if (!/^\d{10}$/.test(formData.motherContactNo)) {
          newErrors.motherContactNo = "Please enter a valid 10-digit contact number";
        }
        break;

      case 3:
        if (!formData.residentialAddress.trim()) {
          newErrors.residentialAddress = "Residential address is required";
        }
        if (!formData.mailId.trim()) {
          newErrors.mailId = "Email is required";
        } else if (!/\S+@\S+\.\S+/.test(formData.mailId)) {
          newErrors.mailId = "Please enter a valid email address";
        }
        break;

      case 4:
        if (formData.isDiscontinued && !formData.discontinueReason.trim()) {
          newErrors.discontinueReason = "Please provide reason for discontinuation";
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
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size and type
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        setErrors((prev) => ({
          ...prev,
          photoImage: "File size should be less than 5MB",
        }));
        return;
      }

      if (!file.type.startsWith("image/")) {
        setErrors((prev) => ({
          ...prev,
          photoImage: "Please select a valid image file",
        }));
        return;
      }

      setFormData((prev) => ({
        ...prev,
        photoImage: file,
      }));

      // Clear error
      setErrors((prev) => ({ ...prev, photoImage: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateCurrentStep() || !user) {
      return;
    }

    setIsLoading(true);

    try {
      // Create FormData for file upload
      const submitData = new FormData();

      // Add all form fields
      Object.entries(formData).forEach(([key, value]) => {
        if (key === "photoImage" && value instanceof File) {
          submitData.append(key, value);
        } else if (key !== "photoImage") {
          submitData.append(key, String(value));
        }
      });

      // Add franchise information
      submitData.append("franchiseId", user.franchiseId);
      submitData.append("franchiseName", user.franchiseName);

      const response = await fetch("/api/students", {
        method: "POST",
        body: submitData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to register student");
      }

      setSubmitted(true);
      onSuccess();
    } catch (error) {
      console.error("Error registering student:", error);
      alert("Failed to register student. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setFormData({
      studentName: "",
      rollNo: "",
      dob: "",
      sex: "",
      standard: "",
      level: "",
      stream: "regular",
      status: "active",
      photoImage: null,
      fatherName: "",
      fatherQualification: "",
      fatherOccupation: "",
      fatherContactNo: "",
      motherName: "",
      motherQualification: "",
      motherOccupation: "",
      motherContactNo: "",
      residentialAddress: "",
      mailId: "",
      isDiscontinued: false,
      discontinueReason: "",
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
                <Label htmlFor="studentName">Student Name *</Label>
                <Input
                  id="studentName"
                  type="text"
                  value={formData.studentName}
                  onChange={(e) => handleInputChange("studentName", e.target.value)}
                  className={errors.studentName ? "border-red-500" : ""}
                  placeholder="Enter student's full name"
                />
                {errors.studentName && (
                  <p className="text-red-500 text-sm flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.studentName}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="rollNo">Roll Number</Label>
                <Input
                  id="rollNo"
                  type="text"
                  value="Auto-generated upon submission"
                  disabled
                  className="bg-gray-100"
                />
                <p className="text-sm text-muted-foreground">
                  Roll number will be automatically generated
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
                <Label htmlFor="sex">Gender *</Label>
                <Select
                  value={formData.sex}
                  onValueChange={(value) => handleInputChange("sex", value)}
                >
                  <SelectTrigger className={errors.sex ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
                {errors.sex && (
                  <p className="text-red-500 text-sm flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.sex}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="standard">Standard *</Label>
                <Select
                  value={formData.standard}
                  onValueChange={(value) => handleInputChange("standard", value)}
                >
                  <SelectTrigger className={errors.standard ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select standard" />
                  </SelectTrigger>
                  <SelectContent>
                    {STANDARDS.map((standard) => (
                      <SelectItem key={standard} value={standard}>
                        {standard}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.standard && (
                  <p className="text-red-500 text-sm flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.standard}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="level">Level *</Label>
                <Select
                  value={formData.level}
                  onValueChange={(value) => handleInputChange("level", value)}
                >
                  <SelectTrigger className={errors.level ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.level && (
                  <p className="text-red-500 text-sm flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.level}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stream">Stream</Label>
                <Select
                  value={formData.stream}
                  onValueChange={(value) => handleInputChange("stream", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="summer_camp">Summer Camp</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleInputChange("status", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="photoImage">Student Photo</Label>
                <Input
                  id="photoImage"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className={errors.photoImage ? "border-red-500" : ""}
                />
                {errors.photoImage && (
                  <p className="text-red-500 text-sm flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.photoImage}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  Upload student's photo (max 5MB)
                </p>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            {/* Father's Information */}
            <div>
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <User className="w-4 h-4" />
                Father's Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fatherName">Father's Name *</Label>
                  <Input
                    id="fatherName"
                    type="text"
                    value={formData.fatherName}
                    onChange={(e) => handleInputChange("fatherName", e.target.value)}
                    className={errors.fatherName ? "border-red-500" : ""}
                    placeholder="Enter father's full name"
                  />
                  {errors.fatherName && (
                    <p className="text-red-500 text-sm flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.fatherName}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fatherContactNo">Father's Contact Number *</Label>
                  <Input
                    id="fatherContactNo"
                    type="tel"
                    value={formData.fatherContactNo}
                    onChange={(e) => handleInputChange("fatherContactNo", e.target.value)}
                    className={errors.fatherContactNo ? "border-red-500" : ""}
                    placeholder="Enter 10-digit contact number"
                  />
                  {errors.fatherContactNo && (
                    <p className="text-red-500 text-sm flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.fatherContactNo}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fatherQualification">Father's Qualification</Label>
                  <Input
                    id="fatherQualification"
                    type="text"
                    value={formData.fatherQualification}
                    onChange={(e) => handleInputChange("fatherQualification", e.target.value)}
                    placeholder="e.g., B.Tech, MBA, etc."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fatherOccupation">Father's Occupation</Label>
                  <Input
                    id="fatherOccupation"
                    type="text"
                    value={formData.fatherOccupation}
                    onChange={(e) => handleInputChange("fatherOccupation", e.target.value)}
                    placeholder="e.g., Software Engineer, Teacher, etc."
                  />
                </div>
              </div>
            </div>

            {/* Mother's Information */}
            <div>
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Mother's Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="motherName">Mother's Name *</Label>
                  <Input
                    id="motherName"
                    type="text"
                    value={formData.motherName}
                    onChange={(e) => handleInputChange("motherName", e.target.value)}
                    className={errors.motherName ? "border-red-500" : ""}
                    placeholder="Enter mother's full name"
                  />
                  {errors.motherName && (
                    <p className="text-red-500 text-sm flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.motherName}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="motherContactNo">Mother's Contact Number *</Label>
                  <Input
                    id="motherContactNo"
                    type="tel"
                    value={formData.motherContactNo}
                    onChange={(e) => handleInputChange("motherContactNo", e.target.value)}
                    className={errors.motherContactNo ? "border-red-500" : ""}
                    placeholder="Enter 10-digit contact number"
                  />
                  {errors.motherContactNo && (
                    <p className="text-red-500 text-sm flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.motherContactNo}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="motherQualification">Mother's Qualification</Label>
                  <Input
                    id="motherQualification"
                    type="text"
                    value={formData.motherQualification}
                    onChange={(e) => handleInputChange("motherQualification", e.target.value)}
                    placeholder="e.g., B.A., M.Sc., etc."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="motherOccupation">Mother's Occupation</Label>
                  <Input
                    id="motherOccupation"
                    type="text"
                    value={formData.motherOccupation}
                    onChange={(e) => handleInputChange("motherOccupation", e.target.value)}
                    placeholder="e.g., Homemaker, Doctor, etc."
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="residentialAddress">Residential Address *</Label>
              <Textarea
                id="residentialAddress"
                value={formData.residentialAddress}
                onChange={(e) => handleInputChange("residentialAddress", e.target.value)}
                className={errors.residentialAddress ? "border-red-500" : ""}
                placeholder="Enter complete residential address"
                rows={3}
              />
              {errors.residentialAddress && (
                <p className="text-red-500 text-sm flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.residentialAddress}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="mailId">Email Address *</Label>
              <Input
                id="mailId"
                type="email"
                value={formData.mailId}
                onChange={(e) => handleInputChange("mailId", e.target.value)}
                className={errors.mailId ? "border-red-500" : ""}
                placeholder="Enter email address"
              />
              {errors.mailId && (
                <p className="text-red-500 text-sm flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.mailId}
                </p>
              )}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h4 className="font-medium text-orange-800 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Discontinuation (Optional)
              </h4>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isDiscontinued"
                    checked={formData.isDiscontinued}
                    onCheckedChange={(checked) =>
                      handleInputChange("isDiscontinued", checked as boolean)
                    }
                  />
                  <Label htmlFor="isDiscontinued" className="text-sm font-medium">
                    Mark as discontinued
                  </Label>
                </div>

                {formData.isDiscontinued && (
                  <div className="space-y-2">
                    <Label htmlFor="discontinueReason">
                      Reason for Discontinuation *
                    </Label>
                    <Textarea
                      id="discontinueReason"
                      value={formData.discontinueReason}
                      onChange={(e) => handleInputChange("discontinueReason", e.target.value)}
                      className={errors.discontinueReason ? "border-red-500" : ""}
                      placeholder="Please provide reason for discontinuation"
                      rows={3}
                    />
                    {errors.discontinueReason && (
                      <p className="text-red-500 text-sm flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.discontinueReason}
                      </p>
                    )}
                    <p className="text-sm text-orange-600">
                      ⚠️ Discontinued students cannot request certificates and will
                      need admin approval for reactivation.
                    </p>
                  </div>
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
      <Dialog open={false} onOpenChange={handleModalOpenChange}>
        <DialogContent className="max-w-md w-full mx-4">
          <DialogHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <DialogTitle className="text-2xl font-bold text-gray-900">
              Student Registered Successfully!
            </DialogTitle>
            <DialogDescription className="text-center">
              The student has been registered successfully. You can now view and manage the student from the students list.
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
            Register New Student
          </DialogTitle>
          <DialogDescription>
            Complete student registration step by step
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
                            <span>Register Student</span>
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


