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
  const [pendingCheck, setPendingCheck] = useState<"loading" | "pending" | "ok">("loading");

  const activeFranchises =
    user?.franchises?.filter((f) => f.status === "Active") ?? [];

  useEffect(() => {
    if (!open) return;

    setPendingCheck("loading");
    Promise.all([
      getAllPrograms(),
      hasPendingRequest(),
    ])
      .then(([programData, isPending]) => {
        setPrograms(Array.isArray(programData) ? programData : []);
        setPendingCheck(isPending.hasPending ? "pending" : "ok");
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
        <DialogContent className="max-w-md w-full mx-4">
          <DialogHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <DialogTitle className="text-2xl font-bold text-gray-900">
              Request Submitted!
            </DialogTitle>
            <DialogDescription className="text-center">
              Your program request(s) have been submitted. Admin will review and
              approve each program individually.
            </DialogDescription>
          </DialogHeader>
          <Button onClick={handleClose} className="w-full">
            Close
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  if (pendingCheck === "loading") {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md w-full mx-4">
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin h-8 w-8 rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (pendingCheck === "pending") {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md w-full mx-4">
          <DialogHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Clock className="h-12 w-12 text-yellow-500" />
            </div>
            <DialogTitle className="text-xl font-bold text-gray-900">
              Request Already Pending
            </DialogTitle>
            <DialogDescription className="text-center">
              You cannot submit a new request while any franchise is not Active,
              a program request is awaiting admin review, or a program agreement
              and payment is still pending. Resolve those first.
            </DialogDescription>
          </DialogHeader>
          <Button onClick={handleClose} variant="outline" className="w-full">
            Close
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Request Programs</DialogTitle>
          <DialogDescription>
            Request new programs for an existing franchise. Admin will review and
            approve each program separately.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="franchise">Franchise *</Label>
            <Select
              value={formData.franchiseId}
              onValueChange={(v) =>
                setFormData((prev) => ({ ...prev, franchiseId: v }))
              }
            >
              <SelectTrigger>
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
            <div className="border rounded-md p-3 space-y-2 max-h-32 overflow-y-auto">
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
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
