"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, AlertCircle } from "lucide-react";
import { BloodGroup } from "@/services/course-instructor.service";
import { StateCitySelect } from "@/components/StateCitySelect";
import { useCreateCourseInstructor } from "@/hooks/api/course-instructor.hooks";
import { useUser } from "@/context/user-context";
import { getAllPrograms, Program } from "@/services/program.service";
import {
  DialogFormField,
  DialogFormGrid,
  DialogStateMessage,
  MultiStepDialog,
  SuccessDialog,
  type StepDef,
} from "@/components/shared/dialog";
import { cn } from "@/lib/utils";

const FORM_STEPS: StepDef[] = [
  { id: 1, title: "Basic Information" },
  { id: 2, title: "Personal Details" },
  { id: 3, title: "Contact & Address" },
  { id: 4, title: "Professional Details" },
];

const BLOOD_GROUPS = [
  BloodGroup.A_POSITIVE,
  BloodGroup.A_NEGATIVE,
  BloodGroup.B_POSITIVE,
  BloodGroup.B_NEGATIVE,
  BloodGroup.AB_POSITIVE,
  BloodGroup.AB_NEGATIVE,
  BloodGroup.O_POSITIVE,
  BloodGroup.O_NEGATIVE,
];

interface AddCourseInstructorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface CourseInstructorFormData {
  name: string;
  instructorId: string;
  dob: string;
  bloodGroup: string;
  city: string;
  programId: number;
  address: string;
  phone: string;
  mail: string;
  education: string;
  occupation: string;
  reference: string;
  additionalDetails: string;
}

function calculateAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

const errorClass = "border-destructive focus-visible:ring-destructive";

export default function AddCourseInstructorModal({
  open,
  onOpenChange,
  onSuccess,
}: AddCourseInstructorModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);

  const { user } = useUser();
  const createCourseInstructorMutation = useCreateCourseInstructor();

  const fetchPrograms = async () => {
    try {
      setLoadingPrograms(true);
      const data = await getAllPrograms();
      setPrograms(data);
    } catch (error) {
      console.error("Error fetching programs:", error);
    } finally {
      setLoadingPrograms(false);
    }
  };

  const [formData, setFormData] = useState<CourseInstructorFormData>({
    name: "",
    instructorId: "",
    dob: "",
    bloodGroup: "",
    city: "",
    programId: 0,
    address: "",
    phone: "",
    mail: "",
    education: "",
    occupation: "",
    reference: "",
    additionalDetails: "",
  });

  const validateCurrentStep = () => {
    const newErrors: Record<string, string> = {};

    switch (currentStep) {
      case 1:
        if (!formData.name.trim()) newErrors.name = "Name is required";
        if (!formData.programId || formData.programId === 0)
          newErrors.programId = "Program selection is required";
        if (!formData.dob) newErrors.dob = "Date of birth is required";
        if (!formData.bloodGroup)
          newErrors.bloodGroup = "Blood group is required";
        if (!formData.city) newErrors.city = "City is required";
        break;
      case 2:
        if (!formData.address.trim())
          newErrors.address = "Address is required";
        if (!formData.phone.trim()) newErrors.phone = "Phone number is required";
        else if (!/^\d{10}$/.test(formData.phone))
          newErrors.phone = "Please enter a valid 10-digit phone number";
        if (!formData.mail.trim()) newErrors.mail = "Email is required";
        else if (!/\S+@\S+\.\S+/.test(formData.mail))
          newErrors.mail = "Please enter a valid email address";
        break;
      case 3:
        if (!formData.education.trim())
          newErrors.education = "Education is required";
        if (!formData.occupation.trim())
          newErrors.occupation = "Occupation is required";
        if (!formData.reference.trim())
          newErrors.reference = "Reference is required";
        break;
      case 4:
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
        field === "trainingLevelId" ||
        field === "numberOfLevels") &&
      typeof value === "string"
    ) {
      convertedValue = parseInt(value, 10) || 0;
    }
    setFormData((prev) => ({ ...prev, [field]: convertedValue }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleProgramSelectOpen = (open: boolean) => {
    if (open && programs.length === 0 && !loadingPrograms) {
      fetchPrograms();
    }
  };

  const handleSubmit = async () => {
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
      const courseInstructorData: any = {
        franchiseId: user.franchiseId,
        programId: Number(formData.programId),
        instructorId: formData.instructorId || `CI${Date.now()}`,
        name: formData.name,
        dob: new Date(formData.dob),
        bloodGroup: formData.bloodGroup as BloodGroup,
        address: formData.address,
        city: formData.city,
        phone: formData.phone,
        mail: formData.mail,
        education: formData.education,
        occupation: formData.occupation,
        reference: formData.reference,
      };

      await createCourseInstructorMutation.mutateAsync(courseInstructorData);
      setSubmitted(true);
      onSuccess();
    } catch (error) {
      console.error("Error registering course instructor:", error);
      toast.error("Failed to register course instructor. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setFormData({
      name: "",
      instructorId: "",
      dob: "",
      bloodGroup: "",
      city: "",
      programId: 0,
      address: "",
      phone: "",
      mail: "",
      education: "",
      occupation: "",
      reference: "",
      additionalDetails: "",
    });
    setErrors({});
    setSubmitted(false);
    setIsLoading(false);
    onOpenChange(false);
  };

  if (submitted) {
    return (
      <SuccessDialog
        open={open}
        onOpenChange={handleClose}
        title="Course Instructor Registered Successfully!"
        description="The course instructor has been registered successfully. You can now view and manage the course instructor from the course instructors list."
        actionLabel="Close"
        onAction={handleClose}
      />
    );
  }

  return (
    <MultiStepDialog
      open={open}
      onOpenChange={(o) => (o ? onOpenChange(o) : handleClose())}
      size="xl"
      title="Register New Course Instructor"
      description="Complete course instructor registration step by step"
      headerIcon={User}
      steps={FORM_STEPS}
      currentStep={currentStep}
      onBack={handlePrevious}
      onNext={handleNext}
      onSubmit={handleSubmit}
      isSubmitting={isLoading}
      submitLabel="Register Course Instructor"
    >
      {currentStep === 1 && (
        <DialogFormGrid cols={2}>
          <DialogFormField
            id="name"
            label="Full Name"
            required
            error={errors.name}
          >
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              className={cn(errors.name && errorClass)}
              placeholder="Enter full name"
            />
          </DialogFormField>

          <DialogFormField
            id="instructorId"
            label="Instructor ID"
            hint="Instructor ID will be automatically generated"
          >
            <Input
              id="instructorId"
              type="text"
              value="Auto-generated upon submission"
              disabled
              className="bg-muted"
            />
          </DialogFormField>

          <DialogFormField
            id="dob"
            label={
              <span>
                Date of Birth
                {formData.dob && (
                  <span className="ml-2 text-muted-foreground font-normal">
                    ({calculateAge(formData.dob)} yrs old)
                  </span>
                )}
              </span>
            }
            required
            error={errors.dob}
          >
            <Input
              id="dob"
              type="date"
              value={formData.dob}
              onChange={(e) => handleInputChange("dob", e.target.value)}
              className={cn(errors.dob && errorClass)}
            />
          </DialogFormField>

          <DialogFormField
            id="bloodGroup"
            label="Blood Group"
            required
            error={errors.bloodGroup}
          >
            <Select
              value={formData.bloodGroup}
              onValueChange={(value) => handleInputChange("bloodGroup", value)}
            >
              <SelectTrigger
                id="bloodGroup"
                className={cn(errors.bloodGroup && errorClass)}
              >
                <SelectValue placeholder="Select blood group" />
              </SelectTrigger>
              <SelectContent>
                {BLOOD_GROUPS.map((bg) => (
                  <SelectItem key={bg} value={bg}>
                    {bg}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </DialogFormField>

          <StateCitySelect
            id="city"
            value={formData.city}
            onChange={(val) => handleInputChange("city", val)}
            label="City"
            required
            error={errors.city}
          />

          <DialogFormField
            id="programId"
            label="Program"
            required
            error={errors.programId}
          >
            <Select
              value={
                formData.programId && formData.programId !== 0
                  ? formData.programId.toString()
                  : undefined
              }
              onValueChange={(value) => handleInputChange("programId", value)}
              onOpenChange={handleProgramSelectOpen}
            >
              <SelectTrigger
                id="programId"
                className={cn(errors.programId && errorClass)}
              >
                <SelectValue placeholder="Select program" />
              </SelectTrigger>
              <SelectContent>
                {loadingPrograms ? (
                  <SelectItem value="loading" disabled>
                    Loading programs...
                  </SelectItem>
                ) : programs.length === 0 ? (
                  <SelectItem value="no-programs" disabled>
                    Click to load programs
                  </SelectItem>
                ) : (
                  programs.map((program) => (
                    <SelectItem key={program.id} value={program.id.toString()}>
                      {program.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </DialogFormField>
        </DialogFormGrid>
      )}

      {currentStep === 2 && (
        <div className="space-y-4">
          <DialogFormField
            id="address"
            label="Address"
            required
            error={errors.address}
          >
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange("address", e.target.value)}
              className={cn(errors.address && errorClass)}
              placeholder="Enter complete address"
              rows={3}
            />
          </DialogFormField>

          <DialogFormGrid cols={2}>
            <DialogFormField
              id="phone"
              label="Phone Number"
              required
              error={errors.phone}
            >
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                className={cn(errors.phone && errorClass)}
                placeholder="Enter 10-digit phone number"
              />
            </DialogFormField>

            <DialogFormField
              id="mail"
              label="Email Address"
              required
              error={errors.mail}
            >
              <Input
                id="mail"
                type="email"
                value={formData.mail}
                onChange={(e) => handleInputChange("mail", e.target.value)}
                className={cn(errors.mail && errorClass)}
                placeholder="Enter email address"
              />
            </DialogFormField>
          </DialogFormGrid>
        </div>
      )}

      {currentStep === 3 && (
        <div className="space-y-4">
          <DialogFormGrid cols={2}>
            <DialogFormField
              id="education"
              label="Education"
              required
              error={errors.education}
            >
              <Input
                id="education"
                type="text"
                value={formData.education}
                onChange={(e) =>
                  handleInputChange("education", e.target.value)
                }
                className={cn(errors.education && errorClass)}
                placeholder="e.g., B.Tech, MBA, etc."
              />
            </DialogFormField>

            <DialogFormField
              id="occupation"
              label="Occupation"
              required
              error={errors.occupation}
            >
              <Input
                id="occupation"
                type="text"
                value={formData.occupation}
                onChange={(e) =>
                  handleInputChange("occupation", e.target.value)
                }
                className={cn(errors.occupation && errorClass)}
                placeholder="e.g., Software Engineer, Teacher, etc."
              />
            </DialogFormField>
          </DialogFormGrid>

          <DialogFormField
            id="reference"
            label="Reference"
            required
            error={errors.reference}
          >
            <Textarea
              id="reference"
              value={formData.reference}
              onChange={(e) => handleInputChange("reference", e.target.value)}
              className={cn(errors.reference && errorClass)}
              placeholder="Enter reference information"
              rows={3}
            />
          </DialogFormField>
        </div>
      )}

      {currentStep === 4 && (
        <div className="space-y-4">
          <DialogStateMessage
            tone="info"
            icon={AlertCircle}
            title="Training is mandatory for every new course instructor."
            description="After admin approval, the CI will receive validity dates through the agreement workflow and will then continue to agreement signing and training purchase."
          />

          <DialogFormField
            id="additionalDetails"
            label="Additional Details"
          >
            <Textarea
              id="additionalDetails"
              value={formData.additionalDetails}
              onChange={(e) =>
                handleInputChange("additionalDetails", e.target.value)
              }
              placeholder="Optional notes for admin review"
              rows={4}
            />
          </DialogFormField>
        </div>
      )}
    </MultiStepDialog>
  );
}
