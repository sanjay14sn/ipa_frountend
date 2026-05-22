"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
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
} from "lucide-react";
import React from "react";
import {
  StudentStream,
  StudentIdStatus,
  type StudentData,
  type CreateStudentInput,
} from "@/services/student.service";
import { useCreateStudentWithRevalidation } from "@/hooks/api/student.hooks";
import { useUser } from "@/context/user-context";
import { getAllPrograms, Program } from "@/services/program.service";
import { getLevelsByStream, Level } from "@/services/level.service";
import { getStreamsByProgram, Stream } from "@/services/stream.service";
import {
  getAllCourseInstructors,
  type CourseInstructorData,
} from "@/services/course-instructor.service";

function calculateAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

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
                    ? "bg-primary text-white border-primary shadow-md"
                    : currentStep > step.id
                    ? "bg-primary text-white border-primary"
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
                    currentStep > step.id ? "bg-primary" : "bg-gray-300"
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
  // Student Type
  existing: boolean;

  // Basic Information
  studentName: string;
  rollNo: string;
  dob: string;
  dateOfJoining: string;
  sex: string;
  standard: string;
  streamId: number;
  levelId: number;
  stream: string;
  status: string;
  photoImage: File | null;
  programId: number;

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

  // Existing-student fields
  previousLevelId: number;
  previousMarks: string;
  previousTheoryMarks: string;
  previousTotalMarks: string;
  previousCompletedAt: string;
  previousInstructorId: number;
  idCardIssued: boolean;
  idCardIssueDate: string;
}

export default function AddStudentModal({
  open,
  onOpenChange,
  onSuccess,
}: AddStudentModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [programs, setPrograms] = useState<Program[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [loadingStreams, setLoadingStreams] = useState(false);
  const [loadingLevels, setLoadingLevels] = useState(false);
  const [instructors, setInstructors] = useState<CourseInstructorData[]>([]);
  const [loadingInstructors, setLoadingInstructors] = useState(false);

  const { user } = useUser();
  const createStudentMutation = useCreateStudentWithRevalidation();

  const [formData, setFormData] = useState<StudentFormData>({
    existing: false,

    studentName: "",
    rollNo: "",
    dob: "",
    dateOfJoining: new Date().toISOString().split("T")[0],
    sex: "",
    standard: "",
    streamId: 0,
    levelId: 0,
    stream: "regular",
    status: "active",
    photoImage: null,
    programId: 0,

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

    previousLevelId: 0,
    previousMarks: "",
    previousTheoryMarks: "",
    previousTotalMarks: "",
    previousCompletedAt: "",
    previousInstructorId: 0,
    idCardIssued: false,
    idCardIssueDate: "",
  });

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

  useEffect(() => {
    const fetchLevels = async () => {
      if (formData.streamId && formData.streamId > 0) {
        setLoadingLevels(true);
        try {
          const fetchedLevels = await getLevelsByStream(formData.streamId);
          setLevels(fetchedLevels);
          if (fetchedLevels.length > 0) {
            setFormData((prev) => {
              if (!prev.existing) {
                const firstLevel = fetchedLevels[0];
                return {
                  ...prev,
                  levelId: firstLevel.id,
                };
              }
              // Existing student: preserve current pick if still valid;
              // otherwise reset to 0 so the user must choose freely.
              const currentLevelExists = fetchedLevels.some(
                (level) => level.id === prev.levelId
              );
              if (!currentLevelExists) {
                return {
                  ...prev,
                  levelId: 0,
                  previousLevelId: 0,
                  previousTotalMarks: "",
                };
              }
              return prev;
            });
          }
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

  useEffect(() => {
    if (
      !formData.existing ||
      !formData.levelId ||
      formData.levelId === 0 ||
      levels.length === 0
    ) {
      return;
    }
    const current = levels.find((l) => l.id === formData.levelId);
    if (!current) return;
    const prev = levels
      .filter((l) => l.displayOrder < current.displayOrder)
      .sort((a, b) => b.displayOrder - a.displayOrder)[0];
    setFormData((p) => {
      const nextId = prev ? prev.id : 0;
      if (
        p.previousLevelId === nextId &&
        (!prev?.totalMarks ||
          p.previousTotalMarks === String(prev.totalMarks))
      ) {
        return p;
      }
      return {
        ...p,
        previousLevelId: nextId,
        previousTotalMarks: prev?.totalMarks
          ? String(prev.totalMarks)
          : p.previousTotalMarks,
      };
    });
  }, [formData.existing, formData.levelId, levels]);

  useEffect(() => {
    const fetchInstructors = async () => {
      if (
        !formData.existing ||
        !formData.programId ||
        formData.programId === 0 ||
        !user?.franchiseId
      ) {
        setInstructors([]);
        return;
      }
      setLoadingInstructors(true);
      try {
        const paginated = await getAllCourseInstructors({
          franchiseId: user.franchiseId,
          programId: formData.programId,
          limit: 200,
        });
        setInstructors(paginated.result ?? []);
      } catch (error) {
        console.error("Error fetching instructors:", error);
        setInstructors([]);
      } finally {
        setLoadingInstructors(false);
      }
    };
    fetchInstructors();
  }, [formData.existing, formData.programId, user?.franchiseId]);

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
        if (!formData.dateOfJoining) {
          newErrors.dateOfJoining = "Date of joining is required";
        }
        if (!formData.sex) {
          newErrors.sex = "Gender is required";
        }
        if (!formData.standard) {
          newErrors.standard = "Standard is required";
        }
        if (!formData.programId || formData.programId === 0) {
          newErrors.programId = "Program selection is required";
        }
        if (!formData.streamId || formData.streamId === 0) {
          newErrors.streamId = "Stream selection is required";
        }
        if (!formData.levelId || formData.levelId === 0) {
          newErrors.levelId = "Level is required";
        }
        if (formData.existing) {
          const currentLevel = levels.find((l) => l.id === formData.levelId);
          const previousLevel = levels.find(
            (l) => l.id === formData.previousLevelId
          );
          if (!formData.previousLevelId || formData.previousLevelId === 0) {
            newErrors.previousLevelId = "Previous level is required";
          } else if (
            currentLevel &&
            previousLevel &&
            previousLevel.displayOrder >= currentLevel.displayOrder
          ) {
            newErrors.previousLevelId =
              "Previous level must come before the current level";
          }
          const marks = Number(formData.previousMarks);
          const theory = Number(formData.previousTheoryMarks);
          const total = Number(formData.previousTotalMarks);
          if (!formData.previousMarks.trim() || Number.isNaN(marks)) {
            newErrors.previousMarks = "Marks obtained is required";
          }
          if (!formData.previousTheoryMarks.trim() || Number.isNaN(theory)) {
            newErrors.previousTheoryMarks = "Theory marks is required";
          }
          if (!formData.previousTotalMarks.trim() || Number.isNaN(total)) {
            newErrors.previousTotalMarks = "Total marks is required";
          }
          if (!newErrors.previousMarks && !newErrors.previousTotalMarks && marks > total) {
            newErrors.previousMarks = "Marks cannot exceed total marks";
          }
          if (!newErrors.previousTheoryMarks && !newErrors.previousTotalMarks && theory > total) {
            newErrors.previousTheoryMarks = "Theory marks cannot exceed total marks";
          }
          if (!formData.previousCompletedAt) {
            newErrors.previousCompletedAt = "Completion date is required";
          } else if (new Date(formData.previousCompletedAt) > new Date()) {
            newErrors.previousCompletedAt = "Completion date cannot be in the future";
          }
          if (
            !formData.previousInstructorId ||
            formData.previousInstructorId === 0
          ) {
            newErrors.previousInstructorId = "Instructor is required";
          }
          if (formData.idCardIssued && !formData.idCardIssueDate) {
            newErrors.idCardIssueDate = "Issue date is required when ID card is issued";
          }
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
        if (formData.isDiscontinued && !formData.discontinueReason.trim()) {
          newErrors.discontinueReason =
            "Please provide reason for discontinuation";
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

    if (
      (field === "programId" ||
        field === "streamId" ||
        field === "levelId" ||
        field === "previousLevelId" ||
        field === "previousInstructorId") &&
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

    if (!validateCurrentStep()) {
      return;
    }

    if (!user) {
      toast.error("User not found. Please log in again.");
      return;
    }

    if (!user.franchiseId) {
      toast.error("Franchise ID not found. Please contact support.");
      return;
    }

    setIsLoading(true);

    try {
      const idIssued =
        formData.existing && formData.idCardIssued
          ? StudentIdStatus.ISSUED
          : StudentIdStatus.NOT_ISSUED;
      const idIssueDate =
        formData.existing && formData.idCardIssued
          ? formData.idCardIssueDate
          : undefined;
      const previousLevel =
        formData.existing && formData.previousLevelId > 0
          ? {
              levelId: Number(formData.previousLevelId),
              marks: Number(formData.previousMarks),
              theoryMarks: Number(formData.previousTheoryMarks),
              totalMarks: Number(formData.previousTotalMarks),
              completedAt: formData.previousCompletedAt,
              instructorId: Number(formData.previousInstructorId),
            }
          : undefined;

      const studentData: CreateStudentInput = {
        franchiseId: user.franchiseId,
        programId: Number(formData.programId),
        name: formData.studentName,
        rollNo: formData.rollNo || "",
        dateOfBirth: new Date(formData.dob),
        dateOfJoining: new Date(formData.dateOfJoining),
        sex: formData.sex,
        fatherName: formData.fatherName,
        fatherQualification: formData.fatherQualification,
        fatherOccupation: formData.fatherOccupation,
        motherName: formData.motherName,
        motherQualification: formData.motherQualification,
        motherOccupation: formData.motherOccupation,
        residentialAddress: formData.residentialAddress,
        fatherContactNo: formData.fatherContactNo,
        motherContactNo: formData.motherContactNo,
        mail: formData.mailId,
        standard: formData.standard,
        levelId: Number(formData.levelId),
        level: "",
        stream: StudentStream.REGULAR,
        isActive: formData.status === "active",
        idIssued,
        idIssueDate,
        existing: formData.existing,
        previousLevel,
      };

      await createStudentMutation.mutateAsync(studentData);

      setSubmitted(true);
      onSuccess();
    } catch (error) {
      console.error("Error registering student:", error);
      toast.error("Failed to register student. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setFormData({
      existing: false,

      studentName: "",
      rollNo: "",
      dob: "",
      dateOfJoining: new Date().toISOString().split("T")[0],
      sex: "",
      standard: "",
      streamId: 0,
      levelId: 0,
      stream: "regular",
      status: "active",
      photoImage: null,
      programId: 0,

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

      previousLevelId: 0,
      previousMarks: "",
      previousTheoryMarks: "",
      previousTotalMarks: "",
      previousCompletedAt: "",
      previousInstructorId: 0,
      idCardIssued: false,
      idCardIssueDate: "",
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
            {/* Student Type Selection */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <h4 className="font-medium text-primary mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                Student Type
              </h4>
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="newStudent"
                    name="studentType"
                    checked={!formData.existing}
                    onChange={() => {
                      // For new students, auto-select first level if stream is selected
                      // and clear any previously-entered existing-student data.
                      setFormData((prev) => {
                        const clearedExistingFields = {
                          previousLevelId: 0,
                          previousMarks: "",
                          previousTheoryMarks: "",
                          previousTotalMarks: "",
                          previousCompletedAt: "",
                          previousInstructorId: 0,
                          idCardIssued: false,
                          idCardIssueDate: "",
                        };
                        if (prev.streamId > 0 && levels.length > 0) {
                          const firstLevel = levels[0];
                          return {
                            ...prev,
                            existing: false,
                            levelId: firstLevel.id,
                            ...clearedExistingFields,
                          };
                        }
                        return {
                          ...prev,
                          existing: false,
                          levelId: 0,
                          ...clearedExistingFields,
                        };
                      });
                    }}
                    className="w-4 h-4 text-primary bg-gray-100 border-gray-300 focus:ring-primary"
                  />
                  <Label htmlFor="newStudent" className="text-sm font-medium">
                    New Student
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="existingStudent"
                    name="studentType"
                    checked={formData.existing}
                    onChange={() => handleInputChange("existing", true)}
                    className="w-4 h-4 text-primary bg-gray-100 border-gray-300 focus:ring-primary"
                  />
                  <Label
                    htmlFor="existingStudent"
                    className="text-sm font-medium"
                  >
                    Existing Student
                  </Label>
                </div>
              </div>
              <p className="text-sm text-primary/80 mt-2">
                {formData.existing
                  ? "Select this if the student is already enrolled in your franchise"
                  : "Select this for new student registration"}
              </p>
            </div>

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
                <Label htmlFor="dob">
                  Date of Birth *{formData.dob && (
                    <span className="ml-2 text-muted-foreground font-normal">
                      ({calculateAge(formData.dob)} yrs old)
                    </span>
                  )}
                </Label>
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
                <Label htmlFor="dateOfJoining">Date of Joining *</Label>
                <Input
                  id="dateOfJoining"
                  type="date"
                  value={formData.dateOfJoining}
                  onChange={(e) =>
                    handleInputChange("dateOfJoining", e.target.value)
                  }
                  className={errors.dateOfJoining ? "border-red-500" : ""}
                />
                {errors.dateOfJoining && (
                  <p className="text-red-500 text-sm flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.dateOfJoining}
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
                <Label htmlFor="programId">Program *</Label>
                <Select
                  value={formData.programId.toString()}
                  onValueChange={(value) => {
                    handleInputChange("programId", value);
                    // Reset streamId and levelId when program changes
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
                    // Reset levelId when stream changes
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
                    loadingLevels ||
                    !formData.existing
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
                          : !formData.existing
                          ? "Auto-set to first level"
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            {formData.existing && (
              <>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-4">
                  <h4 className="font-medium text-amber-900 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Previous Level Progression
                  </h4>
                  <p className="text-sm text-amber-800">
                    Enter the level the student most recently completed. A
                    certificate will be issued automatically for that level.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="previousLevelId">Previous Level *</Label>
                      <Select
                        value={formData.previousLevelId.toString()}
                        onValueChange={() => {
                          /* auto-derived from current level; read-only */
                        }}
                        disabled
                      >
                        <SelectTrigger
                          className={
                            errors.previousLevelId ? "border-red-500" : ""
                          }
                        >
                          <SelectValue
                            placeholder={
                              !formData.levelId || formData.levelId === 0
                                ? "Select current level first"
                                : formData.previousLevelId === 0
                                ? "No earlier level in this stream"
                                : "Previous level"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {levels.map((level) => (
                            <SelectItem
                              key={level.id}
                              value={level.id.toString()}
                            >
                              {level.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-amber-700">
                        Auto-selected as the level one order before the current level.
                      </p>
                      {errors.previousLevelId && (
                        <p className="text-red-500 text-sm flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {errors.previousLevelId}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="previousInstructorId">Instructor *</Label>
                      <Select
                        value={formData.previousInstructorId.toString()}
                        onValueChange={(value) =>
                          handleInputChange("previousInstructorId", value)
                        }
                        disabled={
                          !formData.programId ||
                          formData.programId === 0 ||
                          loadingInstructors
                        }
                      >
                        <SelectTrigger
                          className={
                            errors.previousInstructorId ? "border-red-500" : ""
                          }
                        >
                          <SelectValue
                            placeholder={
                              loadingInstructors
                                ? "Loading instructors..."
                                : !formData.programId
                                ? "Select program first"
                                : instructors.length === 0
                                ? "No instructors available"
                                : "Select instructor"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {instructors.map((ci) => (
                            <SelectItem key={ci.id} value={ci.id.toString()}>
                              {ci.name}
                              {ci.instructorId ? ` (${ci.instructorId})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.previousInstructorId && (
                        <p className="text-red-500 text-sm flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {errors.previousInstructorId}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="previousTotalMarks">Total Marks *</Label>
                      <Input
                        id="previousTotalMarks"
                        type="number"
                        min={0}
                        value={formData.previousTotalMarks}
                        onChange={(e) =>
                          handleInputChange("previousTotalMarks", e.target.value)
                        }
                        className={
                          errors.previousTotalMarks ? "border-red-500" : ""
                        }
                        placeholder="e.g. 100"
                      />
                      {errors.previousTotalMarks && (
                        <p className="text-red-500 text-sm flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {errors.previousTotalMarks}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="previousMarks">Marks Obtained *</Label>
                      <Input
                        id="previousMarks"
                        type="number"
                        min={0}
                        value={formData.previousMarks}
                        onChange={(e) =>
                          handleInputChange("previousMarks", e.target.value)
                        }
                        className={errors.previousMarks ? "border-red-500" : ""}
                        placeholder="e.g. 85"
                      />
                      {errors.previousMarks && (
                        <p className="text-red-500 text-sm flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {errors.previousMarks}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="previousTheoryMarks">Theory Marks *</Label>
                      <Input
                        id="previousTheoryMarks"
                        type="number"
                        min={0}
                        value={formData.previousTheoryMarks}
                        onChange={(e) =>
                          handleInputChange("previousTheoryMarks", e.target.value)
                        }
                        className={
                          errors.previousTheoryMarks ? "border-red-500" : ""
                        }
                        placeholder="e.g. 40"
                      />
                      {errors.previousTheoryMarks && (
                        <p className="text-red-500 text-sm flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {errors.previousTheoryMarks}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="previousCompletedAt">
                        Completion Date *
                      </Label>
                      <Input
                        id="previousCompletedAt"
                        type="date"
                        max={new Date().toISOString().slice(0, 10)}
                        value={formData.previousCompletedAt}
                        onChange={(e) =>
                          handleInputChange("previousCompletedAt", e.target.value)
                        }
                        className={
                          errors.previousCompletedAt ? "border-red-500" : ""
                        }
                      />
                      {errors.previousCompletedAt && (
                        <p className="text-red-500 text-sm flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {errors.previousCompletedAt}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-sky-50 border border-sky-200 rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-sky-900 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    ID Card Status
                  </h4>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="idCardIssued"
                      checked={formData.idCardIssued}
                      onCheckedChange={(checked) => {
                        const isChecked = Boolean(checked);
                        setFormData((prev) => ({
                          ...prev,
                          idCardIssued: isChecked,
                          idCardIssueDate: isChecked
                            ? prev.idCardIssueDate
                            : "",
                        }));
                        if (errors.idCardIssueDate) {
                          setErrors((prev) => ({
                            ...prev,
                            idCardIssueDate: "",
                          }));
                        }
                      }}
                    />
                    <Label
                      htmlFor="idCardIssued"
                      className="text-sm font-medium cursor-pointer"
                    >
                      ID card already issued
                    </Label>
                  </div>
                  {formData.idCardIssued && (
                    <div className="space-y-2 max-w-xs">
                      <Label htmlFor="idCardIssueDate">Issue Date *</Label>
                      <Input
                        id="idCardIssueDate"
                        type="date"
                        max={new Date().toISOString().slice(0, 10)}
                        value={formData.idCardIssueDate}
                        onChange={(e) =>
                          handleInputChange("idCardIssueDate", e.target.value)
                        }
                        className={
                          errors.idCardIssueDate ? "border-red-500" : ""
                        }
                      />
                      {errors.idCardIssueDate && (
                        <p className="text-red-500 text-sm flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {errors.idCardIssueDate}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
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
            <div className="bg-secondary/10 border border-secondary/30 rounded-lg p-4">
              <h4 className="font-medium text-gray-800 mb-2 flex items-center gap-2">
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
                  <Label
                    htmlFor="isDiscontinued"
                    className="text-sm font-medium"
                  >
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
                      className={
                        errors.discontinueReason ? "border-red-500" : ""
                      }
                      placeholder="Please provide reason for discontinuation"
                      rows={3}
                    />
                    {errors.discontinueReason && (
                      <p className="text-red-500 text-sm flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.discontinueReason}
                      </p>
                    )}
                    <p className="text-sm text-gray-600">
                      ⚠️ Discontinued students cannot request certificates and
                      will need admin approval for reactivation.
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
              <CheckCircle className="h-12 w-12 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-bold text-gray-900">
              Student Registered Successfully!
            </DialogTitle>
            <DialogDescription className="text-center">
              The student has been registered successfully. You can now view and
              manage the student from the students list.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-4">
            <Button
              className="w-full bg-primary hover:bg-primary/90"
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
                      className="bg-primary hover:bg-primary/90"
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
                        className="bg-primary hover:bg-primary/90"
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
