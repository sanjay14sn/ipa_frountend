"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { requestNewFranchise, hasPendingRequest, RequestFranchiseDto } from "@/services/franchise.service";
import { getAllPrograms, Program } from "@/services/program.service";
import { StateCitySelect } from "@/components/StateCitySelect";
import { getErrorMessage } from "@/lib/error-utils";
import { toast } from "sonner";
import { useUser } from "@/context/user-context";

interface RequestFranchiseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RequestFranchiseModal({
  open,
  onOpenChange,
}: RequestFranchiseModalProps) {
  const { user, setUser } = useUser();
  const [formData, setFormData] = useState<RequestFranchiseDto>({
    name: "",
    type: "School",
    address: "",
    city: "",
    state: "",
    pincode: "",
    programIds: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoadingPrograms, setIsLoadingPrograms] = useState(false);
  const [pendingCheck, setPendingCheck] = useState<"loading" | "pending" | "ok">("loading");

  useEffect(() => {
    if (!open) return;
    setIsLoadingPrograms(true);
    setPendingCheck("loading");
    Promise.all([getAllPrograms(), hasPendingRequest()])
      .then(([programData, pending]) => {
        setPrograms(Array.isArray(programData) ? programData : []);
        setPendingCheck(pending.hasPending ? "pending" : "ok");
      })
      .catch(() => {
        setPrograms([]);
        setPendingCheck("ok");
      })
      .finally(() => setIsLoadingPrograms(false));
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
    if (!formData.name?.trim()) {
      toast.error("Franchise name is required");
      return;
    }
    if (!formData.address?.trim()) {
      toast.error("Address is required");
      return;
    }
    if (!formData.city?.trim()) {
      toast.error("City is required");
      return;
    }
    if (formData.programIds.length === 0) {
      toast.error("Select at least one program");
      return;
    }
    setIsLoading(true);
    try {
      const res = await requestNewFranchise(formData);
      const franchise = res?.franchise ?? res?.result?.franchise ?? res;
      toast.success("Franchise request submitted successfully");
      setSubmitted(true);
      if (user?.franchises && franchise) {
        setUser({
          ...user,
          franchises: [
            ...user.franchises,
            { id: franchise.id, name: franchise.name, status: "Pending" },
          ],
        });
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to submit franchise request"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (submitted) {
      setFormData({
        name: "",
        type: "School",
        address: "",
        city: "",
        state: "",
        pincode: "",
        programIds: [],
      });
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
              Your new franchise request has been submitted. Our admin team will
              review it and notify you once approved.
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
          <DialogTitle>Request New Franchise</DialogTitle>
          <DialogDescription>
            Submit a request for an additional franchise. Admin will review and
            approve.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="franchiseName">Franchise Name *</Label>
            <Input
              id="franchiseName"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Enter franchise center name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="franchiseType">Franchise Type *</Label>
            <Select
              value={formData.type}
              onValueChange={(v) =>
                setFormData((prev) => ({ ...prev, type: v }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Area">Area Franchise</SelectItem>
                <SelectItem value="Master">Master Franchise</SelectItem>
                <SelectItem value="School">School Franchise</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address *</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, address: e.target.value }))
              }
              rows={2}
              required
            />
          </div>
          <div className="flex gap-2">
            <StateCitySelect
              id="city"
              className="flex-1"
              value={formData.city}
              stateValue={formData.state}
              onChange={(val) =>
                setFormData((prev) => ({ ...prev, city: val }))
              }
              onStateChange={(val) =>
                setFormData((prev) => ({ ...prev, state: val }))
              }
              label="City"
              required
            />
            <div className="space-y-2 w-32">
              <Label htmlFor="pincode">Pincode</Label>
              <Input
                id="pincode"
                value={formData.pincode ?? ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, pincode: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Programs * (Select at least one)</Label>
            <div className="border rounded-md p-3 space-y-2 max-h-32 overflow-y-auto">
              {isLoadingPrograms ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : programs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No programs</p>
              ) : (
                programs.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center space-x-2"
                  >
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
