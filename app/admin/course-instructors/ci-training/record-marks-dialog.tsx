"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  CITrainingAssignment,
  completeAssignment,
} from "@/services/ci-training-admin.service";
import { getApiErrorMessage } from "@/app/admin/course-instructors/ci-training/status-badge";

export function RecordMarksDialog({
  assignment,
  onClose,
  onSuccess,
}: {
  assignment: CITrainingAssignment | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [theoryMarks, setTheoryMarks] = useState("");
  const [practicalMarks, setPracticalMarks] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignment) return;
    setLoading(true);
    try {
      await completeAssignment(assignment.id, {
        theoryMarks: Number(theoryMarks),
        practicalMarks:
          practicalMarks.trim() === "" ? undefined : Number(practicalMarks),
      });
      toast.success("Marks recorded");
      onSuccess();
      onClose();
      setTheoryMarks("");
      setPracticalMarks("");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to record marks."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={!!assignment}
      onOpenChange={(o) => {
        if (!o && !loading) onClose();
      }}
    >
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle>Record Marks</DialogTitle>
          <DialogDescription>
            {assignment?.instructorName ?? `Assignment #${assignment?.id}`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="theoryMarks">Theory Marks</Label>
            <Input
              id="theoryMarks"
              type="number"
              min="0"
              value={theoryMarks}
              onChange={(e) => setTheoryMarks(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="practicalMarks">Practical Marks</Label>
            <Input
              id="practicalMarks"
              type="number"
              min="0"
              value={practicalMarks}
              onChange={(e) => setPracticalMarks(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Marks"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
