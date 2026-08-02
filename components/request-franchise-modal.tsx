"use client";

import { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Clock } from "lucide-react";
import {
  requestNewFranchise,
  hasPendingRequest,
  RequestFranchiseDto,
} from "@/services/franchise.service";
import { getAllPrograms, Program } from "@/services/program.service";
import { StateCitySelect } from "@/components/StateCitySelect";
import { cn } from "@/lib/utils";
import { handleFormApiError } from "@/lib/form-errors";
import { useUniquenessCheck } from "@/hooks/api/uniqueness.hooks";
import { checkFranchiseNameAvailability } from "@/services/uniqueness.service";
import { toast } from "sonner";
import { useUser } from "@/context/user-context";
import {
  AppDialog,
  DialogFormField,
  DialogFormGrid,
  FormDialog,
  SuccessDialog,
  AppDialogHeader,
  AppDialogFooter,
  AppDialogBody,
} from "@/components/shared/dialog";

const errorClass = "border-destructive focus-visible:ring-destructive";

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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoadingPrograms, setIsLoadingPrograms] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [pendingCheck, setPendingCheck] = useState<
    "loading" | "pending" | "ok"
  >("loading");

  // Eager uniqueness check — advisory red highlight while typing; the
  // submit path re-checks and reports a field-level 409 on races.
  const franchiseNameUniq = useUniquenessCheck({
    keyParts: ["franchise", "name"],
    value: formData.name,
    fetcher: (value, opts) => checkFranchiseNameAvailability(value, opts),
    takenMessage:
      "A franchise with this name already exists. Please choose a different name.",
  });

  // Merged view for rendering: base errors + live "taken" result.
  const displayErrors: Record<string, string> = { ...errors };
  if (franchiseNameUniq.error && !errors.name) {
    displayErrors.name = franchiseNameUniq.error;
  }

  const loadModalData = () => {
    setIsLoadingPrograms(true);
    setLoadError(false);
    setPendingCheck("loading");
    Promise.all([getAllPrograms(), hasPendingRequest()])
      .then(([programData, pending]) => {
        setPrograms(Array.isArray(programData) ? programData : []);
        setPendingCheck(pending ? "pending" : "ok");
      })
      .catch(() => {
        setPrograms([]);
        setLoadError(true);
        setPendingCheck("ok");
      })
      .finally(() => setIsLoadingPrograms(false));
  };

  useEffect(() => {
    if (!open) return;
    loadModalData();
  }, [open]);

  const handleProgramToggle = (programId: number) => {
    setFormData((prev) => {
      const ids = prev.programIds ?? [];
      return {
        ...prev,
        programIds: ids.includes(programId)
          ? ids.filter((id) => id !== programId)
          : [...ids, programId],
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      toast.error("Franchise name is required");
      return;
    }
    if (franchiseNameUniq.isTaken) {
      toast.error(franchiseNameUniq.error!);
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
    const programIds = formData.programIds ?? [];
    if (programIds.length === 0) {
      toast.error(
        loadError
          ? "Couldn't load programs — retry above"
          : "Select at least one program",
      );
      return;
    }
    setIsLoading(true);
    try {
      const res = await requestNewFranchise({
        ...formData,
        programIds,
        programId: programIds[0],
      });
      const payload = res as unknown as {
        franchise?: { id: string | number; name: string };
        result?: { franchise?: { id: string | number; name: string } };
      };
      const franchise =
        payload.franchise ??
        payload.result?.franchise ??
        (typeof res === "object" &&
        res !== null &&
        "id" in res &&
        "name" in res
          ? (res as { id: string | number; name: string })
          : undefined);
      toast.success("Franchise request submitted successfully");
      setSubmitted(true);
      if (user?.franchises && franchise) {
        setUser({
          ...user,
          franchises: [
            ...user.franchises,
            {
              id: String(franchise.id),
              name: franchise.name,
              status: "Pending",
            },
          ],
        });
      }
    } catch (error) {
      handleFormApiError(error, {
        setErrors,
        fieldMap: { franchiseName: "name" },
        fallback: "Failed to submit franchise request",
      });
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
      setErrors({});
      setSubmitted(false);
    }
    onOpenChange(false);
  };

  if (submitted) {
    return (
      <SuccessDialog
        open={open}
        onOpenChange={handleClose}
        title="Request Submitted!"
        description="Your new franchise request has been submitted. Our admin team will review it and notify you once approved."
        actionLabel="Close"
        onAction={handleClose}
      />
    );
  }

  if (pendingCheck === "loading") {
    return (
      <AppDialog open={open} onOpenChange={handleClose} size="sm">
        <div className="flex items-center justify-center py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </AppDialog>
    );
  }

  if (pendingCheck === "pending") {
    return (
      <AppDialog
        open={open}
        onOpenChange={handleClose}
        size="sm"
        padding="flush"
        scrollBody
      >
        <AppDialogHeader
          title="Request Already Pending"
          description="You cannot submit a new request while any franchise is not Active, a program request is awaiting admin review, or a program agreement and payment is still pending. Resolve those first."
          icon={Clock}
          sticky
        />
        <AppDialogBody />
        <AppDialogFooter
          sticky
          padded
          primary={{ label: "Close", onClick: handleClose, variant: "outline" }}
        />
      </AppDialog>
    );
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={handleClose}
      size="md"
      title="Request New Franchise"
      description="Submit a request for an additional franchise. Admin will review and approve."
      headerIcon={Building2}
      onSubmit={handleSubmit}
      isSubmitting={isLoading}
      submitLabel="Submit Request"
    >
      <DialogFormField
        id="franchiseName"
        label="Franchise Name"
        required
        error={displayErrors.name}
      >
        <Input
          id="franchiseName"
          value={formData.name}
          onChange={(e) => {
            setFormData((prev) => ({ ...prev, name: e.target.value }));
            if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
          }}
          placeholder="Enter franchise center name"
          className={cn("rounded-lg", displayErrors.name && errorClass)}
          required
        />
      </DialogFormField>

      <DialogFormField id="franchiseType" label="Franchise Type" required>
        <Select
          value={formData.type}
          onValueChange={(v) => setFormData((prev) => ({ ...prev, type: v }))}
        >
          <SelectTrigger id="franchiseType" className="rounded-lg">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Area">Area Franchise</SelectItem>
            <SelectItem value="Master">Master Franchise</SelectItem>
            <SelectItem value="School">School Franchise</SelectItem>
          </SelectContent>
        </Select>
      </DialogFormField>

      <DialogFormGrid cols={3}>
        <StateCitySelect
          mode="flat"
          id="city"
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
        <DialogFormField id="pincode" label="Pincode">
          <Input
            id="pincode"
            value={formData.pincode ?? ""}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, pincode: e.target.value }))
            }
            className="rounded-lg"
          />
        </DialogFormField>
      </DialogFormGrid>

      <DialogFormField label="Programs (Select at least one)" required>
        {loadError && !isLoadingPrograms ? (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between gap-3">
              <span>Couldn&apos;t load programs.</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={loadModalData}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
        <div className="max-h-32 space-y-2 overflow-y-auto rounded-xl border border-border p-3">
          {isLoadingPrograms ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : programs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No programs</p>
          ) : (
            programs.map((p) => (
              <div key={p.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`p-${p.id}`}
                  checked={(formData.programIds ?? []).includes(p.id)}
                  onCheckedChange={() => handleProgramToggle(p.id)}
                />
                <label
                  htmlFor={`p-${p.id}`}
                  className="cursor-pointer text-sm text-card-foreground"
                >
                  {p.name}
                </label>
              </div>
            ))
          )}
        </div>
        )}
      </DialogFormField>

      <DialogFormField id="address" label="Centre Address" required>
        <Textarea
          id="address"
          value={formData.address}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, address: e.target.value }))
          }
          rows={3}
          className="rounded-lg"
          placeholder="Full address of the proposed centre"
          required
        />
      </DialogFormField>
    </FormDialog>
  );
}
