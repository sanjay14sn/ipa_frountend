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
  reassignAssignment,
} from "@/services/ci-training-admin.service";

export function ReassignDialog({
  assignment,
  onClose,
  onSuccess,
}: {
  assignment: CITrainingAssignment | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [targetSessionId, setTargetSessionId] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignment) return;
    setLoading(true);
    try {
      await reassignAssignment(assignment.id, Number(targetSessionId));
      toast.success("Reassigned");
      onSuccess();
      onClose();
      setTargetSessionId("");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to reassign.");
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
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle>Reassign to Session</DialogTitle>
          <DialogDescription>{assignment?.instructorName}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="targetSession">Target Session ID</Label>
            <Input
              id="targetSession"
              type="number"
              min="1"
              value={targetSessionId}
              onChange={(e) => setTargetSessionId(e.target.value)}
              required
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
              {loading ? "Reassigning..." : "Reassign"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
