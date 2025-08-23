"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  ArrowLeft,
  Save,
  AlertCircle,
  MapPin,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useUser } from "@/context/user-context";

const LEVELS = [
  "EL1",
  "EL2",
  "EL3",
  "EL4",
  "EL5",
  "EL6",
  "RL1",
  "RL2",
  "RL3",
  "RL4",
  "RL5",
  "RL6",
  "RL7",
  "RL8",
  "RL9",
  "RL10",
  "GML1",
  "GML2",
  "GML3",
];

const STANDARDS = [
  "Pre-KG",
  "LKG",
  "UKG",
  "1st",
  "2nd",
  "3rd",
  "4th",
  "5th",
  "6th",
  "7th",
  "8th",
  "9th",
  "10th",
  "11th",
  "12th",
];

export default function AddStudentPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { user } = useUser();

  const [formData, setFormData] = useState({
    // Basic Information
    registrationType: "new", // new or existing
    studentName: "",
    rollNo: "", // System generated
    dob: "",
    sex: "",
    standard: "",
    level: "",
    stream: "regular", // regular or summer_camp
    status: "active", // active or inactive

    // Father Details
    fatherName: "",
    fatherQualification: "",
    fatherOccupation: "",
    fatherContactNo: "",

    // Mother Details
    motherName: "",
    motherQualification: "",
    motherOccupation: "",
    motherContactNo: "",

    // Contact Information
    residentialAddress: "",
    mailId: "",

    // Status Management
    isDiscontinued: false,
    discontinueReason: "",

    // File Upload
    photoImage: null as File | null,
  });

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

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Required fields validation
    if (!formData.studentName.trim())
      newErrors.studentName = "Student name is required";
    if (!formData.dob) newErrors.dob = "Date of birth is required";
    if (!formData.sex) newErrors.sex = "Gender is required";
    if (!formData.fatherName.trim())
      newErrors.fatherName = "Father's name is required";
    if (!formData.motherName.trim())
      newErrors.motherName = "Mother's name is required";
    if (!formData.residentialAddress.trim())
      newErrors.residentialAddress = "Residential address is required";
    if (!formData.mailId.trim()) newErrors.mailId = "Email is required";
    if (!formData.standard) newErrors.standard = "Standard is required";
    if (!formData.level) newErrors.level = "Level is required";

    // Contact number validation
    if (!formData.fatherContactNo.trim()) {
      newErrors.fatherContactNo = "Father's contact number is required";
    } else if (!/^\d{10}$/.test(formData.fatherContactNo)) {
      newErrors.fatherContactNo =
        "Please enter a valid 10-digit contact number";
    }

    if (!formData.motherContactNo.trim()) {
      newErrors.motherContactNo = "Mother's contact number is required";
    } else if (!/^\d{10}$/.test(formData.motherContactNo)) {
      newErrors.motherContactNo =
        "Please enter a valid 10-digit contact number";
    }

    // Email validation
    if (formData.mailId && !/\S+@\S+\.\S+/.test(formData.mailId)) {
      newErrors.mailId = "Please enter a valid email address";
    }

    // Discontinue reason validation
    if (formData.isDiscontinued && !formData.discontinueReason.trim()) {
      newErrors.discontinueReason = "Please provide reason for discontinuation";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !user) {
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
      submitData.append("franchiseId", user.franchiseId?.toString() || "");
      submitData.append("franchiseName", user.franchiseName || "");

      const response = await fetch("/api/students", {
        method: "POST",
        body: submitData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to register student");
      }

      // Show success message
      alert(
        `Student registered successfully! Roll Number: ${result.student.rollNo}`
      );

      // Redirect back to students list
      router.push("/franchisee/students");
    } catch (error) {
      console.error("Error registering student:", error);
      alert("Failed to register student. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/franchisee/students">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Students
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Register New Student
            </h1>
            <p className="text-muted-foreground">
              Add a new student to {user.franchiseName}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Registration Type */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Registration Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="new"
                    name="registrationType"
                    value="new"
                    checked={formData.registrationType === "new"}
                    onChange={(e) =>
                      handleInputChange("registrationType", e.target.value)
                    }
                    className="w-4 h-4"
                  />
                  <Label htmlFor="new">New Registration</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="existing"
                    name="registrationType"
                    value="existing"
                    checked={formData.registrationType === "existing"}
                    onChange={(e) =>
                      handleInputChange("registrationType", e.target.value)
                    }
                    className="w-4 h-4"
                  />
                  <Label htmlFor="existing">Existing Student</Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Basic Student Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Student Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="studentName">Student Name *</Label>
                <Input
                  id="studentName"
                  type="text"
                  value={formData.studentName}
                  onChange={(e) =>
                    handleInputChange("studentName", e.target.value)
                  }
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
                  onValueChange={(value) =>
                    handleInputChange("standard", value)
                  }
                >
                  <SelectTrigger
                    className={errors.standard ? "border-red-500" : ""}
                  >
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
                  <SelectTrigger
                    className={errors.level ? "border-red-500" : ""}
                  >
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
          </CardContent>
        </Card>

        {/* Father's Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Father's Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="fatherName">Father's Name *</Label>
                <Input
                  id="fatherName"
                  type="text"
                  value={formData.fatherName}
                  onChange={(e) =>
                    handleInputChange("fatherName", e.target.value)
                  }
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
                <Label htmlFor="fatherContactNo">
                  Father's Contact Number *
                </Label>
                <Input
                  id="fatherContactNo"
                  type="tel"
                  value={formData.fatherContactNo}
                  onChange={(e) =>
                    handleInputChange("fatherContactNo", e.target.value)
                  }
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
                <Label htmlFor="fatherQualification">
                  Father's Qualification
                </Label>
                <Input
                  id="fatherQualification"
                  type="text"
                  value={formData.fatherQualification}
                  onChange={(e) =>
                    handleInputChange("fatherQualification", e.target.value)
                  }
                  placeholder="e.g., B.Tech, MBA, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fatherOccupation">Father's Occupation</Label>
                <Input
                  id="fatherOccupation"
                  type="text"
                  value={formData.fatherOccupation}
                  onChange={(e) =>
                    handleInputChange("fatherOccupation", e.target.value)
                  }
                  placeholder="e.g., Software Engineer, Teacher, etc."
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mother's Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Mother's Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="motherName">Mother's Name *</Label>
                <Input
                  id="motherName"
                  type="text"
                  value={formData.motherName}
                  onChange={(e) =>
                    handleInputChange("motherName", e.target.value)
                  }
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
                <Label htmlFor="motherContactNo">
                  Mother's Contact Number *
                </Label>
                <Input
                  id="motherContactNo"
                  type="tel"
                  value={formData.motherContactNo}
                  onChange={(e) =>
                    handleInputChange("motherContactNo", e.target.value)
                  }
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
                <Label htmlFor="motherQualification">
                  Mother's Qualification
                </Label>
                <Input
                  id="motherQualification"
                  type="text"
                  value={formData.motherQualification}
                  onChange={(e) =>
                    handleInputChange("motherQualification", e.target.value)
                  }
                  placeholder="e.g., B.A., M.Sc., etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="motherOccupation">Mother's Occupation</Label>
                <Input
                  id="motherOccupation"
                  type="text"
                  value={formData.motherOccupation}
                  onChange={(e) =>
                    handleInputChange("motherOccupation", e.target.value)
                  }
                  placeholder="e.g., Homemaker, Doctor, etc."
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact & Address Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Contact & Address Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="residentialAddress">Residential Address *</Label>
              <Textarea
                id="residentialAddress"
                value={formData.residentialAddress}
                onChange={(e) =>
                  handleInputChange("residentialAddress", e.target.value)
                }
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
          </CardContent>
        </Card>

        {/* Discontinuation Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              Discontinuation (Optional)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                  onChange={(e) =>
                    handleInputChange("discontinueReason", e.target.value)
                  }
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
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <Link href="/franchisee/students">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isLoading} className="min-w-32">
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
    </div>
  );
}
