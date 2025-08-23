"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Users,
  MapPin,
  Phone,
  Mail,
  BookOpen,
  Calendar,
  GraduationCap,
} from "lucide-react";
import {
  StudentLevel,
  StudentStream,
  StudentIdStatus,
  createStudent,
} from "@/services/student.service";

interface AddStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  franchiseId?: number;
}

interface StudentFormData {
  name: string;
  franchiseId: number;
  rollNo: string;
  sex: string;
  dateOfBirth: string;
  fatherName: string;
  fatherOccupation: string;
  fatherQualification: string;
  motherName: string;
  motherOccupation: string;
  motherQualification: string;
  residentialAddress: string;
  fatherContactNo: string;
  motherContactNo: string;
  mail: string;
  standard: string;
  level: StudentLevel;
  stream: StudentStream;
  isActive: boolean;
  idIssued: StudentIdStatus;
}

export default function AddStudentModal({
  open,
  onOpenChange,
  onSuccess,
  franchiseId = 1, // Default franchise ID
}: AddStudentModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<StudentFormData>({
    name: "",
    franchiseId,
    rollNo: "",
    sex: "",
    dateOfBirth: "",
    fatherName: "",
    fatherOccupation: "",
    fatherQualification: "",
    motherName: "",
    motherOccupation: "",
    motherQualification: "",
    residentialAddress: "",
    fatherContactNo: "",
    motherContactNo: "",
    mail: "",
    standard: "",
    level: StudentLevel.EL1,
    stream: StudentStream.REGULAR,
    isActive: true,
    idIssued: StudentIdStatus.NOT_ISSUED,
  });

  const handleInputChange = (
    field: keyof StudentFormData,
    value: string | boolean | StudentLevel | StudentStream | StudentIdStatus
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const studentData = {
        ...formData,
        dateOfBirth: new Date(formData.dateOfBirth),
      };

      await createStudent(studentData);
      onSuccess();
      onOpenChange(false);

      // Reset form
      setFormData({
        name: "",
        franchiseId,
        rollNo: "",
        sex: "",
        dateOfBirth: "",
        fatherName: "",
        fatherOccupation: "",
        fatherQualification: "",
        motherName: "",
        motherOccupation: "",
        motherQualification: "",
        residentialAddress: "",
        fatherContactNo: "",
        motherContactNo: "",
        mail: "",
        standard: "",
        level: StudentLevel.EL1,
        stream: StudentStream.REGULAR,
        isActive: true,
        idIssued: StudentIdStatus.NOT_ISSUED,
      });
    } catch (error) {
      console.error("Error creating student:", error);
      alert("Failed to create student. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    return (
      formData.name &&
      formData.rollNo &&
      formData.sex &&
      formData.dateOfBirth &&
      formData.fatherName &&
      formData.fatherOccupation &&
      formData.fatherQualification &&
      formData.motherName &&
      formData.motherOccupation &&
      formData.motherQualification &&
      formData.residentialAddress &&
      formData.fatherContactNo &&
      formData.motherContactNo &&
      formData.mail &&
      formData.standard
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Add New Student
          </DialogTitle>
          <DialogDescription>
            Fill in the student information below. All fields marked with * are
            required.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="w-5 h-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Student Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Enter student's full name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rollNo">
                    Roll Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="rollNo"
                    value={formData.rollNo}
                    onChange={(e) =>
                      handleInputChange("rollNo", e.target.value)
                    }
                    placeholder="Enter roll number"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sex">
                    Gender <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.sex}
                    onValueChange={(value) => handleInputChange("sex", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">
                    Date of Birth <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) =>
                      handleInputChange("dateOfBirth", e.target.value)
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="standard">
                    Standard <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="standard"
                    value={formData.standard}
                    onChange={(e) =>
                      handleInputChange("standard", e.target.value)
                    }
                    placeholder="e.g., Class 10, Grade 5"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="level">
                    Level <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.level}
                    onValueChange={(value) =>
                      handleInputChange("level", value as StudentLevel)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(StudentLevel).map((level) => (
                        <SelectItem key={level} value={level}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stream">
                    Stream <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.stream}
                    onValueChange={(value) =>
                      handleInputChange("stream", value as StudentStream)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select stream" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(StudentStream).map((stream) => (
                        <SelectItem key={stream} value={stream}>
                          {stream}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="idIssued">ID Status</Label>
                  <Select
                    value={formData.idIssued}
                    onValueChange={(value) =>
                      handleInputChange("idIssued", value as StudentIdStatus)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select ID status" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(StudentIdStatus).map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Parent Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="w-5 h-5" />
                Parent Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Father's Details */}
              <div>
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Father's Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fatherName">
                      Father's Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="fatherName"
                      value={formData.fatherName}
                      onChange={(e) =>
                        handleInputChange("fatherName", e.target.value)
                      }
                      placeholder="Enter father's full name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fatherOccupation">
                      Occupation <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="fatherOccupation"
                      value={formData.fatherOccupation}
                      onChange={(e) =>
                        handleInputChange("fatherOccupation", e.target.value)
                      }
                      placeholder="Enter occupation"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fatherQualification">
                      Qualification <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="fatherQualification"
                      value={formData.fatherQualification}
                      onChange={(e) =>
                        handleInputChange("fatherQualification", e.target.value)
                      }
                      placeholder="Enter qualification"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fatherContactNo">
                      Contact Number <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="fatherContactNo"
                      value={formData.fatherContactNo}
                      onChange={(e) =>
                        handleInputChange("fatherContactNo", e.target.value)
                      }
                      placeholder="Enter contact number"
                      required
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Mother's Details */}
              <div>
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Mother's Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="motherName">
                      Mother's Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="motherName"
                      value={formData.motherName}
                      onChange={(e) =>
                        handleInputChange("motherName", e.target.value)
                      }
                      placeholder="Enter mother's full name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="motherOccupation">
                      Occupation <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="motherOccupation"
                      value={formData.motherOccupation}
                      onChange={(e) =>
                        handleInputChange("motherOccupation", e.target.value)
                      }
                      placeholder="Enter occupation"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="motherQualification">
                      Qualification <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="motherQualification"
                      value={formData.motherQualification}
                      onChange={(e) =>
                        handleInputChange("motherQualification", e.target.value)
                      }
                      placeholder="Enter qualification"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="motherContactNo">
                      Contact Number <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="motherContactNo"
                      value={formData.motherContactNo}
                      onChange={(e) =>
                        handleInputChange("motherContactNo", e.target.value)
                      }
                      placeholder="Enter contact number"
                      required
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact & Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="w-5 h-5" />
                Contact & Address
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mail">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="mail"
                  type="email"
                  value={formData.mail}
                  onChange={(e) => handleInputChange("mail", e.target.value)}
                  placeholder="Enter email address"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="residentialAddress">
                  Residential Address <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="residentialAddress"
                  value={formData.residentialAddress}
                  onChange={(e) =>
                    handleInputChange("residentialAddress", e.target.value)
                  }
                  placeholder="Enter complete residential address"
                  rows={3}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <GraduationCap className="w-5 h-5" />
                Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) =>
                    handleInputChange("isActive", e.target.checked)
                  }
                  className="rounded"
                />
                <Label htmlFor="isActive">Active Student</Label>
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !isFormValid()}>
              {loading ? "Creating..." : "Create Student"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
