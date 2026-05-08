"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle, Clock } from "lucide-react";
import {
  requestProgram,
  hasPendingRequest,
  RequestProgramDto,
} from "@/services/franchise.service";
import { getAllPrograms, Program } from "@/services/program.service";
import { getErrorMessage } from "@/lib/error-utils";
import { toast } from "sonner";
import { useUser } from "@/context/user-context";

interface RequestProgramsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RequestProgramsModal({
  open,
  onOpenChange,
}: RequestProgramsModalProps) {
  const { user } = useUser();
  const [formData, setFormData] = useState<RequestProgramDto>({
    franchiseId: "",
    programIds: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [pendingCheck, setPendingCheck] = useState<
    "loading" | "pending" | "ok"
  >("loading");

  const activeFranchises =
    user?.franchises?.filter((f) => f.status === "Active") ?? [];

  useEffect(() => {
    if (!open) return;

    setPendingCheck("loading");
    Promise.all([getAllPrograms(), hasPendingRequest()])
      .then(([programData, isPending]) => {
        setPrograms(Array.isArray(programData) ? programData : []);
        setPendingCheck(isPending ? "pending" : "ok");
      })
      .catch(() => {
        setPrograms([]);
        setPendingCheck("ok");
      });
  }, [open]);

  const handleProgramToggle = (programId: number) => {
    setFormData((prev) => ({
      ...prev,
      programIds: prev.programIds.includes(programId)
        ? prev.programIds.filter((id) => id !== programId)
        : [...prev.programIds, programId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.franchiseId) {
      toast.error("Select a franchise");
      return;
    }
    if (formData.programIds.length === 0) {
      toast.error("Select at least one program");
      return;
    }
    setIsLoading(true);
    try {
      await requestProgram(formData);
      toast.success("Program request(s) submitted successfully");
      setSubmitted(true);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to submit program request"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (submitted) {
      setFormData({ franchiseId: "", programIds: [] });
      setSubmitted(false);
    }
    onOpenChange(false);
  };

  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="mx-4 w-full max-w-md rounded-2xl border-border">
          <DialogHeader className="text-center">
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-surface-green p-3">
                <CheckCircle className="h-10 w-10 text-primary" />
              </div>
            </div>
            <DialogTitle className="text-2xl font-semibold text-card-foreground">
              Request Submitted!
            </DialogTitle>
            <DialogDescription className="text-center text-muted-foreground">
              Your program request(s) have been submitted. Admin will review and
              approve each program individually.
            </DialogDescription>
          </DialogHeader>
          <Button onClick={handleClose} className="w-full rounded-lg">
            Close
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  if (pendingCheck === "loading") {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="mx-4 w-full max-w-md rounded-2xl border-border">
          <div className="flex items-center justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (pendingCheck === "pending") {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="mx-4 w-full max-w-md rounded-2xl border-border">
          <DialogHeader className="text-center">
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-amber-50 p-3">
                <Clock className="h-10 w-10 text-amber-600" />
              </div>
            </div>
            <DialogTitle className="text-xl font-semibold text-card-foreground">
              Request Already Pending
            </DialogTitle>
            <DialogDescription className="text-center text-muted-foreground">
              You cannot submit a new request while any franchise is not Active,
              a program request is awaiting admin review, or a program agreement
              and payment is still pending. Resolve those first.
            </DialogDescription>
          </DialogHeader>
          <Button
            onClick={handleClose}
            variant="outline"
            className="w-full rounded-lg border-border"
          >
            Close
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg overflow-hidden rounded-2xl border-border p-0">
        <DialogHeader className="border-b border-border bg-surface-green/40 px-6 pb-4 pt-6">
          <DialogTitle className="text-lg font-semibold text-card-foreground">
            Request Programs
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Request new programs for an existing franchise. Admin will review
            and approve each program separately.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div className="space-y-2">
            <Label htmlFor="franchise">Franchise *</Label>
            <Select
              value={formData.franchiseId}
              onValueChange={(v) =>
                setFormData((prev) => ({ ...prev, franchiseId: v }))
              }
            >
              <SelectTrigger className="rounded-lg border-border">
                <SelectValue placeholder="Select franchise" />
              </SelectTrigger>
              <SelectContent>
                {activeFranchises.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Programs * (Select at least one)</Label>
            <div className="max-h-32 space-y-2 overflow-y-auto rounded-xl border border-border p-3">
              {programs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No programs</p>
              ) : (
                programs.map((p) => (
                  <div key={p.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`p-${p.id}`}
                      checked={formData.programIds.includes(p.id)}
                      onCheckedChange={() => handleProgramToggle(p.id)}
                    />
                    <label
                      htmlFor={`p-${p.id}`}
                      className="text-sm cursor-pointer"
                    >
                      {p.name}
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-lg border-border"
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button type="submit" className="rounded-lg" disabled={isLoading}>
              {isLoading ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
