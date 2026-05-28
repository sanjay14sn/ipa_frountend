"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [tenure, setTenure] = useState(12);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!instructor) return;

    if (!tenure || tenure < 1) {
      toast.error("Tenure must be at least 1 month.");
      return;
    }

    setLoading(true);
    try {
      await approveCourseInstructor(instructor.id, { tenure });
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
      <DialogContent className="w-[96vw] sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle>Approve Course Instructor</DialogTitle>
          <DialogDescription>
            Set the agreement tenure for <strong>{instructor?.name}</strong>. The expiry date will be derived from the signing date.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="tenure">Tenure (months)</Label>
            <Input
              id="tenure"
              type="number"
              min={1}
              step={1}
              value={tenure}
              onChange={(e) => setTenure(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
              required
            />
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
