"use client";

import { useState, useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
} from "@/services/franchise.service";
import { getAllPrograms, Program } from "@/services/program.service";
import { StateCitySelect } from "@/components/StateCitySelect";
import { cn } from "@/lib/utils";
import { handleFormApiError } from "@/lib/form-errors";
import { useUniquenessCheck } from "@/hooks/api/uniqueness.hooks";
import { checkFranchiseNameAvailability } from "@/services/uniqueness.service";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/api/query-keys";
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

const schema = z.object({
  name: z.string().trim().min(1, "Franchise name is required"),
  type: z.string().min(1),
  address: z.string().trim().min(1, "Address is required"),
  city: z.string().trim().min(1, "City is required"),
  state: z.string(),
  pincode: z.string().optional(),
  programId: z.number().min(1, "Select a program"),
});
type FormValues = z.infer<typeof schema>;

const EMPTY_FORM: FormValues = {
  name: "",
  type: "School",
  address: "",
  city: "",
  state: "",
  pincode: "",
  programId: 0,
};

interface RequestFranchiseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RequestFranchiseModal({
  open,
  onOpenChange,
}: RequestFranchiseModalProps) {
  const queryClient = useQueryClient();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_FORM,
  });
  const name = useWatch({ control: form.control, name: "name" });
  const programId = useWatch({ control: form.control, name: "programId" });
  // Watched, not getValues(): StateCitySelect renders the state dropdown from
  // this, so it has to re-render when the state changes.
  const stateValue = useWatch({ control: form.control, name: "state" });

  /**
   * Bridge for handleFormApiError, which speaks the useState error-map shape.
   * `prev` is only ever spread, so an empty map is a faithful stand-in.
   */
  const setErrors = (
    updater: (prev: Record<string, string>) => Record<string, string>,
  ) => {
    for (const [field, message] of Object.entries(updater({}))) {
      if (message) {
        form.setError(field as keyof FormValues, { type: "server", message });
      }
    }
  };

  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
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
    value: name,
    fetcher: (value, opts) => checkFranchiseNameAvailability(value, opts),
    takenMessage:
      "A franchise with this name already exists. Please choose a different name.",
  });

  // Merged view for rendering: resolver/server errors + live "taken" result.
  const nameError =
    form.formState.errors.name?.message ?? franchiseNameUniq.error ?? undefined;

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

  const handleProgramSelect = (id: number) => {
    form.setValue("programId", id, { shouldValidate: true });
  };

  const submitValid = form.handleSubmit(async (values) => {
    if (franchiseNameUniq.isTaken) {
      toast.error(franchiseNameUniq.error!);
      return;
    }
    setIsLoading(true);
    try {
      await requestNewFranchise({
        name: values.name,
        type: values.type,
        city: values.city,
        state: values.state,
        address: values.address,
        pincode: values.pincode,
        programId: values.programId,
      });
      toast.success("Franchise request submitted successfully");
      setSubmitted(true);
      // The switcher list rides the profile query now — refetch it so the new
      // Pending franchise appears without a re-login. (The old hand-append
      // into user.franchises silently did nothing when the in-memory list was
      // missing, e.g. after a page reload.)
      void queryClient.invalidateQueries({
        queryKey: queryKeys.auth.franchiseeProfile(),
      });
    } catch (error) {
      handleFormApiError(error, {
        setErrors,
        fieldMap: { franchiseName: "name" },
        fallback: "Failed to submit franchise request",
      });
    } finally {
      setIsLoading(false);
    }
  });

  /**
   * The programs list can fail to load, in which case programId is
   * unavoidably unset and "Select a program" would be misleading.
   * That case is checked before the resolver runs, exactly as before.
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loadError && !programId) {
      toast.error("Couldn't load programs — retry above");
      return;
    }
    void submitValid(e);
  };

  const handleClose = () => {
    if (submitted) {
      form.reset(EMPTY_FORM);
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
        error={nameError}
      >
        <Input
          id="franchiseName"
          {...form.register("name")}
          placeholder="Enter franchise center name"
          className={cn("rounded-lg", nameError && errorClass)}
          required
        />
      </DialogFormField>

      <DialogFormField id="franchiseType" label="Franchise Type" required>
        <Controller
          control={form.control}
          name="type"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="franchiseType" className="rounded-lg">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Area">Area Franchise</SelectItem>
                <SelectItem value="Master">Master Franchise</SelectItem>
                <SelectItem value="School">School Franchise</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </DialogFormField>

      <DialogFormGrid cols={3}>
        <Controller
          control={form.control}
          name="city"
          render={({ field }) => (
            <StateCitySelect
              mode="flat"
              id="city"
              value={field.value}
              stateValue={stateValue}
              onChange={field.onChange}
              onStateChange={(val) =>
                form.setValue("state", val, { shouldValidate: true })
              }
              label="City"
              required
            />
          )}
        />
        <DialogFormField id="pincode" label="Pincode">
          <Input
            id="pincode"
            {...form.register("pincode")}
            className="rounded-lg"
          />
        </DialogFormField>
      </DialogFormGrid>

      <DialogFormField
        label="Program"
        required
        error={form.formState.errors.programId?.message}
      >
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
            <RadioGroup
              value={programId ? String(programId) : ""}
              onValueChange={(value) => handleProgramSelect(Number(value))}
              className="space-y-2"
            >
              {programs.map((p) => (
                <div key={p.id} className="flex items-center space-x-2">
                  <RadioGroupItem id={`p-${p.id}`} value={String(p.id)} />
                  <label
                    htmlFor={`p-${p.id}`}
                    className="cursor-pointer text-sm text-card-foreground"
                  >
                    {p.name}
                  </label>
                </div>
              ))}
            </RadioGroup>
          )}
        </div>
        )}
      </DialogFormField>

      <DialogFormField
        id="address"
        label="Centre Address"
        required
        error={form.formState.errors.address?.message}
      >
        <Textarea
          id="address"
          {...form.register("address")}
          rows={3}
          className="rounded-lg"
          placeholder="Full address of the proposed centre"
          required
        />
      </DialogFormField>
    </FormDialog>
  );
}
