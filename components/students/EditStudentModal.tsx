"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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

/**
 * The tab validators this replaces lived in a 60-line switch keyed by tab id.
 * The rules are unchanged, field for field; what changes is that they are
 * declared once here instead of being re-run imperatively on every submit.
 */
const TEN_DIGITS = /^\d{10}$/;
const schema = z.object({
  studentName: z.string().trim().min(1, "Student name is required"),
  dob: z.string().min(1, "Date of birth is required"),
  dateOfJoining: z.string(),
  sex: z.string().min(1, "Gender is required"),
  standard: z.string().min(1, "Standard is required"),

  programId: z.number().min(1, "Program selection is required"),
  streamId: z.number().min(1, "Stream selection is required"),
  levelId: z.number().min(1, "Level is required"),
  status: z.string(),

  fatherName: z.string().trim().min(1, "Father's name is required"),
  fatherQualification: z.string(),
  fatherOccupation: z.string(),
  fatherContactNo: z
    .string()
    .trim()
    .min(1, "Father's contact number is required")
    .regex(TEN_DIGITS, "Please enter a valid 10-digit contact number"),
  motherName: z.string().trim().min(1, "Mother's name is required"),
  motherQualification: z.string(),
  motherOccupation: z.string(),
  motherContactNo: z
    .string()
    .trim()
    .min(1, "Mother's contact number is required")
    .regex(TEN_DIGITS, "Please enter a valid 10-digit contact number"),

  residentialAddress: z.string().trim().min(1, "Residential address is required"),
  mailId: z
    .string()
    .trim()
    .min(1, "Email is required")
    .regex(/\S+@\S+\.\S+/, "Please enter a valid email address"),
});

/**
 * Which tab each field lives on. The submit saves ALL tabs (diff-based), so a
 * validation failure has to jump to the first offending tab — previously the
 * tab switch did double duty as this map.
 */
const FIELD_TAB: Record<string, number> = {
  studentName: 1, dob: 1, sex: 1, standard: 1, dateOfJoining: 1,
  fatherName: 2, motherName: 2, fatherContactNo: 2, motherContactNo: 2,
  fatherQualification: 2, fatherOccupation: 2,
  motherQualification: 2, motherOccupation: 2,
  residentialAddress: 3, mailId: 3,
  programId: 4, streamId: 4, levelId: 4, status: 4,
};

/** Fields the shared field components hand back as strings but that are numeric. */
const NUMERIC_FIELDS = ["programId", "streamId", "levelId"] as const;

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
  const form = useForm<StudentFormData>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_FORM_DATA,
  });
  /**
   * The shared field components (PersonalInfoFields et al.) are also used by
   * AddStudentModal, which is not on react-hook-form. Rather than change their
   * contract — and drag an unrelated modal into this commit — they keep taking
   * `formData` / `errors` / `onFieldChange`, adapted here.
   */
  const formData = useWatch({ control: form.control }) as StudentFormData;
  const errors = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(form.formState.errors).map(([field, err]) => [
          field,
          (err as { message?: string })?.message ?? "",
        ]),
      ),
    [form.formState.errors],
  );
  const setErrors = (
    updater: (prev: Record<string, string>) => Record<string, string>,
  ) => {
    for (const [field, message] of Object.entries(updater({}))) {
      if (message) {
        form.setError(field as keyof StudentFormData, {
          type: "server",
          message,
        });
      }
    }
  };
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
        form.setValue("levelId", id, { shouldValidate: true }),
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
          form.reset(loaded);
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
          form.reset(loaded);
          setSeedData(loaded);
        }
        setActiveTab(1);
        setSubmitted(false);
      };
      loadStudentData();
    }
    // `form` is a stable react-hook-form instance; re-running on it would
    // re-seed the modal mid-edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, student]);

  const handleInputChange = (
    field: string,
    value: string | boolean | number,
  ) => {
    const next =
      NUMERIC_FIELDS.includes(field as (typeof NUMERIC_FIELDS)[number]) &&
      typeof value === "string"
        ? parseInt(value, 10) || 0
        : value;
    form.setValue(field as keyof StudentFormData, next as never, {
      shouldValidate: true,
    });
  };

  const handleSubmit = form.handleSubmit(
    async (formData) => {
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
    },
    /**
     * The submit saves every tab, so a failure anywhere must surface where the
     * user can see it — jump to the first offending tab, exactly as the old
     * validateAllTabs() did.
     */
    (fieldErrors) => {
      const tabs = Object.keys(fieldErrors)
        .map((field) => FIELD_TAB[field])
        .filter((tab): tab is number => tab != null);
      if (tabs.length > 0) setActiveTab(Math.min(...tabs));
    },
  );

  const handleClose = () => {
    setActiveTab(1);
    setSubmitted(false);
    form.clearErrors();
    setIsLoading(false);
    onOpenChange(false);
  };

  // react-hook-form tracks this against defaultValues, which `form.reset(loaded)`
  // sets to the seeded student — the same baseline the old JSON.stringify
  // comparison used, minus its dependence on key order (getValues does not
  // promise the key order of the object passed to reset, which would have made
  // the guard fire on every close).
  const isDirty = !submitted && form.formState.isDirty;

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
                form.setValue("streamId", 0);
                form.setValue("levelId", 0);
              }}
              onStreamChange={(value) => {
                handleInputChange("streamId", value);
                form.setValue("levelId", 0);
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
                        : "bg-white text-muted-foreground hover:bg-gray-100"
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
              <h3 className="text-lg font-semibold text-card-foreground mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
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
