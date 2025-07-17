"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const PROGRAMS = [
  "ABACUS",
  "BRAIN TREE",
  "PHONICS",
  "BRITE",
  "HANDWRITING",
  "CREATIVE ARTS INDIA",
  "VEDIC MATHS",
  "ARKA KIDS",
];

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function AddCourseInstructorPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [dobDate, setDobDate] = useState<Date>();
  const [paymentDate, setPaymentDate] = useState<Date>();

  const [formData, setFormData] = useState({
    // Personal Information
    name: "",
    photo: null as File | null,
    centreName: "",
    programName: "",
    dob: "",
    bloodGroup: "",
    address: "",
    pincode: "",
    city: "",
    phone: "",
    email: "",
    educationalQualification: "",
    presentOccupation: "",
    reference: "",

    // Payment Details
    paymentAmount: "",
    paymentDate: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        photo: file,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Create FormData for file upload
      const submitData = new FormData();

      // Add all form fields
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== null && value !== "") {
          submitData.append(key, value as string | File);
        }
      });

      // Add dates
      if (dobDate) {
        submitData.append("dob", format(dobDate, "yyyy-MM-dd"));
      }
      if (paymentDate) {
        submitData.append("paymentDate", format(paymentDate, "yyyy-MM-dd"));
      }

      // Submit to API
      const response = await fetch("/api/course-instructors", {
        method: "POST",
        body: submitData,
      });

      if (!response.ok) {
        throw new Error("Failed to submit application");
      }

      const result = await response.json();

      // Show success message
      alert(
        "Course Instructor application submitted successfully! It will be reviewed by admin for approval."
      );

      // Redirect back to course instructors list
      router.push("/dashboard/course-instructors");
    } catch (error) {
      console.error("Error submitting application:", error);
      alert("Failed to submit application. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                Add Course Instructor
              </h1>
              <p className="text-gray-600 mt-1">
                Submit a new course instructor application for admin approval
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="border-b border-gray-100">
                <CardTitle className="text-gray-900">
                  Personal Information
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Basic details about the course instructor
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-gray-700 font-medium">
                      Full Name *
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        handleInputChange("name", e.target.value)
                      }
                      placeholder="Enter full name"
                      required
                      className="border-gray-300 focus:border-gray-500 focus:ring-gray-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="photo"
                      className="text-gray-700 font-medium"
                    >
                      Photo
                    </Label>
                    <Input
                      id="photo"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="border-gray-300 focus:border-gray-500 file:bg-gray-50 file:text-gray-700 file:border-gray-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="centreName"
                      className="text-gray-700 font-medium"
                    >
                      Centre Name *
                    </Label>
                    <Input
                      id="centreName"
                      value={formData.centreName}
                      onChange={(e) =>
                        handleInputChange("centreName", e.target.value)
                      }
                      placeholder="Enter centre name"
                      required
                      className="border-gray-300 focus:border-gray-500 focus:ring-gray-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="programName"
                      className="text-gray-700 font-medium"
                    >
                      Program Name *
                    </Label>
                    <Select
                      value={formData.programName}
                      onValueChange={(value) =>
                        handleInputChange("programName", value)
                      }
                      required
                    >
                      <SelectTrigger className="border-gray-300 focus:border-gray-500 focus:ring-gray-500">
                        <SelectValue placeholder="Select program" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROGRAMS.map((program) => (
                          <SelectItem key={program} value={program}>
                            {program}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">
                      Date of Birth *
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal border-gray-300 focus:border-gray-500",
                            !dobDate && "text-gray-500"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dobDate ? format(dobDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dobDate}
                          onSelect={setDobDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="bloodGroup"
                      className="text-gray-700 font-medium"
                    >
                      Blood Group *
                    </Label>
                    <Select
                      value={formData.bloodGroup}
                      onValueChange={(value) =>
                        handleInputChange("bloodGroup", value)
                      }
                      required
                    >
                      <SelectTrigger className="border-gray-300 focus:border-gray-500 focus:ring-gray-500">
                        <SelectValue placeholder="Select blood group" />
                      </SelectTrigger>
                      <SelectContent>
                        {BLOOD_GROUPS.map((group) => (
                          <SelectItem key={group} value={group}>
                            {group}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="phone"
                      className="text-gray-700 font-medium"
                    >
                      Phone Number *
                    </Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) =>
                        handleInputChange("phone", e.target.value)
                      }
                      placeholder="Enter phone number"
                      required
                      className="border-gray-300 focus:border-gray-500 focus:ring-gray-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-gray-700 font-medium"
                    >
                      Email ID *
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        handleInputChange("email", e.target.value)
                      }
                      placeholder="Enter email address"
                      required
                      className="border-gray-300 focus:border-gray-500 focus:ring-gray-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="address"
                    className="text-gray-700 font-medium"
                  >
                    Address with Pincode *
                  </Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) =>
                      handleInputChange("address", e.target.value)
                    }
                    placeholder="Enter complete address"
                    required
                    className="border-gray-300 focus:border-gray-500 focus:ring-gray-500 min-h-[80px]"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="pincode"
                      className="text-gray-700 font-medium"
                    >
                      Pincode *
                    </Label>
                    <Input
                      id="pincode"
                      value={formData.pincode}
                      onChange={(e) =>
                        handleInputChange("pincode", e.target.value)
                      }
                      placeholder="Enter pincode"
                      required
                      className="border-gray-300 focus:border-gray-500 focus:ring-gray-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-gray-700 font-medium">
                      City *
                    </Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) =>
                        handleInputChange("city", e.target.value)
                      }
                      placeholder="Enter city"
                      required
                      className="border-gray-300 focus:border-gray-500 focus:ring-gray-500"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Educational & Professional Details */}
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="border-b border-gray-100">
                <CardTitle className="text-gray-900">
                  Educational & Professional Details
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Qualification and work experience information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="educationalQualification"
                    className="text-gray-700 font-medium"
                  >
                    Educational Qualification *
                  </Label>
                  <Textarea
                    id="educationalQualification"
                    value={formData.educationalQualification}
                    onChange={(e) =>
                      handleInputChange(
                        "educationalQualification",
                        e.target.value
                      )
                    }
                    placeholder="Enter educational qualifications"
                    required
                    className="border-gray-300 focus:border-gray-500 focus:ring-gray-500 min-h-[80px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="presentOccupation"
                    className="text-gray-700 font-medium"
                  >
                    Present Occupation *
                  </Label>
                  <Input
                    id="presentOccupation"
                    value={formData.presentOccupation}
                    onChange={(e) =>
                      handleInputChange("presentOccupation", e.target.value)
                    }
                    placeholder="Enter current occupation"
                    required
                    className="border-gray-300 focus:border-gray-500 focus:ring-gray-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="reference"
                    className="text-gray-700 font-medium"
                  >
                    Reference
                  </Label>
                  <Input
                    id="reference"
                    value={formData.reference}
                    onChange={(e) =>
                      handleInputChange("reference", e.target.value)
                    }
                    placeholder="How did you hear about us? / Reference details"
                    className="border-gray-300 focus:border-gray-500 focus:ring-gray-500"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Payment Details */}
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="border-b border-gray-100">
                <CardTitle className="text-gray-900">Payment Details</CardTitle>
                <CardDescription className="text-gray-600">
                  Initial payment information for the application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="paymentAmount"
                      className="text-gray-700 font-medium"
                    >
                      Payment Amount *
                    </Label>
                    <Input
                      id="paymentAmount"
                      type="number"
                      value={formData.paymentAmount}
                      onChange={(e) =>
                        handleInputChange("paymentAmount", e.target.value)
                      }
                      placeholder="Enter payment amount"
                      required
                      className="border-gray-300 focus:border-gray-500 focus:ring-gray-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">
                      Payment Date *
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal border-gray-300 focus:border-gray-500",
                            !paymentDate && "text-gray-500"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {paymentDate
                            ? format(paymentDate, "PPP")
                            : "Pick payment date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={paymentDate}
                          onSelect={setPaymentDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submission Info */}
            <Card className="border-gray-200 shadow-sm bg-slate-50">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900">
                    Application Process:
                  </h3>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li className="flex items-start">
                      <span className="text-gray-400 mr-2">•</span>
                      Once submitted, your application will be reviewed by the
                      admin
                    </li>
                    <li className="flex items-start">
                      <span className="text-gray-400 mr-2">•</span>
                      Upon approval, a unique CI Code will be generated
                    </li>
                    <li className="flex items-start">
                      <span className="text-gray-400 mr-2">•</span>
                      An agreement will be generated after approval
                    </li>
                    <li className="flex items-start">
                      <span className="text-gray-400 mr-2">•</span>
                      The CI will be connected to your franchise for management
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Submit Buttons */}
            <div className="flex space-x-4 pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isLoading}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-gray-900 hover:bg-gray-800 text-white"
              >
                {isLoading ? "Submitting..." : "Submit Application"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
