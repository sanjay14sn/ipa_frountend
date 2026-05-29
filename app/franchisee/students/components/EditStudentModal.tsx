"use client";

import { useState, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import {
  User,
  Users,
  MapPin,
  BookOpen,
  AlertCircle as _AlertCircle,
  CheckCircle,
  Edit2,
} from "lucide-react";
import { toast } from "sonner";
import { StudentData } from "@/services/student.service";
import {
  updateStudentWithRevalidation,
  updateStudentAdminWithRevalidation,
} from "@/hooks/api/student.hooks";
import { getLevelsByProgram } from "@/services/level.service";
import { sendClientLog } from "@/lib/client-telemetry";
import {
  PersonalInfoFields,
  ParentInfoFields,
  ContactInfoFields,
  ProgramSelectionFields,
  useCascadingSelects,
} from "./student-form";

const TABS = [
  { id: 1, title: "Basic Information", icon: User },
  { id: 2, title: "Parent Details", icon: Users },
  { id: 3, title: "Contact & Address", icon: MapPin },
  { id: 4, title: "Academic Details", icon: BookOpen },
];

interface EditStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: StudentData | null;
  onSuccess: () => void;
  mode?: "franchise" | "admin";
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

const EMPTY_FORM_DATA: StudentFormData = {
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
};

export default function EditStudentModal({
  open,
  onOpenChange,
  student,
  onSuccess,
  mode = "franchise",
}: EditStudentModalProps) {
  const [activeTab, setActiveTab] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<StudentFormData>(EMPTY_FORM_DATA);

  const { programs, streams, levels, loadingPrograms, loadingStreams, loadingLevels } =
    useCascadingSelects({
      open,
      programId: formData.programId,
      streamId: formData.streamId,
      autoSelectFirstLevel: false,
      levelId: formData.levelId,
      onLevelIdChange: (id) =>
        setFormData((prev) => ({ ...prev, levelId: id })),
    });

  // Load student data when modal opens
  useEffect(() => {
    if (open && student) {
      const loadStudentData = async () => {
        try {
          let levelId = student.levelId ?? 0;
          let streamId = 0;

          if (student.programId) {
            const programLevels = await getLevelsByProgram(student.programId);
            const studentLevelName =
              typeof student.level === "object" &&
              student.level !== null &&
              "name" in student.level
                ? (student.level as { name: string }).name
                : typeof student.level === "string"
                ? student.level
                : "";
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
            streamId,
            levelId,
            status: student.status ?? "active",
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
          sendClientLog({
            level: "error",
            event: "student-data-load-error",
            message: "Error loading student data",
            context: { error },
          });
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
            status: student.status ?? "active",
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

  const handleInputChange = (
    field: string,
    value: string | boolean | number
  ) => {
    let convertedValue: string | boolean | number = value;

    if (
      (field === "programId" ||
        field === "streamId" ||
        field === "levelId") &&
      typeof value === "string"
    ) {
      convertedValue = parseInt(value, 10) || 0;
    }

    setFormData((prev) => ({
      ...prev,
      [field]: convertedValue,
    }));

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
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

    if (!validateCurrentTab()) return;

    if (!student) {
      toast.error("Student not found. Please try again.");
      return;
    }

    setIsLoading(true);

    try {
      const updateData: Partial<StudentData> = {};

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
          if (formData.status !== "completed") updateData.status = formData.status as "active" | "inactive";
          break;
      }

      if (mode === "admin") {
        await updateStudentAdminWithRevalidation(student.id, updateData);
      } else {
        await updateStudentWithRevalidation(student.id, updateData);
      }
      setSubmitted(true);
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1500);
    } catch (error) {
      sendClientLog({
        level: "error",
        event: "student-update-error",
        message: "Error updating student",
        context: { error },
      });
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
          <PersonalInfoFields
            formData={formData}
            errors={errors}
            onFieldChange={handleInputChange}
            lockIdentityFields={mode === "franchise"}
            lockDateOfJoining={mode === "franchise"}
          />
        );

      case 2:
        return (
          <ParentInfoFields
            formData={formData}
            errors={errors}
            onFieldChange={handleInputChange}
          />
        );

      case 3:
        return (
          <ContactInfoFields
            formData={formData}
            errors={errors}
            onFieldChange={handleInputChange}
          />
        );

      case 4:
        return (
          <div className="space-y-4">
            <ProgramSelectionFields
              formData={formData}
              errors={errors}
              onFieldChange={handleInputChange}
              onProgramChange={(value) => {
                handleInputChange("programId", value);
                setFormData((prev) => ({ ...prev, streamId: 0, levelId: 0 }));
              }}
              onStreamChange={(value) => {
                handleInputChange("streamId", value);
                setFormData((prev) => ({ ...prev, levelId: 0 }));
              }}
              programs={programs}
              streams={streams}
              levels={levels}
              loadingPrograms={loadingPrograms}
              loadingStreams={loadingStreams}
              loadingLevels={loadingLevels}
              levelEditable={mode !== "franchise"}
              programStreamEditable={mode !== "franchise"}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleInputChange("status", value)}
                  disabled={formData.status === "completed" || mode === "franchise"}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.status === "completed" && (
                      <SelectItem value="completed" disabled>Completed</SelectItem>
                    )}
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                {mode === "franchise" && (
                  <p className="text-muted-foreground text-xs mt-1">
                    Locked after enrollment — contact admin to change
                  </p>
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
          primary={{ label: "Close", onClick: handleClose }}
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
        <form
          id="edit-student-form"
          onSubmit={handleSubmit}
          className="space-y-6"
        >
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
