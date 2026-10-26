"use client";
import { useState, useEffect } from "react";
import {
  Eye,
  EyeOff,
  KeyRound,
  Pencil,
  Copy,
  Check,
  Sparkles,
} from "lucide-react";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  DetailField,
  DetailFieldsGrid,
  ExpandedDetailSection,
  ExpandedDetailSurface,
} from "@/components/shared";
import { ProfilePhotoControl } from "@/components/shared/profile";
import type { StudentData } from "@/services/student.service";
import {
  useStudentPhotoMutations,
  updateStudentWithRevalidation,
  updateStudentAdminWithRevalidation,
} from "@/hooks/api/student.hooks";
import { uploadedFileSrc, validatePhotoFile } from "@/lib/uploads";
import { getStudentLevelName } from "./student-helpers";
import { formatDate, calculateAge } from "@/lib/date-utils";

interface StudentDetailsProps {
  student: StudentData;
  /** Picks the photo mutation audience routes; display is identical. */
  mode?: "franchise" | "admin";
}

function PasswordField({
  student,
  mode = "franchise",
}: {
  student: StudentData;
  mode?: "franchise" | "admin";
}) {
  const [currentPassword, setCurrentPassword] = useState(student.password);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [confirmInput, setConfirmInput] = useState("");
  const [showInputPassword, setShowInputPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setCurrentPassword(student.password);
  }, [student.password]);

  const handleOpenDialog = () => {
    setPasswordInput("");
    setConfirmInput("");
    setError(null);
    setShowInputPassword(false);
    setIsDialogOpen(true);
  };

  const handleGenerateRandom = () => {
    const generated = Math.random().toString(36).slice(-8);
    setPasswordInput(generated);
    setConfirmInput(generated);
    setShowInputPassword(true);
    setError(null);
  };

  const handleCopyPassword = async () => {
    if (!currentPassword) return;
    try {
      await navigator.clipboard.writeText(currentPassword);
      setCopied(true);
      toast.success("Password copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy password");
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = passwordInput.trim();
    if (!trimmed) {
      setError("Password is required");
      return;
    }
    if (trimmed.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (trimmed !== confirmInput.trim()) {
      setError("Passwords do not match");
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      if (mode === "admin") {
        await updateStudentAdminWithRevalidation(student.id, {
          password: trimmed,
        });
      } else {
        await updateStudentWithRevalidation(student.id, {
          password: trimmed,
        });
      }
      setCurrentPassword(trimmed);
      toast.success(
        currentPassword
          ? "Password updated successfully"
          : "Password set successfully"
      );
      setIsDialogOpen(false);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to update password";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-muted-foreground">
          Password
        </span>
        {!currentPassword ? (
          <div className="flex items-center gap-2.5">
            <span className="text-sm text-muted-foreground italic">
              Not set
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs px-2.5 gap-1.5 border-dashed hover:border-solid"
              onClick={handleOpenDialog}
            >
              <KeyRound className="h-3.5 w-3.5" />
              Set password
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-sm font-medium">
              {showPassword ? currentPassword : "••••••••"}
            </span>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-muted-foreground hover:text-foreground p-1 transition-colors rounded hover:bg-muted"
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
            <button
              type="button"
              onClick={handleCopyPassword}
              className="text-muted-foreground hover:text-foreground p-1 transition-colors rounded hover:bg-muted"
              title="Copy password"
            >
              {copied ? (
                <Check size={15} className="text-emerald-600" />
              ) : (
                <Copy size={15} />
              )}
            </button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground"
              onClick={handleOpenDialog}
            >
              <Pencil className="h-3 w-3" />
              Change
            </Button>
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              {currentPassword ? "Change App Password" : "Set App Password"}
            </DialogTitle>
            <DialogDescription>
              Set the mobile app login password for{" "}
              <span className="font-medium text-foreground">
                {student.name}
              </span>{" "}
              (<span className="font-mono">{student.rollNo}</span>).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePassword} className="space-y-4 pt-2">
            <div className="flex justify-between items-center">
              <label
                htmlFor="student-password-input"
                className="text-sm font-medium text-foreground"
              >
                Password <span className="text-destructive">*</span>
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1.5 text-primary hover:text-primary/90 hover:bg-primary/10"
                onClick={handleGenerateRandom}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Generate random
              </Button>
            </div>

            <div className="relative">
              <Input
                id="student-password-input"
                type={showInputPassword ? "text" : "password"}
                placeholder="Enter password (min 6 characters)"
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  if (error) setError(null);
                }}
                disabled={isSaving}
                autoFocus
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowInputPassword(!showInputPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                title={showInputPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showInputPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="student-confirm-password"
                className="text-sm font-medium text-foreground"
              >
                Confirm password <span className="text-destructive">*</span>
              </label>
              <Input
                id="student-confirm-password"
                type={showInputPassword ? "text" : "password"}
                placeholder="Re-enter password"
                value={confirmInput}
                onChange={(e) => {
                  setConfirmInput(e.target.value);
                  if (error) setError(null);
                }}
                disabled={isSaving}
              />
            </div>

            {error && (
              <p className="text-xs text-destructive font-medium">{error}</p>
            )}

            <p className="text-xs text-muted-foreground">
              The student or parent will use this password alongside their
              registered mobile number to log into the Abacus Learning App.
            </p>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving
                  ? "Saving..."
                  : currentPassword
                  ? "Update password"
                  : "Set password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function StudentDetails({
  student,
  mode = "franchise",
}: StudentDetailsProps) {
  const joinedDate = formatDate(student.dateOfJoining ?? student.createdAt);
  const primaryPhone =
    student.fatherContactNo || student.motherContactNo || "—";
  const status =
    student.status.charAt(0).toUpperCase() + student.status.slice(1);
  const stream =
    typeof student.stream === "string"
      ? student.stream
      : (student.stream as { name?: string })?.name ?? "—";

  const { upload, remove } = useStudentPhotoMutations(mode);

  const handleSelectFile = (file: File) => {
    const problem = validatePhotoFile(file);
    if (problem) {
      toast.error(problem);
      return;
    }
    upload.mutate({ studentId: student.id, file });
  };

  return (
    <ExpandedDetailSurface>
      <ExpandedDetailSection title="Photo">
        <ProfilePhotoControl
          name={student.name}
          src={uploadedFileSrc(student.photoPath)}
          onSelectFile={handleSelectFile}
          onRemove={() => remove.mutate({ studentId: student.id })}
          isBusy={upload.isPending || remove.isPending}
        />
      </ExpandedDetailSection>

      <Separator />

      <ExpandedDetailSection title="Student details">
        <DetailFieldsGrid columns={3}>
          <DetailField label="Roll number" value={student.rollNo || "—"} mono />
          <DetailField label="Joined" value={joinedDate} />
          <DetailField label="Status" value={status} />
          <DetailField label="Age" value={calculateAge(student.dateOfBirth)} />
          <DetailField label="Born" value={formatDate(student.dateOfBirth)} />
          <DetailField label="Gender" value={student.sex || "—"} />
          <DetailField label="ID status" value={student.idIssued || "—"} />
        </DetailFieldsGrid>
      </ExpandedDetailSection>

      <Separator />

      <ExpandedDetailSection title="Academic">
        <DetailFieldsGrid columns={3}>
          <DetailField label="Level" value={getStudentLevelName(student)} />
          <DetailField label="Standard" value={student.standard || "—"} />
          <DetailField label="Stream" value={stream} />
        </DetailFieldsGrid>
      </ExpandedDetailSection>

      <Separator />

      <ExpandedDetailSection title="Contact">
        <DetailFieldsGrid columns={3}>
          <DetailField label="Email" value={student.mail || "—"} />
          <DetailField label="Phone" value={primaryPhone} />
          <DetailField
            label="Residential address"
            value={student.residentialAddress || "—"}
            span={3}
          />
        </DetailFieldsGrid>
      </ExpandedDetailSection>

      <Separator />

      <ExpandedDetailSection title="Parents info">
        <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
          <DetailFieldsGrid columns={2}>
            <DetailField label="Father" value={student.fatherName || "—"} />
            <DetailField
              label="Contact"
              value={student.fatherContactNo || "—"}
            />
            <DetailField
              label="Occupation"
              value={student.fatherOccupation || "—"}
            />
            <DetailField
              label="Qualification"
              value={student.fatherQualification || "—"}
            />
          </DetailFieldsGrid>
          <DetailFieldsGrid columns={2}>
            <DetailField label="Mother" value={student.motherName || "—"} />
            <DetailField
              label="Contact"
              value={student.motherContactNo || "—"}
            />
            <DetailField
              label="Occupation"
              value={student.motherOccupation || "—"}
            />
            <DetailField
              label="Qualification"
              value={student.motherQualification || "—"}
            />
          </DetailFieldsGrid>
        </div>
      </ExpandedDetailSection>

      <Separator />

      <ExpandedDetailSection title="App Access">
        <DetailFieldsGrid columns={3}>
          <DetailField label="App Login ID" value={student.rollNo || "—"} mono />
          <PasswordField student={student} mode={mode} />
        </DetailFieldsGrid>
      </ExpandedDetailSection>
    </ExpandedDetailSurface>
  );
}
