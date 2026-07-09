"use client";

import { useState, useEffect } from "react";
import {
  AppDialog,
  AppDialogHeader,
  AppDialogBody,
  AppDialogFooter,
  ConfirmDialog,
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
import { makeFieldChangeHandler } from "@/lib/form-utils";
import { handleFormApiError } from "@/lib/form-errors";
import { useDirtyCloseGuard } from "@/hooks/use-dirty-close-guard";
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
  // Snapshot of the form as seeded from the student prop — the submit payload
  // is the DIFF of formData against this, and it anchors the dirty-close guard.
  const [seedData, setSeedData] = useState<StudentFormData>(EMPTY_FORM_DATA);

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

          const loaded: StudentFormData = {
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
          };
          setFormData(loaded);
          setSeedData(loaded);
        } catch (error) {
          sendClientLog({
            level: "error",
            event: "student-data-load-error",
            message: "Error loading student data",
            context: { error },
          });
          const loaded: StudentFormData = {
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
          };
          setFormData(loaded);
          setSeedData(loaded);
        }
        setActiveTab(1);
        setSubmitted(false);
        setErrors({});
      };
      loadStudentData();
    }
  }, [open, student]);

  const handleInputChange = makeFieldChangeHandler(setFormData, errors, setErrors, [
    "programId",
    "streamId",
    "levelId",
  ]);

  const collectTabErrors = (tab: number): Record<string, string> => {
    const newErrors: Record<string, string> = {};

    switch (tab) {
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

    return newErrors;
  };

  // The submit saves ALL tabs (diff-based), so validation covers every tab —
  // on failure jump to the first offending tab and show its errors.
  const validateAllTabs = (): boolean => {
    const allErrors: Record<string, string> = {};
    let firstBadTab: number | null = null;
    for (const tab of TABS) {
      const tabErrors = collectTabErrors(tab.id);
      if (Object.keys(tabErrors).length > 0 && firstBadTab === null) {
        firstBadTab = tab.id;
      }
      Object.assign(allErrors, tabErrors);
    }
    setErrors(allErrors);
    if (firstBadTab !== null) {
      setActiveTab(firstBadTab);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateAllTabs()) return;

    if (!student) {
      toast.error("Student not found. Please try again.");
      return;
    }

    // Diff every tab against the seeded student data — the backend update DTO
    // accepts partials, so only changed fields are sent.
    const updateData: Partial<StudentData> = {};
    if (formData.studentName !== seedData.studentName) {
      updateData.name = formData.studentName;
    }
    if (formData.dob !== seedData.dob) {
      updateData.dateOfBirth = new Date(formData.dob);
    }
    if (formData.dateOfJoining !== seedData.dateOfJoining) {
      updateData.dateOfJoining = new Date(formData.dateOfJoining);
    }
    if (formData.sex !== seedData.sex) updateData.sex = formData.sex;
    if (formData.standard !== seedData.standard) {
      updateData.standard = formData.standard;
    }
    if (formData.fatherName !== seedData.fatherName) {
      updateData.fatherName = formData.fatherName;
    }
    if (formData.fatherQualification !== seedData.fatherQualification) {
      updateData.fatherQualification = formData.fatherQualification;
    }
    if (formData.fatherOccupation !== seedData.fatherOccupation) {
      updateData.fatherOccupation = formData.fatherOccupation;
    }
    if (formData.fatherContactNo !== seedData.fatherContactNo) {
      updateData.fatherContactNo = formData.fatherContactNo;
    }
    if (formData.motherName !== seedData.motherName) {
      updateData.motherName = formData.motherName;
    }
    if (formData.motherQualification !== seedData.motherQualification) {
      updateData.motherQualification = formData.motherQualification;
    }
    if (formData.motherOccupation !== seedData.motherOccupation) {
      updateData.motherOccupation = formData.motherOccupation;
    }
    if (formData.motherContactNo !== seedData.motherContactNo) {
      updateData.motherContactNo = formData.motherContactNo;
    }
    if (formData.residentialAddress !== seedData.residentialAddress) {
      updateData.residentialAddress = formData.residentialAddress;
    }
    if (formData.mailId !== seedData.mailId) updateData.mail = formData.mailId;
    if (formData.programId !== seedData.programId) {
      updateData.programId = formData.programId;
    }
    if (formData.levelId !== seedData.levelId) {
      updateData.levelId = formData.levelId;
    }
    if (formData.status !== seedData.status && formData.status !== "completed") {
      updateData.status = formData.status as "active" | "inactive";
    }

    if (Object.keys(updateData).length === 0) {
      toast.info("No changes to save.");
      return;
    }

    setIsLoading(true);

    try {
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
      handleFormApiError(error, {
        setErrors,
        fieldMap: { email: "mailId" },
        fieldToStep: { mailId: 3 },
        goToStep: setActiveTab,
        fallback: "Failed to update student. Please try again.",
      });
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

  const isDirty =
    !submitted && JSON.stringify(formData) !== JSON.stringify(seedData);

  const { requestClose, confirmOpen, setConfirmOpen, confirmAndDiscard } =
    useDirtyCloseGuard({ isDirty, onDiscard: handleClose });

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
    <>
    <AppDialog open={open} onOpenChange={requestClose} size="xl" scrollBody>
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
          label: isLoading ? "Saving..." : "Save changes",
          type: "submit",
          form: "edit-student-form",
          loading: isLoading,
          icon: Edit2,
        }}
      />
    </AppDialog>
    <ConfirmDialog
      open={confirmOpen}
      onOpenChange={setConfirmOpen}
      variant="destructive"
      title="Discard changes?"
      description="Your in-progress input will be lost."
      confirmLabel="Discard"
      onConfirm={confirmAndDiscard}
    />
    </>
  );
}
