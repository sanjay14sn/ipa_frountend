"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AppDialog,
  AppDialogHeader,
  AppDialogBody,
  AppDialogFooter,
} from "@/components/shared/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Users,
  MapPin,
  BookOpen,
  AlertCircle,
  CheckCircle,
  Edit2,
} from "lucide-react";
import { toast } from "sonner";
import { StudentData, StudentStream, StudentIdStatus } from "@/services/student.service";
import { updateStudentWithRevalidation } from "@/hooks/api/student.hooks";
import { getAllPrograms, Program } from "@/services/program.service";
import { getLevelsByStream, getLevelsByProgram, Level } from "@/services/level.service";
import { getStreamsByProgram, Stream } from "@/services/stream.service";

function calculateAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

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

const TABS = [
  {
    id: 1,
    title: "Basic Information",
    icon: User,
  },
  {
    id: 2,
    title: "Parent Details",
    icon: Users,
  },
  {
    id: 3,
    title: "Contact & Address",
    icon: MapPin,
  },
  {
    id: 4,
    title: "Academic Details",
    icon: BookOpen,
  },
];

interface EditStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: StudentData | null;
  onSuccess: () => void;
}

interface StudentFormData {
  // Basic Information
  studentName: string;
  dob: string;
  dateOfJoining: string;
  sex: string;
  standard: string;

  // Academic Details
  programId: number;
  streamId: number;
  levelId: number;
  status: string;

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
}

export default function EditStudentModal({
  open,
  onOpenChange,
  student,
  onSuccess,
}: EditStudentModalProps) {
  const [activeTab, setActiveTab] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [programs, setPrograms] = useState<Program[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [loadingStreams, setLoadingStreams] = useState(false);
  const [loadingLevels, setLoadingLevels] = useState(false);

  const [formData, setFormData] = useState<StudentFormData>({
    studentName: "",
    dob: "",
    dateOfJoining: "",
    sex: "",
    standard: "",
    programId: 0,
    streamId: 0,
    levelId: 0,
    status: "active",
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
  });

  // Load student data when modal opens
  useEffect(() => {
    if (open && student) {
      const loadStudentData = async () => {
        try {
          let levelId = (student as any).levelId || 0;
          let streamId = 0;

          // If we have programId, fetch levels to find the matching level and stream
          if (student.programId) {
            const programLevels = await getLevelsByProgram(student.programId);
            // Try to find level by matching level name/code with student.level
            const studentLevelName = typeof student.level === 'object' && student.level !== null && 'name' in student.level
              ? student.level.name
              : typeof student.level === 'string'
              ? student.level
              : '';
            const matchingLevel = programLevels.find(
              (l) => l.name === studentLevelName || l.code === studentLevelName
            );
            if (matchingLevel) {
              levelId = matchingLevel.id;
              streamId = matchingLevel.streamId;
            }
          }

          setFormData({
            studentName: student.name || "",
            dob: student.dateOfBirth
              ? new Date(student.dateOfBirth).toISOString().split("T")[0]
              : "",
            dateOfJoining: student.dateOfJoining
              ? new Date(student.dateOfJoining).toISOString().split("T")[0]
              : "",
            sex: student.sex || "",
            standard: student.standard || "",
            programId: student.programId || 0,
            streamId: streamId,
            levelId: levelId,
            status: student.isActive ? "active" : "inactive",
            fatherName: student.fatherName || "",
            fatherQualification: student.fatherQualification || "",
            fatherOccupation: student.fatherOccupation || "",
            fatherContactNo: student.fatherContactNo || "",
            motherName: student.motherName || "",
            motherQualification: student.motherQualification || "",
            motherOccupation: student.motherOccupation || "",
            motherContactNo: student.motherContactNo || "",
            residentialAddress: student.residentialAddress || "",
            mailId: student.mail || "",
          });
        } catch (error) {
          console.error("Error loading student data:", error);
          // Set basic data even if level lookup fails
          setFormData({
            studentName: student.name || "",
            dob: student.dateOfBirth
              ? new Date(student.dateOfBirth).toISOString().split("T")[0]
              : "",
            dateOfJoining: student.dateOfJoining
              ? new Date(student.dateOfJoining).toISOString().split("T")[0]
              : "",
            sex: student.sex || "",
            standard: student.standard || "",
            programId: student.programId || 0,
            streamId: 0,
            levelId: 0,
            status: student.isActive ? "active" : "inactive",
            fatherName: student.fatherName || "",
            fatherQualification: student.fatherQualification || "",
            fatherOccupation: student.fatherOccupation || "",
            fatherContactNo: student.fatherContactNo || "",
            motherName: student.motherName || "",
            motherQualification: student.motherQualification || "",
            motherOccupation: student.motherOccupation || "",
            motherContactNo: student.motherContactNo || "",
            residentialAddress: student.residentialAddress || "",
            mailId: student.mail || "",
          });
        }
        setActiveTab(1);
        setSubmitted(false);
        setErrors({});
      };
      loadStudentData();
    }
  }, [open, student]);

  // Fetch programs on mount
  useEffect(() => {
    const fetchPrograms = async () => {
      setLoadingPrograms(true);
      try {
        const fetchedPrograms = await getAllPrograms();
        setPrograms(fetchedPrograms);
      } catch (error) {
        console.error("Error fetching programs:", error);
      } finally {
        setLoadingPrograms(false);
      }
    };

    if (open) {
      fetchPrograms();
    }
  }, [open]);

  // Fetch streams when program is selected
  useEffect(() => {
    const fetchStreams = async () => {
      if (formData.programId && formData.programId > 0) {
        setLoadingStreams(true);
        try {
          const fetchedStreams = await getStreamsByProgram(formData.programId);
          setStreams(fetchedStreams);
        } catch (error) {
          console.error("Error fetching streams:", error);
          setStreams([]);
        } finally {
          setLoadingStreams(false);
        }
      } else {
        setStreams([]);
        setLevels([]);
      }
    };

    fetchStreams();
  }, [formData.programId]);

  // Fetch levels when stream is selected
  useEffect(() => {
    const fetchLevels = async () => {
      if (formData.streamId && formData.streamId > 0) {
        setLoadingLevels(true);
        try {
          const fetchedLevels = await getLevelsByStream(formData.streamId);
          setLevels(fetchedLevels);
        } catch (error) {
          console.error("Error fetching levels:", error);
          setLevels([]);
        } finally {
          setLoadingLevels(false);
        }
      } else {
        setLevels([]);
      }
    };

    fetchLevels();
  }, [formData.streamId]);

  const handleInputChange = (field: string, value: string | boolean | number) => {
    let convertedValue: any = value;

    if (
      (field === "programId" || field === "streamId" || field === "levelId") &&
      typeof value === "string"
    ) {
      convertedValue = parseInt(value, 10) || 0;
    }

    setFormData((prev) => ({
      ...prev,
      [field]: convertedValue,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const validateCurrentTab = () => {
    const newErrors: Record<string, string> = {};

    switch (activeTab) {
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
          newErrors.fatherContactNo =
            "Please enter a valid 10-digit contact number";
        }
        if (!formData.motherContactNo.trim()) {
          newErrors.motherContactNo = "Mother's contact number is required";
        } else if (!/^\d{10}$/.test(formData.motherContactNo)) {
          newErrors.motherContactNo =
            "Please enter a valid 10-digit contact number";
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
        if (!formData.programId || formData.programId === 0) {
          newErrors.programId = "Program selection is required";
        }
        if (!formData.streamId || formData.streamId === 0) {
          newErrors.streamId = "Stream selection is required";
        }
        if (!formData.levelId || formData.levelId === 0) {
          newErrors.levelId = "Level is required";
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateCurrentTab()) {
      return;
    }

    if (!student) {
      toast.error("Student not found. Please try again.");
      return;
    }

    setIsLoading(true);

    try {
      const updateData: Partial<StudentData> = {};

      // Only include fields from the current tab
      switch (activeTab) {
        case 1:
          updateData.name = formData.studentName;
          updateData.dateOfBirth = new Date(formData.dob);
          updateData.dateOfJoining = new Date(formData.dateOfJoining);
          updateData.sex = formData.sex;
          updateData.standard = formData.standard;
          break;

        case 2:
          updateData.fatherName = formData.fatherName;
          updateData.fatherQualification = formData.fatherQualification;
          updateData.fatherOccupation = formData.fatherOccupation;
          updateData.fatherContactNo = formData.fatherContactNo;
          updateData.motherName = formData.motherName;
          updateData.motherQualification = formData.motherQualification;
          updateData.motherOccupation = formData.motherOccupation;
          updateData.motherContactNo = formData.motherContactNo;
          break;

        case 3:
          updateData.residentialAddress = formData.residentialAddress;
          updateData.mail = formData.mailId;
          break;

        case 4:
          updateData.programId = formData.programId;
          updateData.levelId = formData.levelId;
          updateData.isActive = formData.status === "active";
          break;
      }

      await updateStudentWithRevalidation(student.id, updateData);
      setSubmitted(true);
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1500);
    } catch (error) {
      console.error("Error updating student:", error);
      toast.error("Failed to update student. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setActiveTab(1);
    setSubmitted(false);
    setErrors({});
    setIsLoading(false);
    onOpenChange(false);
  };

  const renderTabContent = () => {
    switch (activeTab) {
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
                <Label htmlFor="dob">
                  Date of Birth *{formData.dob && (
                    <span className="ml-2 text-muted-foreground font-normal">
                      ({calculateAge(formData.dob)} yrs old)
                    </span>
                  )}
                </Label>
                <DateInput
                  id="dob"
                  value={formData.dob}
                  onChange={(v) => handleInputChange("dob", v)}
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
                <Label htmlFor="dateOfJoining">Date of Joining</Label>
                <DateInput
                  id="dateOfJoining"
                  value={formData.dateOfJoining}
                  onChange={(v) =>
                    handleInputChange("dateOfJoining", v)
                  }
                />
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
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
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
            </div>

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
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="programId">Program *</Label>
                <Select
                  value={formData.programId.toString()}
                  onValueChange={(value) => {
                    handleInputChange("programId", value);
                    setFormData((prev) => ({
                      ...prev,
                      streamId: 0,
                      levelId: 0,
                    }));
                  }}
                  disabled={loadingPrograms}
                >
                  <SelectTrigger
                    className={errors.programId ? "border-red-500" : ""}
                  >
                    <SelectValue
                      placeholder={
                        loadingPrograms
                          ? "Loading programs..."
                          : "Select program"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {programs.map((program) => (
                      <SelectItem
                        key={program.id}
                        value={program.id.toString()}
                      >
                        {program.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.programId && (
                  <p className="text-red-500 text-sm flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.programId}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="streamId">Stream *</Label>
                <Select
                  value={formData.streamId.toString()}
                  onValueChange={(value) => {
                    handleInputChange("streamId", value);
                    setFormData((prev) => ({ ...prev, levelId: 0 }));
                  }}
                  disabled={
                    !formData.programId ||
                    formData.programId === 0 ||
                    loadingStreams
                  }
                >
                  <SelectTrigger
                    className={errors.streamId ? "border-red-500" : ""}
                  >
                    <SelectValue
                      placeholder={
                        loadingStreams
                          ? "Loading streams..."
                          : formData.programId === 0
                          ? "Select program first"
                          : "Select stream"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {streams.map((stream) => (
                      <SelectItem key={stream.id} value={stream.id.toString()}>
                        {stream.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.streamId && (
                  <p className="text-red-500 text-sm flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.streamId}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="levelId">Level *</Label>
                <Select
                  value={formData.levelId.toString()}
                  onValueChange={(value) => handleInputChange("levelId", value)}
                  disabled={
                    !formData.streamId ||
                    formData.streamId === 0 ||
                    loadingLevels
                  }
                >
                  <SelectTrigger
                    className={errors.levelId ? "border-red-500" : ""}
                  >
                    <SelectValue
                      placeholder={
                        loadingLevels
                          ? "Loading levels..."
                          : formData.streamId === 0
                          ? "Select stream first"
                          : "Select level"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {levels.map((level) => (
                      <SelectItem key={level.id} value={level.id.toString()}>
                        {level.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.levelId && (
                  <p className="text-red-500 text-sm flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.levelId}
                  </p>
                )}
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
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (submitted) {
    return (
      <AppDialog open={false} onOpenChange={handleClose} size="sm">
        <AppDialogHeader
          icon={CheckCircle}
          title="Student Updated Successfully!"
          description="The student information has been updated successfully."
        />
        <AppDialogBody>
          <div className="text-center text-sm text-muted-foreground">
            You can close this dialog.
          </div>
        </AppDialogBody>
        <AppDialogFooter
          primary={{
            label: "Close",
            onClick: handleClose,
          }}
        />
      </AppDialog>
    );
  }

  if (!student) {
    return null;
  }

  return (
    <AppDialog open={open} onOpenChange={handleClose} size="xl" scrollBody>
      <AppDialogHeader
        icon={Edit2}
        title="Edit Student"
        description="Update student information section by section"
      />
      <AppDialogBody>
        <form id="edit-student-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Tabs */}
          <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
            <div className="flex gap-2">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md transition-all duration-200 ${
                      activeTab === tab.id
                        ? "bg-primary text-white shadow-md"
                        : "bg-white text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{tab.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Content */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
                {(() => {
                  const currentTab = TABS.find((t) => t.id === activeTab);
                  if (currentTab) {
                    const Icon = currentTab.icon;
                    return (
                      <>
                        <Icon className="w-5 h-5" />
                        {currentTab.title}
                      </>
                    );
                  }
                  return null;
                })()}
              </h3>
              <div className="space-y-4">{renderTabContent()}</div>
            </div>
          </div>
        </form>
      </AppDialogBody>
      <AppDialogFooter
        sticky
        tertiary={
          activeTab > 1
            ? {
                label: "Previous Tab",
                onClick: () => setActiveTab(activeTab - 1),
                variant: "outline",
              }
            : undefined
        }
        secondary={
          activeTab < TABS.length
            ? {
                label: "Next Tab",
                onClick: () => setActiveTab(activeTab + 1),
              }
            : undefined
        }
        primary={{
          label: isLoading
            ? "Updating..."
            : `Update ${TABS.find((t) => t.id === activeTab)?.title ?? ""}`,
          type: "submit",
          form: "edit-student-form",
          loading: isLoading,
          icon: Edit2,
        }}
      />
    </AppDialog>
  );
}

