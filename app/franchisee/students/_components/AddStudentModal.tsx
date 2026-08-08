"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button as _Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
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
import { ToggleField } from "@/components/shared/toggle-field";
import { User, Save as _Save, AlertCircle, CheckCircle } from "lucide-react";
import React from "react";
import {
  ConfirmDialog,
  MultiStepDialog,
  SuccessDialog,
  type StepDef,
} from "@/components/shared/dialog";
import {
  StudentStream,
  StudentIdStatus,
  type CreateStudentInput,
} from "@/services/student.service";
import { useCreateStudentWithRevalidation } from "@/hooks/api/student.hooks";
import { useUser } from "@/context/user-context";
import { sendClientLog } from "@/lib/client-telemetry";
import { makeFieldChangeHandler } from "@/lib/form-utils";
import { handleFormApiError } from "@/lib/form-errors";
import { useFormSteps } from "@/hooks/use-form-steps";
import { useDirtyCloseGuard } from "@/hooks/use-dirty-close-guard";
import { STUDENT_FORM_STEPS as FORM_STEPS } from "@/lib/constants/education";
import {
  PersonalInfoFields,
  ParentInfoFields,
  ContactInfoFields,
  ProgramSelectionFields,
  useCascadingSelects,
} from "@/components/students/student-form";


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
  dob: string;
  dateOfJoining: string;
  sex: string;
  standard: string;
  streamId: number;
  levelId: number;
  stream: string;
  status: string;
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
  previousCompletedAt: string;
  previousInstructorId: number;
  idCardIssued: boolean;
  idCardIssueDate: string;
}

const INITIAL_FORM_DATA: StudentFormData = {
  existing: false,
  studentName: "",
  dob: "",
  dateOfJoining: new Date().toISOString().split("T")[0],
  sex: "",
  standard: "",
  streamId: 0,
  levelId: 0,
  stream: "regular",
  status: "active",
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
  previousCompletedAt: "",
  previousInstructorId: 0,
  idCardIssued: false,
  idCardIssueDate: "",
};

export default function AddStudentModal({
  open,
  onOpenChange,
  onSuccess,
}: AddStudentModalProps) {
  const { currentStep, setCurrentStep, handleNext, handlePrevious } =
    useFormSteps(FORM_STEPS.length, () => validateCurrentStep());
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<StudentFormData>(INITIAL_FORM_DATA);
  // Serialized pristine snapshot for the dirty-close guard; updated on reset
  // (the reset refreshes dateOfJoining, so the module constant can't anchor it).
  const [pristineJson, setPristineJson] = useState<string>(() =>
    JSON.stringify(INITIAL_FORM_DATA),
  );

  const { user } = useUser();
  const createStudentMutation = useCreateStudentWithRevalidation();

  const {
    programs,
    streams,
    levels,
    previousLevelCandidates,
    instructors,
    loadingPrograms,
    loadingStreams,
    loadingLevels,
    loadingInstructors,
  } = useCascadingSelects({
    open,
    programId: formData.programId,
    streamId: formData.streamId,
    autoSelectFirstLevel: !formData.existing,
    levelId: formData.levelId,
    onLevelIdChange: (id) =>
      setFormData((prev) => ({ ...prev, levelId: id })),
    onPreviousLevelIdChange: (id) =>
      setFormData((prev) => ({ ...prev, previousLevelId: id })),
    existing: formData.existing,
    franchiseId: user?.franchiseId ?? undefined,
  });

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
          if (!formData.previousMarks.trim() || Number.isNaN(marks)) {
            newErrors.previousMarks = "Marks obtained is required";
          }
          const pickedCandidate = previousLevelCandidates.find(
            (c) => c.id === formData.previousLevelId
          );
          const total = pickedCandidate?.totalMarks;
          if (!newErrors.previousMarks && total != null && marks > total) {
            newErrors.previousMarks = `Marks cannot exceed level's totalMarks (${total})`;
          }
          if (!formData.previousCompletedAt) {
            newErrors.previousCompletedAt = "Completion date is required";
          } else if (new Date(formData.previousCompletedAt) > new Date()) {
            newErrors.previousCompletedAt =
              "Completion date cannot be in the future";
          }
          if (
            !formData.previousInstructorId ||
            formData.previousInstructorId === 0
          ) {
            newErrors.previousInstructorId = "Instructor is required";
          }
          if (formData.idCardIssued && !formData.idCardIssueDate) {
            newErrors.idCardIssueDate =
              "Issue date is required when ID card is issued";
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

  const handleInputChange = makeFieldChangeHandler(setFormData, errors, setErrors, [
    "programId",
    "streamId",
    "levelId",
    "previousLevelId",
    "previousInstructorId",
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateCurrentStep()) return;

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
              completedAt: formData.previousCompletedAt,
              instructorId: Number(formData.previousInstructorId),
            }
          : undefined;

      const studentData: CreateStudentInput = {
        franchiseId: user.franchiseId,
        programId: Number(formData.programId),
        name: formData.studentName,
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
        status: formData.status as "active" | "inactive",
        idIssued,
        idIssueDate,
        existing: formData.existing,
        previousLevel,
      };

      await createStudentMutation.mutateAsync(studentData);
      setSubmitted(true);
      onSuccess();
    } catch (error) {
      sendClientLog({
        level: "error",
        event: "student-register-error",
        message: "Error registering student",
        context: { error },
      });
      handleFormApiError(error, {
        setErrors,
        fieldMap: { email: "mailId" },
        fieldToStep: { mailId: 3 },
        goToStep: setCurrentStep,
        fallback: "Failed to register student. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    const fresh = { ...INITIAL_FORM_DATA, dateOfJoining: new Date().toISOString().split("T")[0] };
    setFormData(fresh);
    setPristineJson(JSON.stringify(fresh));
    setErrors({});
    setSubmitted(false);
    setIsLoading(false);
    onOpenChange(false);
  };

  const isDirty =
    !submitted && JSON.stringify(formData) !== pristineJson;

  const { requestClose, confirmOpen, setConfirmOpen, confirmAndDiscard } =
    useDirtyCloseGuard({ isDirty, onDiscard: handleClose });

  const handleModalOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      requestClose(false);
    } else {
      onOpenChange(isOpen);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <ToggleField
              icon={User}
              label="Student type"
              value={formData.existing ? "existing" : "new"}
              onValueChange={(v) => {
                if (v === "existing") {
                  handleInputChange("existing", true);
                  return;
                }
                setFormData((prev) => {
                  const clearedExistingFields = {
                    previousLevelId: 0,
                    previousMarks: "",
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
              options={[
                {
                  value: "new",
                  label: "New student",
                  description: "Select this for new student registration.",
                },
                {
                  value: "existing",
                  label: "Existing student",
                  description:
                    "Select this if the student is already enrolled in your franchise — you'll capture their previous level.",
                },
              ]}
            />

            <PersonalInfoFields
              formData={formData}
              errors={errors}
              onFieldChange={handleInputChange}
              dateOfJoiningRequired
            />

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
              levelEditable={formData.existing}
              levelAutoSet={!formData.existing}
            />

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
                        onValueChange={(value) =>
                          handleInputChange("previousLevelId", value)
                        }
                        disabled={
                          !formData.levelId ||
                          formData.levelId === 0 ||
                          previousLevelCandidates.length === 0
                        }
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
                                : previousLevelCandidates.length === 0
                                ? "No earlier level for this current level"
                                : "Previous level"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {previousLevelCandidates.map((c) => (
                            <SelectItem key={c.id} value={c.id.toString()}>
                              {c.viaTransition
                                ? `${c.code} — ${c.name}  (via ${c.streamName})`
                                : `${c.code} — ${c.name}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-amber-700">
                        Defaults to the same-stream predecessor. If a stream
                        transition lands at this level, you can switch to the
                        source-stream candidate.
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
                      <Label htmlFor="previousMarks">
                        Marks Obtained *
                        {(() => {
                          const picked = previousLevelCandidates.find(
                            (c) => c.id === formData.previousLevelId
                          );
                          return picked?.totalMarks != null ? (
                            <span className="ml-2 text-muted-foreground font-normal">
                              (out of {picked.totalMarks})
                            </span>
                          ) : null;
                        })()}
                      </Label>
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
                      <Label htmlFor="previousCompletedAt">
                        Completion Date *
                      </Label>
                      <DateInput
                        id="previousCompletedAt"
                        max={new Date().toISOString().slice(0, 10)}
                        value={formData.previousCompletedAt}
                        onChange={(v) =>
                          handleInputChange("previousCompletedAt", v)
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
                      <DateInput
                        id="idCardIssueDate"
                        max={new Date().toISOString().slice(0, 10)}
                        value={formData.idCardIssueDate}
                        onChange={(v) =>
                          handleInputChange("idCardIssueDate", v)
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
                    <p className="text-sm text-muted-foreground">
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
      <SuccessDialog
        open={open}
        onOpenChange={handleModalOpenChange}
        title="Student Registered Successfully!"
        description="The student has been registered successfully. You can now view and manage the student from the students list."
        actionLabel="Close"
        onAction={handleClose}
      />
    );
  }

  return (
    <>
      <MultiStepDialog
        open={open}
        onOpenChange={handleModalOpenChange}
        size="xl"
        title="Register New Student"
        description="Complete student registration step by step"
        headerIcon={User}
        steps={FORM_STEPS}
        currentStep={currentStep}
        onBack={handlePrevious}
        onNext={handleNext}
        onSubmit={() =>
          handleSubmit({ preventDefault: () => {} } as React.FormEvent)
        }
        isSubmitting={isLoading}
        submitLabel="Register Student"
      >
        <div className="space-y-4">{renderStepContent()}</div>
      </MultiStepDialog>
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
