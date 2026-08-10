"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DialogFormField,
  DialogStateMessage,
} from "@/components/shared/dialog";
import { FormSection } from "@/components/shared/form-section";
import { StatusBadge, formatStatusLabel } from "@/components/shared";
import { getAgreementActionVisibility } from "@/components/agreements/record-detail/agreement-utils";
import {
  AgreementTermsFields,
  agreementTermsFieldsFromRecord,
  validateAgreementTermsFields,
  type AgreementTermsFieldsValue,
} from "@/components/agreements/agreement-terms-fields";
import type {
  AgreementRecord,
  UpdateAgreementDetailsInput,
} from "@/services/agreement.service";

/** Form state mirroring the editable fields of PATCH /admin/agreement/:id. */
export interface AgreementTermsFormState extends AgreementTermsFieldsValue {
  title: string;
  notes: string;
}

/** Agreements whose details are still editable (unsigned; CI kinds excluded). */
export function editableAgreementsFrom(
  agreements: AgreementRecord[] | null | undefined,
): AgreementRecord[] {
  return (agreements ?? []).filter(
    (agreement) => getAgreementActionVisibility(agreement, "admin").editTerms,
  );
}

export function agreementTermsFormFromRecord(
  agreement: AgreementRecord,
): AgreementTermsFormState {
  return {
    title: agreement.title ?? "",
    notes: agreement.notes ?? "",
    // Money/GST/installment seeding (incl. the D9 tenure rule) is shared with
    // the renewal dialog.
    ...agreementTermsFieldsFromRecord(agreement),
  };
}

/**
 * Sparse diff for the PATCH — only fields the admin actually changed are
 * sent, so an untouched fee doesn't churn the derived receivable plan.
 * A blanked title is treated as unchanged (titles can't be cleared).
 */
export function buildAgreementDetailsPatch(
  initial: AgreementTermsFormState,
  current: AgreementTermsFormState,
): UpdateAgreementDetailsInput {
  const patch: UpdateAgreementDetailsInput = {};
  const title = current.title.trim();
  if (title && title !== initial.title.trim()) patch.title = title;
  if (current.notes.trim() !== initial.notes.trim()) {
    patch.notes = current.notes.trim();
  }
  const numericKeys = [
    "tenure",
    "franchiseFee",
    "monthlyFee",
    "royalty",
    "materialCost",
    "kitCost",
    "ciShare",
    "franchiseShare",
  ] as const;
  for (const key of numericKeys) {
    if (current[key] !== initial[key]) patch[key] = current[key];
  }
  const booleanKeys = [
    "gstFranchiseFee",
    "gstRoyalty",
    "gstMaterialCost",
    "installment",
  ] as const;
  for (const key of booleanKeys) {
    if (current[key] !== initial[key]) patch[key] = current[key];
  }
  if (current.installment) {
    if (current.installmentMonths !== initial.installmentMonths) {
      patch.installmentMonths = current.installmentMonths;
    }
    if (current.downPayment !== initial.downPayment) {
      patch.downPayment = current.downPayment;
    }
    // Turning the plan on needs the shape fields even when they equal the
    // stale values of a previously disabled plan.
    if (patch.installment === true) {
      patch.installmentMonths = current.installmentMonths;
      patch.downPayment = current.downPayment;
    }
  }
  return patch;
}

/**
 * Pre-submit guards mirroring the backend's own invariants, so the admin gets a
 * specific message instead of a 400. That matters more than usual here: a
 * rejected agreement patch is the failure half of D2, and every rejection the
 * client can pre-empt is a partial save that never happens.
 *
 * Returns an error message, or null when the terms are submittable.
 */
export function validateAgreementTermsForm(
  form: AgreementTermsFormState,
  agreement: AgreementRecord | null,
): string | null {
  // The backend keeps an APPROVED agreement payable (InvalidAgreementTermsError).
  return validateAgreementTermsFields(form, {
    requirePositiveFee: agreement?.status === "APPROVED",
  });
}

export interface EditAgreementTermsSectionProps {
  /** Every agreement of the franchise — the section filters to editable ones. */
  agreements: AgreementRecord[] | null | undefined;
  selectedId: number | null;
  onSelect: (agreementId: number) => void;
  value: AgreementTermsFormState | null;
  onChange: (patch: Partial<AgreementTermsFormState>) => void;
}

/**
 * "Agreement terms" section of the admin edit-franchise dialog. Editable only
 * while the agreement is unsigned (DRAFT, or APPROVED before the franchisee
 * signs) — mirrors the backend gate on PATCH /admin/agreement/:id.
 */
export function EditAgreementTermsSection({
  agreements,
  selectedId,
  onSelect,
  value,
  onChange,
}: EditAgreementTermsSectionProps) {
  const editable = editableAgreementsFrom(agreements);
  const selected =
    editable.find((agreement) => agreement.id === selectedId) ?? null;

  return (
    <FormSection
      title="Agreement terms"
      description="Editable until the franchisee signs the agreement."
    >
      {editable.length === 0 ? (
        <DialogStateMessage
          tone="info"
          title={
            (agreements?.length ?? 0) > 0
              ? "Agreement terms are locked"
              : "No agreement to edit"
          }
          description={
            (agreements?.length ?? 0) > 0
              ? "Every agreement of this franchise has been signed. Signed terms are the artifact of record — issue a renewal to change them."
              : "This franchise has no agreement yet. Terms are created during the approval flow."
          }
        />
      ) : !selected || !value ? null : (
        <div className="space-y-4">
          {editable.length > 1 ? (
            <DialogFormField
              id="edit-agreement-target"
              label="Agreement"
              hint="Only unsigned agreements are listed."
            >
              <Select
                value={String(selected.id)}
                onValueChange={(next) => onSelect(Number(next))}
              >
                <SelectTrigger id="edit-agreement-target">
                  <SelectValue placeholder="Select agreement" />
                </SelectTrigger>
                <SelectContent>
                  {editable.map((agreement) => (
                    <SelectItem key={agreement.id} value={String(agreement.id)}>
                      {agreement.programName ??
                        agreement.title ??
                        "Agreement"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </DialogFormField>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              label={formatStatusLabel(selected.status ?? "Unknown")}
            />
            <span className="text-xs text-muted-foreground">
              {selected.programName ?? selected.title ?? ""}
            </span>
          </div>

          <DialogFormField id="edit-agreement-title" label="Agreement title">
            <Input
              id="edit-agreement-title"
              value={value.title}
              onChange={(event) => onChange({ title: event.target.value })}
            />
          </DialogFormField>

          <DialogFormField id="edit-agreement-notes" label="Notes">
            <Input
              id="edit-agreement-notes"
              value={value.notes}
              onChange={(event) => onChange({ notes: event.target.value })}
              placeholder="Internal notes"
            />
          </DialogFormField>

          <AgreementTermsFields
            idPrefix="edit-agreement"
            value={value}
            onChange={onChange}
          />
        </div>
      )}
    </FormSection>
  );
}
