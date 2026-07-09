"use client";

import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ToggleField } from "@/components/shared/toggle-field";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  IndianRupee,
  Percent,
  CreditCard,
} from "lucide-react";
import { selectInputValueOnFocus } from "@/lib/select-input-on-focus";
import { formatRupees } from "@/lib/currency-utils";
import { getFranchiseFeePayable, GST_RATE_LABEL } from "@/lib/gst";
import type { Program } from "@/services/program.service";
import type { PaymentMode } from "@/services/franchisee.service";
import type { ProgramPayroll, PaidPaymentRow } from "./types";
import { DialogFormField } from "@/components/shared/dialog";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emptyPaidRow(): PaidPaymentRow {
  return {
    amount: 0,
    paidAt: new Date().toISOString().slice(0, 10),
    mode: "cash",
    reference: "",
  };
}

function formatDueDateDisplay(iso: string): string {
  if (!iso) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

// ---------------------------------------------------------------------------
// PaidPaymentEditor
// ---------------------------------------------------------------------------

interface PaidPaymentEditorProps {
  row: PaidPaymentRow;
  amountError?: string;
  paidAtError?: string;
  amountMax?: number;
  gstExclusive?: boolean;
  onChange: (next: PaidPaymentRow) => void;
  onRemove: () => void;
}

function PaidPaymentEditor({
  row,
  amountError,
  paidAtError,
  amountMax,
  gstExclusive,
  onChange,
  onRemove,
}: PaidPaymentEditorProps) {
  return (
    <div className="grid grid-cols-12 items-end gap-2 rounded-lg border border-border bg-card p-3">
      <div className="col-span-3 space-y-1">
        <Label className="text-xs">Amount (₹)</Label>
        <Input
          type="number"
          min="0"
          max={amountMax}
          value={row.amount === 0 ? "" : row.amount}
          onChange={(e) =>
            onChange({
              ...row,
              amount: e.target.value === "" ? 0 : Number(e.target.value),
            })
          }
          onFocus={selectInputValueOnFocus}
          className={amountError ? "border-destructive" : ""}
          placeholder="0"
        />
        {amountError && (
          <p className="text-[11px] text-destructive">{amountError}</p>
        )}
        {!amountError && amountMax != null && amountMax > 0 && row.amount > 0 && row.amount === amountMax && (
          <p className="text-[11px] text-muted-foreground">
            Capped at remaining balance
          </p>
        )}
        {!amountError && gstExclusive && (
          <p className="text-[11px] text-muted-foreground">
            Enter the amount excluding GST
          </p>
        )}
      </div>
      <div className="col-span-3 space-y-1">
        <Label className="text-xs">Paid On</Label>
        <DateInput
          value={row.paidAt}
          onChange={(v) => onChange({ ...row, paidAt: v })}
          className={paidAtError ? "border-destructive" : ""}
        />
        {paidAtError && (
          <p className="text-[11px] text-destructive">{paidAtError}</p>
        )}
      </div>
      <div className="col-span-2 space-y-1">
        <Label className="text-xs">Mode</Label>
        <select
          className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          value={row.mode}
          onChange={(e) =>
            onChange({ ...row, mode: e.target.value as PaymentMode })
          }
        >
          <option value="cash">Cash</option>
          <option value="upi">UPI</option>
          <option value="bank-transfer">Bank Transfer</option>
          <option value="razorpay">Razorpay</option>
          <option value="cheque">Cheque</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div className="col-span-3 space-y-1">
        <Label className="text-xs">Reference</Label>
        <Input
          value={row.reference}
          onChange={(e) => onChange({ ...row, reference: e.target.value })}
          placeholder="Optional"
        />
      </div>
      <div className="col-span-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRemove}
          className="w-full text-destructive hover:text-destructive"
          aria-label="Remove payment"
        >
          ×
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PaidUnpaidSection
// ---------------------------------------------------------------------------

interface PaidUnpaidSectionProps {
  programId: number;
  payroll: ProgramPayroll | undefined;
  onUpdate: (
    programId: number,
    field: keyof ProgramPayroll,
    value: any,
  ) => void;
  errors: Record<string, string>;
}

function PaidUnpaidSection({
  programId,
  payroll,
  onUpdate,
  errors,
}: PaidUnpaidSectionProps) {
  if (!payroll) return null;
  const franchiseFee = Number(payroll.franchiseFee) || 0;
  const paidSum = payroll.paidPayments.reduce(
    (acc, r) => acc + (Number(r.amount) || 0),
    0,
  );
  const unpaidAmount = Math.max(0, franchiseFee - paidSum);
  const splitCount = payroll.unpaidSplitEnabled
    ? Math.max(1, Math.floor(Number(payroll.unpaidSplitCount) || 1))
    : 1;
  const perInstallment = unpaidAmount > 0 ? unpaidAmount / splitCount : 0;

  // GST-reconciled gross amounts for display only — net values are sent to the backend.
  const inc = payroll.gstFranchiseFee === true;
  const gstExclusive = !inc;
  const feeB    = getFranchiseFeePayable(franchiseFee, inc);
  const paidB   = getFranchiseFeePayable(paidSum, inc);
  const unpaidB = getFranchiseFeePayable(unpaidAmount, inc);
  const perB    = getFranchiseFeePayable(perInstallment, inc);

  return (
    <div className="mt-4 space-y-4 border-t border-border pt-4">
      {/* Total payable summary */}
      {franchiseFee > 0 && (
        <div className="flex items-start justify-between rounded-lg border border-border bg-accent/20 px-4 py-3">
          <span className="text-sm font-medium text-card-foreground">
            Total payable
          </span>
          <div className="text-right">
            <span className="text-sm font-semibold text-card-foreground">
              {formatRupees(feeB.payable)}
            </span>
            {gstExclusive && (
              <p className="text-[11px] text-muted-foreground">
                {formatRupees(feeB.base)} + {formatRupees(feeB.gst)} {GST_RATE_LABEL}
              </p>
            )}
          </div>
        </div>
      )}

      <h3 className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-primary">
        <CreditCard className="h-4 w-4" />
        Received payments
      </h3>

      {/* Paid subcard */}
      <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-card-foreground">
              Paid payments{" "}
              <span className="ml-1 text-xs text-muted-foreground">
                ({payroll.paidPayments.length})
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              Record any amounts already received against the franchise fee.
              Paid is optional.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            disabled={franchiseFee > 0 && paidSum >= franchiseFee}
            onClick={() =>
              onUpdate(programId, "paidPayments", [
                ...payroll.paidPayments,
                emptyPaidRow(),
              ])
            }
          >
            + Add payment
          </Button>
        </div>

        {payroll.paidPayments.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-background px-4 py-5 text-center text-sm text-muted-foreground">
            No payments recorded yet.
          </p>
        ) : (
          <div className="space-y-2">
            {payroll.paidPayments.map((row, idx) => {
              const sumOthers = payroll.paidPayments.reduce(
                (acc, r, i) => acc + (i === idx ? 0 : Number(r.amount) || 0),
                0,
              );
              const rowMax =
                franchiseFee > 0
                  ? Math.max(0, franchiseFee - sumOthers)
                  : undefined;
              return (
                <PaidPaymentEditor
                  key={idx}
                  row={row}
                  amountError={errors[`paid-${programId}-${idx}-amount`]}
                  paidAtError={errors[`paid-${programId}-${idx}-paidAt`]}
                  amountMax={rowMax}
                  gstExclusive={gstExclusive}
                  onChange={(next) => {
                    const requested = Number(next.amount) || 0;
                    const clamped =
                      rowMax != null
                        ? Math.max(0, Math.min(requested, rowMax))
                        : Math.max(0, requested);
                    const safe = { ...next, amount: clamped };
                    const copy = [...payroll.paidPayments];
                    copy[idx] = safe;
                    onUpdate(programId, "paidPayments", copy);
                  }}
                  onRemove={() => {
                    const copy = payroll.paidPayments.filter(
                      (_, i) => i !== idx,
                    );
                    onUpdate(programId, "paidPayments", copy);
                  }}
                />
              );
            })}
          </div>
        )}

        <div className="flex items-start justify-between border-t border-primary/10 pt-2 text-sm">
          <span className="text-muted-foreground">Total paid</span>
          <div className="text-right">
            <span className="font-medium text-card-foreground">
              {formatRupees(paidB.payable)}
            </span>
            {gstExclusive && paidSum > 0 && (
              <p className="text-[11px] text-muted-foreground">
                {formatRupees(paidB.base)} + {formatRupees(paidB.gst)} {GST_RATE_LABEL}
              </p>
            )}
          </div>
        </div>
        {errors[`paid-${programId}`] && (
          <p className="text-xs text-destructive">
            {errors[`paid-${programId}`]}
          </p>
        )}
      </div>

      {/* Unpaid subcard */}
      <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-card-foreground">
            Unpaid balance
          </p>
          <div className="text-right">
            <span className="text-sm font-semibold text-card-foreground">
              {formatRupees(unpaidB.payable)}
            </span>
            {gstExclusive && unpaidAmount > 0 && (
              <p className="text-[11px] text-muted-foreground">
                {formatRupees(unpaidB.base)} + {formatRupees(unpaidB.gst)} {GST_RATE_LABEL}
              </p>
            )}
          </div>
        </div>

        {unpaidAmount === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-background px-4 py-3 text-center text-sm text-muted-foreground">
            Fully paid — no receivable plan will be created.
          </p>
        ) : (
          <>
            <ToggleField
              name={`unpaid-split-${programId}`}
              tone="primary"
              label="Split unpaid balance into EMIs"
              value={payroll.unpaidSplitEnabled ? "split" : "single"}
              onValueChange={(v) =>
                onUpdate(programId, "unpaidSplitEnabled", v === "split")
              }
              options={[
                {
                  value: "single",
                  label: "Single receivable",
                  description:
                    "One receivable for the full unpaid amount.",
                },
                {
                  value: "split",
                  label: "Split into EMIs",
                  description:
                    "Break the unpaid amount into N equal monthly receivables.",
                },
              ]}
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {payroll.unpaidSplitEnabled && (
                <DialogFormField label="Number of EMIs">
                  <Input
                    id={`unpaid-count-${programId}`}
                    type="number"
                    min={1}
                    step={1}
                    value={payroll.unpaidSplitCount || ""}
                    onChange={(e) =>
                      onUpdate(
                        programId,
                        "unpaidSplitCount",
                        e.target.value === ""
                          ? 1
                          : Math.max(
                              1,
                              Math.floor(Number(e.target.value)) || 1,
                            ),
                      )
                    }
                    onFocus={selectInputValueOnFocus}
                    className="h-10"
                    placeholder="1"
                  />
                  {errors[`split-${programId}`] && (
                    <p className="text-xs text-destructive">
                      {errors[`split-${programId}`]}
                    </p>
                  )}
                </DialogFormField>
              )}

              <DialogFormField
                label={
                  payroll.unpaidSplitEnabled && splitCount > 1
                    ? "First due date"
                    : "Due date"
                }
              >
                <DateInput
                  id={`unpaid-due-date-${programId}`}
                  value={payroll.unpaidFirstDueDate}
                  onChange={(v) =>
                    onUpdate(programId, "unpaidFirstDueDate", v)
                  }
                  min={payroll.signedAt || undefined}
                  className="h-10"
                />
                {errors[`unpaidDueDate-${programId}`] && (
                  <p className="text-xs text-destructive">
                    {errors[`unpaidDueDate-${programId}`]}
                  </p>
                )}
              </DialogFormField>
            </div>

            <p className="rounded-lg border border-dashed border-border bg-background px-4 py-3 text-sm text-card-foreground">
              {splitCount > 1
                ? `${splitCount} receivables of ${formatRupees(perB.payable)}${gstExclusive ? ` (incl. ${GST_RATE_LABEL})` : ""} each, starting ${formatDueDateDisplay(payroll.unpaidFirstDueDate)}`
                : `1 receivable of ${formatRupees(unpaidB.payable)}${gstExclusive ? ` (incl. ${GST_RATE_LABEL})` : ""} due ${formatDueDateDisplay(payroll.unpaidFirstDueDate)}`}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StepAgreement (Step 3)
// ---------------------------------------------------------------------------

interface StepAgreementProps {
  selectedPrograms: number[];
  programs: Program[];
  programPayrolls: Record<number, ProgramPayroll>;
  onUpdatePayroll: (
    programId: number,
    field: keyof ProgramPayroll,
    value: any,
  ) => void;
  errors: Record<string, string>;
}

export function StepAgreement({
  selectedPrograms,
  programs,
  programPayrolls,
  onUpdatePayroll,
  errors,
}: StepAgreementProps) {
  return (
    <div className="space-y-4">
      <h3 className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-primary">
        <IndianRupee className="h-4 w-4" />
        Selected program agreement terms
      </h3>
      {selectedPrograms.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-accent/20 px-4 py-10 text-center text-sm text-muted-foreground">
          Please select programs in the previous step.
        </p>
      ) : (
        selectedPrograms.map((programId) => {
          const program = programs.find((p) => p.id === programId);
          const payroll = programPayrolls[programId];

          return (
            <Card
              key={programId}
              className="overflow-hidden rounded-xl border-border shadow-sm"
            >
              <CardHeader className="border-b border-border bg-accent/30 px-4 py-4">
                <CardTitle className="text-base font-medium text-card-foreground">
                  {program?.name}
                </CardTitle>
                <p className="mt-1 text-sm font-normal text-muted-foreground">
                  Fixed agreement terms and recorded payments for this program.
                </p>
              </CardHeader>

              <CardContent className="p-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {/* Franchise Fee */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium text-card-foreground">
                        Franchise Fee
                      </Label>
                      <label className="flex cursor-pointer items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5">
                        <input
                          type="checkbox"
                          checked={payroll?.gstFranchiseFee || false}
                          onChange={(e) =>
                            onUpdatePayroll(
                              programId,
                              "gstFranchiseFee",
                              e.target.checked,
                            )
                          }
                        />
                        <span className="text-xs text-primary">GST Inc.</span>
                      </label>
                    </div>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        min="0"
                        value={payroll?.franchiseFee || ""}
                        onChange={(e) =>
                          onUpdatePayroll(
                            programId,
                            "franchiseFee",
                            e.target.value === "" ? 0 : Number(e.target.value),
                          )
                        }
                        onFocus={selectInputValueOnFocus}
                        className="h-10 pl-10"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Kit Cost */}
                  <DialogFormField label="Kit Cost">
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        min="0"
                        value={payroll?.kitCost || ""}
                        onChange={(e) =>
                          onUpdatePayroll(
                            programId,
                            "kitCost",
                            e.target.value === "" ? 0 : Number(e.target.value),
                          )
                        }
                        onFocus={selectInputValueOnFocus}
                        className="h-10 pl-10"
                        placeholder="0"
                      />
                    </div>
                  </DialogFormField>

                  {/* Material Cost */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium text-card-foreground">
                        Material Cost
                      </Label>
                      <label className="flex cursor-pointer items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5">
                        <input
                          type="checkbox"
                          checked={payroll?.gstMaterialCost || false}
                          onChange={(e) =>
                            onUpdatePayroll(
                              programId,
                              "gstMaterialCost",
                              e.target.checked,
                            )
                          }
                        />
                        <span className="text-xs text-primary">GST Inc.</span>
                      </label>
                    </div>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        min="0"
                        value={payroll?.materialCost || ""}
                        onChange={(e) =>
                          onUpdatePayroll(
                            programId,
                            "materialCost",
                            e.target.value === "" ? 0 : Number(e.target.value),
                          )
                        }
                        onFocus={selectInputValueOnFocus}
                        className="h-10 pl-10"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Monthly Fee */}
                  <DialogFormField label="Monthly Fee">
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        min="0"
                        value={payroll?.monthlyFee || ""}
                        onChange={(e) =>
                          onUpdatePayroll(
                            programId,
                            "monthlyFee",
                            e.target.value === "" ? 0 : Number(e.target.value),
                          )
                        }
                        onFocus={selectInputValueOnFocus}
                        className="h-10 pl-10"
                        placeholder="0"
                      />
                    </div>
                  </DialogFormField>

                  {/* Royalty */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium text-card-foreground">
                        Royalty
                      </Label>
                      <label className="flex cursor-pointer items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5">
                        <input
                          type="checkbox"
                          checked={payroll?.gstRoyalty || false}
                          onChange={(e) =>
                            onUpdatePayroll(
                              programId,
                              "gstRoyalty",
                              e.target.checked,
                            )
                          }
                        />
                        <span className="text-xs text-primary">GST Inc.</span>
                      </label>
                    </div>
                    <div className="relative">
                      <Percent className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={payroll?.royalty || ""}
                        onChange={(e) =>
                          onUpdatePayroll(
                            programId,
                            "royalty",
                            e.target.value === "" ? 0 : Number(e.target.value),
                          )
                        }
                        onFocus={selectInputValueOnFocus}
                        className="h-10 pl-10"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* CI Share */}
                  <DialogFormField label="CI Share">
                    <div className="relative">
                      <Percent className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={payroll?.ciShare || ""}
                        onChange={(e) =>
                          onUpdatePayroll(
                            programId,
                            "ciShare",
                            e.target.value === "" ? 0 : Number(e.target.value),
                          )
                        }
                        onFocus={selectInputValueOnFocus}
                        className="h-10 pl-10"
                        placeholder="0"
                      />
                    </div>
                  </DialogFormField>

                  {/* Franchise Share */}
                  <DialogFormField label="Franchise Share">
                    <div className="relative">
                      <Percent className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={payroll?.franchiseShare || ""}
                        onChange={(e) =>
                          onUpdatePayroll(
                            programId,
                            "franchiseShare",
                            e.target.value === "" ? 0 : Number(e.target.value),
                          )
                        }
                        onFocus={selectInputValueOnFocus}
                        className="h-10 pl-10"
                        placeholder="0"
                      />
                    </div>
                  </DialogFormField>

                  {/* Agreement Signing Date */}
                  <DialogFormField label="Agreement Signing Date">
                    <DateInput
                      id={`signed-at-${programId}`}
                      value={payroll?.signedAt || ""}
                      max={new Date().toISOString().slice(0, 10)}
                      onChange={(v) =>
                        onUpdatePayroll(programId, "signedAt", v)
                      }
                      className="h-10"
                    />
                    {errors[`signedAt-${programId}`] && (
                      <p className="text-xs text-destructive">
                        {errors[`signedAt-${programId}`]}
                      </p>
                    )}
                  </DialogFormField>

                  {/* Agreement Tenure (months) */}
                  <DialogFormField label="Agreement Tenure (months)">
                    <Input
                      id={`tenure-${programId}`}
                      type="number"
                      min={1}
                      step={1}
                      value={payroll?.tenure ?? ""}
                      onChange={(e) =>
                        onUpdatePayroll(
                          programId,
                          "tenure",
                          e.target.value === ""
                            ? 0
                            : Math.max(1, Math.floor(Number(e.target.value))),
                        )
                      }
                      onFocus={selectInputValueOnFocus}
                      className="h-10"
                      placeholder="12"
                    />
                    {errors[`tenure-${programId}`] && (
                      <p className="text-xs text-destructive">
                        {errors[`tenure-${programId}`]}
                      </p>
                    )}
                  </DialogFormField>
                </div>

                <PaidUnpaidSection
                  programId={programId}
                  payroll={payroll}
                  onUpdate={onUpdatePayroll}
                  errors={errors}
                />
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
