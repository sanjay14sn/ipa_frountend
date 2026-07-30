"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DialogFormField, FormDialog } from "@/components/shared/dialog";
import { StateCitySelect } from "@/components/StateCitySelect";
import { useUpdateFranchiseAdmin } from "@/hooks/api/franchisee.hooks";
import { useUpdateAgreementDetailsAdmin } from "@/hooks/api/agreement.hooks";
import type { AgreementRecord } from "@/services/agreement.service";
import {
  EditAgreementTermsSection,
  agreementTermsFormFromRecord,
  buildAgreementDetailsPatch,
  editableAgreementsFrom,
  type AgreementTermsFormState,
} from "./edit-agreement-terms-section";

// Backend FranchiseType — the FE enum in services/franchise.enums.ts predates
// "Regular", so mirror the filter options in FranchiseTable instead.
const FRANCHISE_TYPES = ["Area", "Master", "School", "Regular"] as const;

/** Structural subset of FranchiseData / detail.franchise — both satisfy it. */
export interface EditableFranchiseDetails {
  id: string;
  name: string;
  type?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
}

interface EditFranchiseDialogProps {
  franchise: EditableFranchiseDetails | null;
  /**
   * The franchise's agreements (list rows and the detail payload both carry
   * them). Feeds the "Agreement terms" section — terms stay editable only
   * while an agreement is unsigned.
   */
  agreements?: AgreementRecord[] | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FranchiseFormState {
  name: string;
  type: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

const emptyForm: FranchiseFormState = {
  name: "",
  type: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
};

export function EditFranchiseDialog({
  franchise,
  agreements,
  open,
  onOpenChange,
}: EditFranchiseDialogProps) {
  const [form, setForm] = useState<FranchiseFormState>(emptyForm);
  const [selectedAgreementId, setSelectedAgreementId] = useState<number | null>(
    null,
  );
  const [agreementForm, setAgreementForm] =
    useState<AgreementTermsFormState | null>(null);
  const [agreementInitial, setAgreementInitial] =
    useState<AgreementTermsFormState | null>(null);
  const updateFranchise = useUpdateFranchiseAdmin();
  const updateAgreement = useUpdateAgreementDetailsAdmin();

  useEffect(() => {
    if (!franchise) {
      setForm(emptyForm);
      setSelectedAgreementId(null);
      setAgreementForm(null);
      setAgreementInitial(null);
      return;
    }
    setForm({
      name: franchise.name ?? "",
      type: franchise.type ?? "",
      address: franchise.address ?? "",
      city: franchise.city ?? "",
      state: franchise.state ?? "",
      pincode: franchise.pincode ?? "",
    });
    const editable = editableAgreementsFrom(agreements);
    const first = editable[0] ?? null;
    setSelectedAgreementId(first?.id ?? null);
    const seeded = first ? agreementTermsFormFromRecord(first) : null;
    setAgreementForm(seeded);
    setAgreementInitial(seeded);
  }, [franchise, agreements]);

  const selectAgreement = (agreementId: number) => {
    const target = editableAgreementsFrom(agreements).find(
      (agreement) => agreement.id === agreementId,
    );
    if (!target) return;
    setSelectedAgreementId(agreementId);
    const seeded = agreementTermsFormFromRecord(target);
    setAgreementForm(seeded);
    setAgreementInitial(seeded);
  };

  const submit = async () => {
    if (!franchise) return;
    const name = form.name.trim();
    const city = form.city.trim();
    const state = form.state.trim();
    if (!name || !city || !state) {
      toast.error("Name, state, and city are required");
      return;
    }

    const agreementPatch =
      agreementForm && agreementInitial && selectedAgreementId !== null
        ? buildAgreementDetailsPatch(agreementInitial, agreementForm)
        : null;
    const agreementDirty =
      agreementPatch !== null && Object.keys(agreementPatch).length > 0;

    if (agreementDirty && agreementForm) {
      if (agreementForm.tenure < 1) {
        toast.error("Agreement tenure must be at least 1 month");
        return;
      }
      if (agreementForm.installment && agreementForm.installmentMonths < 1) {
        toast.error(
          "Enter a positive Installment Months value for the installment plan",
        );
        return;
      }
    }

    try {
      await updateFranchise.mutateAsync({
        franchiseId: franchise.id,
        payload: {
          name,
          type: form.type || undefined,
          address: form.address.trim(),
          city,
          state,
          pincode: form.pincode.trim(),
        },
      });
      if (agreementDirty && agreementPatch && selectedAgreementId !== null) {
        await updateAgreement.mutateAsync({
          agreementId: selectedAgreementId,
          payload: agreementPatch,
        });
      }
      toast.success(
        agreementDirty ? "Franchise and agreement updated" : "Franchise updated",
      );
      onOpenChange(false);
    } catch {
      // The mutation hooks already surface the error toast.
    }
  };

  const isSubmitting = updateFranchise.isPending || updateAgreement.isPending;

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title="Edit franchise"
      description="Update the franchise's descriptive details. The franchise code is issued once and never changes."
      formId="edit-franchise-form"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      isSubmitting={isSubmitting}
      submitLabel={isSubmitting ? "Saving..." : "Save changes"}
      cancelLabel="Cancel"
    >
      <div className="space-y-4">
        <DialogFormField id="edit-franchise-name" label="Franchise name *">
          <Input
            id="edit-franchise-name"
            value={form.name}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, name: event.target.value }))
            }
          />
        </DialogFormField>

        <DialogFormField id="edit-franchise-type" label="Type">
          <Select
            value={form.type}
            onValueChange={(value) =>
              setForm((prev) => ({ ...prev, type: value }))
            }
          >
            <SelectTrigger id="edit-franchise-type">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {FRANCHISE_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </DialogFormField>

        <DialogFormField id="edit-franchise-address" label="Address">
          <Input
            id="edit-franchise-address"
            value={form.address}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, address: event.target.value }))
            }
          />
        </DialogFormField>

        <StateCitySelect
          id="edit-franchise-city"
          value={form.city}
          stateValue={form.state}
          onChange={(city) => setForm((prev) => ({ ...prev, city }))}
          onStateChange={(state) => setForm((prev) => ({ ...prev, state }))}
          label="City"
          required
        />

        <DialogFormField id="edit-franchise-pincode" label="Pincode">
          <Input
            id="edit-franchise-pincode"
            inputMode="numeric"
            maxLength={6}
            value={form.pincode}
            onChange={(event) => {
              const digitsOnly = event.target.value
                .replace(/\D/g, "")
                .slice(0, 6);
              setForm((prev) => ({ ...prev, pincode: digitsOnly }));
            }}
            placeholder="6-digit pincode"
          />
        </DialogFormField>

        <EditAgreementTermsSection
          agreements={agreements}
          selectedId={selectedAgreementId}
          onSelect={selectAgreement}
          value={agreementForm}
          onChange={(patch) =>
            setAgreementForm((prev) => (prev ? { ...prev, ...patch } : prev))
          }
        />
      </div>
    </FormDialog>
  );
}
