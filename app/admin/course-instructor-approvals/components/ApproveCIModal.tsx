"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import {
  approveCourseInstructor,
  AdminCourseInstructorData,
} from "@/services/course-instructor.service";
import { toast } from "sonner";
import { getUserFriendlyMessage } from "@/lib/error-utils";

interface ApproveCIModalProps {
  instructor: AdminCourseInstructorData | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ApproveCIModal({
  instructor,
  onClose,
  onSuccess,
}: ApproveCIModalProps) {
  const [loading, setLoading] = useState(false);

  const { today, oneYearLater } = useMemo(() => {
    const t = new Date();
    const from = t.toISOString().slice(0, 10);
    const until = new Date(t.getTime() + 365 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    return { today: from, oneYearLater: until };
  }, [instructor?.id]);

  const [validFrom, setValidFrom] = useState(today);
  const [validUntil, setValidUntil] = useState(oneYearLater);

  useEffect(() => {
    setValidFrom(today);
    setValidUntil(oneYearLater);
  }, [instructor?.id, oneYearLater, today]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!instructor) return;

    if (!validFrom || !validUntil) {
      toast.error("Both dates are required.");
      return;
    }
    if (validUntil <= validFrom) {
      toast.error("Valid until must be after valid from.");
      return;
    }

    setLoading(true);
    try {
      await approveCourseInstructor(instructor.id, { validFrom, validUntil });
      toast.success(`${instructor.name} has been approved.`);
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(getUserFriendlyMessage(error, "Failed to approve instructor. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={!!instructor}
      onOpenChange={(open) => {
        if (!open && !loading) onClose();
      }}
    >
      <DialogContent className="w-[96vw] sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Approve Course Instructor</DialogTitle>
          <DialogDescription>
            Set the validity period for <strong>{instructor?.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="validFrom">Valid From</Label>
              <DateInput
                id="validFrom"
                value={validFrom}
                onChange={(v) => setValidFrom(v)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="validUntil">Valid Until</Label>
              <DateInput
                id="validUntil"
                value={validUntil}
                onChange={(v) => setValidUntil(v)}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Approving..." : "Approve"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
