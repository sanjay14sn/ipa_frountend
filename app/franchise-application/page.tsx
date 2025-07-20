"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calculator, ArrowLeft, Upload, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

export default function FranchiseApplication() {
  const [formData, setFormData] = useState({
    name: "",
    date: "",
    franchiseeName: "",
    photoImage: null as File | null,
    franchiseeType: "",
    programName: "",
    dob: "",
    bloodGroup: "",
    centreAddress: "",
    centrePincode: "",
    communicationAddress: "",
    communicationPincode: "",
    city: "",
    phoneNo: "",
    emailId: "",
    educationalQualification: "",
    presentOccupation: "",
    reference: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.franchiseeName.trim())
      newErrors.franchiseeName = "Franchisee name is required";
    if (!formData.franchiseeType)
      newErrors.franchiseeType = "Franchisee type is required";
    if (!formData.programName)
      newErrors.programName = "Program name is required";
    if (!formData.dob) newErrors.dob = "Date of birth is required";
    if (!formData.centreAddress.trim())
      newErrors.centreAddress = "Centre address is required";
    if (!formData.centrePincode.trim())
      newErrors.centrePincode = "Centre pincode is required";
    if (!formData.city.trim()) newErrors.city = "City is required";
    if (!formData.phoneNo.trim())
      newErrors.phoneNo = "Phone number is required";
    if (!formData.emailId.trim()) newErrors.emailId = "Email is required";
    if (!formData.password) newErrors.password = "Password is required";
    if (!formData.confirmPassword)
      newErrors.confirmPassword = "Confirm password is required";
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/franchise-application", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSubmitted(true);
      }
    } catch (error) {
      console.error("Error submitting application:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
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
      setFormData((prev) => ({
        ...prev,
        photoImage: file,
      }));
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Calculator className="h-12 w-12 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Application Submitted!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-6">
              Your franchise application has been submitted successfully. Our
              admin team will review your application and contact you with the
              next steps.
            </p>
            <Link href="/login">
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                Back to Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Card className="w-full">
          <CardHeader className="text-center border-b border-gray-100">
            <div className="flex justify-center mb-4">
              <Calculator className="h-12 w-12 text-gray-700" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Franchise Application Form
            </CardTitle>
            <p className="text-gray-600">
              Complete your franchise application with all required details
            </p>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Basic Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        handleInputChange("name", e.target.value)
                      }
                      className={errors.name ? "border-red-500" : ""}
                    />
                    {errors.name && (
                      <p className="text-red-500 text-sm">{errors.name}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) =>
                        handleInputChange("date", e.target.value)
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="franchiseeName">Franchisee Name *</Label>
                  <Input
                    id="franchiseeName"
                    type="text"
                    value={formData.franchiseeName}
                    onChange={(e) =>
                      handleInputChange("franchiseeName", e.target.value)
                    }
                    className={errors.franchiseeName ? "border-red-500" : ""}
                  />
                  {errors.franchiseeName && (
                    <p className="text-red-500 text-sm">
                      {errors.franchiseeName}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="photoImage">Photo Image</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="photoImage"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        document.getElementById("photoImage")?.click()
                      }
                      className="flex items-center space-x-2"
                    >
                      <Upload className="h-4 w-4" />
                      <span>Upload Photo</span>
                    </Button>
                    {formData.photoImage && (
                      <span className="text-sm text-gray-600">
                        {formData.photoImage.name}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="franchiseeType">Franchisee Type *</Label>
                    <Select
                      value={formData.franchiseeType}
                      onValueChange={(value) =>
                        handleInputChange("franchiseeType", value)
                      }
                    >
                      <SelectTrigger
                        className={
                          errors.franchiseeType ? "border-red-500" : ""
                        }
                      >
                        <SelectValue placeholder="Select franchisee type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AREA_FRANCHISE">
                          Area Franchise
                        </SelectItem>
                        <SelectItem value="MASTER_FRANCHISE">
                          Master Franchise
                        </SelectItem>
                        <SelectItem value="SCHOOL_FRANCHISE">
                          School Franchise
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.franchiseeType && (
                      <p className="text-red-500 text-sm">
                        {errors.franchiseeType}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="programName">Program Name *</Label>
                    <Select
                      value={formData.programName}
                      onValueChange={(value) =>
                        handleInputChange("programName", value)
                      }
                    >
                      <SelectTrigger
                        className={errors.programName ? "border-red-500" : ""}
                      >
                        <SelectValue placeholder="Select program" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ABACUS">Abacus</SelectItem>
                        <SelectItem value="BRAIN_TREE">Brain Tree</SelectItem>
                        <SelectItem value="PHONICS">Phonics</SelectItem>
                        <SelectItem value="BRITE">Brite</SelectItem>
                        <SelectItem value="HANDWRITING">Handwriting</SelectItem>
                        <SelectItem value="CREATIVE_ARTS_INDIA">
                          Creative Arts India
                        </SelectItem>
                        <SelectItem value="VEDIC_MATHS">Vedic Maths</SelectItem>
                        <SelectItem value="ARKA_KIDS">Arka Kids</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.programName && (
                      <p className="text-red-500 text-sm">
                        {errors.programName}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <p className="text-red-500 text-sm">{errors.dob}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bloodGroup">Blood Group</Label>
                    <Select
                      value={formData.bloodGroup}
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
              </div>

              {/* Address Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Address Information
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="centreAddress">
                    Centre Address with Pincode *
                  </Label>
                  <Textarea
                    id="centreAddress"
                    value={formData.centreAddress}
                    onChange={(e) =>
                      handleInputChange("centreAddress", e.target.value)
                    }
                    className={errors.centreAddress ? "border-red-500" : ""}
                    rows={3}
                  />
                  {errors.centreAddress && (
                    <p className="text-red-500 text-sm">
                      {errors.centreAddress}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="centrePincode">Centre Pincode *</Label>
                  <Input
                    id="centrePincode"
                    type="text"
                    value={formData.centrePincode}
                    onChange={(e) =>
                      handleInputChange("centrePincode", e.target.value)
                    }
                    className={errors.centrePincode ? "border-red-500" : ""}
                  />
                  {errors.centrePincode && (
                    <p className="text-red-500 text-sm">
                      {errors.centrePincode}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="communicationAddress">
                    Communication Address with Pincode
                  </Label>
                  <Textarea
                    id="communicationAddress"
                    value={formData.communicationAddress}
                    onChange={(e) =>
                      handleInputChange("communicationAddress", e.target.value)
                    }
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="communicationPincode">
                    Communication Pincode
                  </Label>
                  <Input
                    id="communicationPincode"
                    type="text"
                    value={formData.communicationPincode}
                    onChange={(e) =>
                      handleInputChange("communicationPincode", e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                    className={errors.city ? "border-red-500" : ""}
                  />
                  {errors.city && (
                    <p className="text-red-500 text-sm">{errors.city}</p>
                  )}
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Contact Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phoneNo">Phone Number *</Label>
                    <Input
                      id="phoneNo"
                      type="tel"
                      value={formData.phoneNo}
                      onChange={(e) =>
                        handleInputChange("phoneNo", e.target.value)
                      }
                      className={errors.phoneNo ? "border-red-500" : ""}
                    />
                    {errors.phoneNo && (
                      <p className="text-red-500 text-sm">{errors.phoneNo}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emailId">Email ID *</Label>
                    <Input
                      id="emailId"
                      type="email"
                      value={formData.emailId}
                      onChange={(e) =>
                        handleInputChange("emailId", e.target.value)
                      }
                      className={errors.emailId ? "border-red-500" : ""}
                    />
                    {errors.emailId && (
                      <p className="text-red-500 text-sm">{errors.emailId}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Professional Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Professional Information
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="educationalQualification">
                    Educational Qualification
                  </Label>
                  <Input
                    id="educationalQualification"
                    type="text"
                    value={formData.educationalQualification}
                    onChange={(e) =>
                      handleInputChange(
                        "educationalQualification",
                        e.target.value
                      )
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="presentOccupation">Present Occupation</Label>
                  <Input
                    id="presentOccupation"
                    type="text"
                    value={formData.presentOccupation}
                    onChange={(e) =>
                      handleInputChange("presentOccupation", e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reference">Reference</Label>
                  <Input
                    id="reference"
                    type="text"
                    value={formData.reference}
                    onChange={(e) =>
                      handleInputChange("reference", e.target.value)
                    }
                  />
                </div>
              </div>

              {/* Password Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Login Credentials
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) =>
                          handleInputChange("password", e.target.value)
                        }
                        className={errors.password ? "border-red-500" : ""}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-auto p-1"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
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
                        value={formData.confirmPassword}
                        onChange={(e) =>
                          handleInputChange("confirmPassword", e.target.value)
                        }
                        className={
                          errors.confirmPassword ? "border-red-500" : ""
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-auto p-1"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-red-500 text-sm">
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <Link href="/login" className="flex-1">
                  <Button type="button" variant="outline" className="w-full">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Login
                  </Button>
                </Link>
                <Button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={isLoading}
                >
                  {isLoading ? "Submitting..." : "Submit Application"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
