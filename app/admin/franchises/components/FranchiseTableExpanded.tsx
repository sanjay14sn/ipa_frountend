"use client";

import { Separator } from "@/components/ui/separator";
import {
  DetailCard,
  DetailField,
  DetailFieldsGrid,
  DetailMessage,
  ExpandedDetailSection,
  ExpandedDetailSurface,
  RawTableSurface,
} from "@/components/shared";
import type { FranchiseData } from "@/services/franchisee.service";
import { useFranchiseStartingKits } from "@/hooks/api/franchisee.hooks";
import type { AgreementRecord } from "@/services/agreement.service";
import {
  InstallmentSummaryCard,
  ReceivableCompactLine,
} from "@/components/receivables/InstallmentSummaryCard";

function formatInr(amount: number | string | null | undefined): string {
  if (amount == null || amount === "") return "—";
  const numeric =
    typeof amount === "string" ? Number.parseFloat(amount) : Number(amount);
  if (Number.isNaN(numeric)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(numeric);
}

function yesNo(value: boolean | null | undefined): string {
  if (value == null) return "—";
  return value ? "Yes" : "No";
}

function franchiseeMail(fe: FranchiseData["franchisee"]): string {
  if (!fe) return "—";
  const raw = fe as { mail?: string; email?: string };
  return raw.mail || raw.email || "—";
}

function MoneyGrid({ agreement }: { agreement: AgreementRecord }) {
  const fields: { label: string; value: string }[] = [
    { label: "Franchise fee", value: formatInr(agreement.franchiseFee) },
    { label: "Monthly fee", value: formatInr(agreement.monthlyFee) },
    { label: "Kit cost", value: formatInr(agreement.kitCost) },
    { label: "Material cost", value: formatInr(agreement.materialCost) },
    { label: "Royalty", value: formatInr(agreement.royalty) },
    { label: "CI share", value: formatInr(agreement.ciShare) },
    { label: "Franchise share", value: formatInr(agreement.franchiseShare) },
    { label: "Total amount", value: formatInr(agreement.totalAmount) },
    {
      label: "Tenure (months)",
      value: agreement.tenure != null ? String(agreement.tenure) : "—",
    },
    {
      label: "Expires",
      value: agreement.expiresAt
        ? String(agreement.expiresAt).slice(0, 10)
        : "—",
    },
    {
      label: "GST on franchise fee",
      value: yesNo(agreement.gstFranchiseFee),
    },
    { label: "GST on royalty", value: yesNo(agreement.gstRoyalty) },
    { label: "GST on material", value: yesNo(agreement.gstMaterialCost) },
    { label: "Installment", value: yesNo(agreement.installment) },
    {
      label: "Payment ID",
      value: agreement.paymentId != null ? String(agreement.paymentId) : "—",
    },
  ];

  return (
    <DetailFieldsGrid columns={4}>
      {fields.map((field) => (
        <DetailField key={field.label} label={field.label} value={field.value} />
      ))}
    </DetailFieldsGrid>
  );
}

export function FranchiseTableExpanded({ item }: { item: FranchiseData }) {
  const franchisee = item.franchisee;
  const agreements = item.agreements ?? [];
  const { data: kitRows = [], isLoading: kitsLoading, isError: kitsError } =
    useFranchiseStartingKits(item.id);

  return (
    <ExpandedDetailSurface>
      <ExpandedDetailSection title="Franchisee information">
        <DetailFieldsGrid columns={3}>
          <DetailField label="Name" value={franchisee?.name ?? "—"} />
          <DetailField label="Email" value={franchiseeMail(franchisee)} />
          <DetailField label="Phone" value={franchisee?.phone ?? "—"} />
          <DetailField
            label="Date of birth"
            value={franchisee?.dob ? String(franchisee.dob).slice(0, 10) : "—"}
          />
          <DetailField
            label="Blood group"
            value={franchisee?.bloodGroup ?? "—"}
          />
          <DetailField
            label="Communication address"
            value={franchisee?.communicationAddress ?? "—"}
            span={3}
          />
          <DetailField label="Education" value={franchisee?.education ?? "—"} />
          <DetailField label="Occupation" value={franchisee?.occupation ?? "—"} />
          <DetailField label="Reference" value={franchisee?.reference ?? "—"} />
        </DetailFieldsGrid>
      </ExpandedDetailSection>

      <Separator />

      <ExpandedDetailSection title="Agreement & financial terms">
        {agreements.length === 0 ? (
          <DetailMessage>No agreements on file.</DetailMessage>
        ) : (
          <div className="space-y-4">
            {agreements.map((agreement) => (
              <DetailCard
                key={agreement.id}
                title={
                  agreement.programName?.trim()
                    ? agreement.programName
                    : `Program #${agreement.programId ?? "?"}`
                }
                meta={`Agreement #${agreement.id} · ${agreement.type} · ${agreement.status}`}
              >
                {agreement.title ? (
                  <p className="mb-3 text-xs text-muted-foreground">
                    {agreement.title}
                  </p>
                ) : null}
                <MoneyGrid agreement={agreement} />
                <div className="mt-3">
                  <ReceivableCompactLine
                    summary={agreement.receivables?.installmentSummary}
                  />
                </div>
                <div className="mt-3">
                  <InstallmentSummaryCard
                    summary={agreement.receivables?.installmentSummary}
                    title="Franchise fee EMI split-up"
                  />
                </div>
              </DetailCard>
            ))}
          </div>
        )}
      </ExpandedDetailSection>

      <Separator />

      <ExpandedDetailSection title="Starting kit">
        {kitsLoading ? (
          <DetailMessage>Loading kit assignments…</DetailMessage>
        ) : kitsError ? (
          <DetailMessage tone="destructive">
            Could not load starting kit data.
          </DetailMessage>
        ) : kitRows.length === 0 ? (
          <DetailMessage>
            No inventory kit lines assigned yet. Contractual kit and material
            amounts appear under agreement terms above.
          </DetailMessage>
        ) : (
          <RawTableSurface className="shadow-none">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                  <th className="p-3 font-medium">Program</th>
                  <th className="p-3 font-medium">Item</th>
                  <th className="p-3 font-medium">SKU</th>
                  <th className="p-3 text-right font-medium">Qty</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Assigned</th>
                  <th className="p-3 font-medium">Dispatched</th>
                </tr>
              </thead>
              <tbody>
                {kitRows.map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="p-3">{row.programName}</td>
                    <td className="p-3">{row.itemName}</td>
                    <td className="p-3 text-muted-foreground">{row.sku ?? "—"}</td>
                    <td className="p-3 text-right tabular-nums">{row.quantity}</td>
                    <td className="p-3">{row.status}</td>
                    <td className="p-3 text-muted-foreground">
                      {row.assignedAt
                        ? String(row.assignedAt).slice(0, 10)
                        : "—"}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {row.dispatchedAt
                        ? String(row.dispatchedAt).slice(0, 10)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </RawTableSurface>
        )}
      </ExpandedDetailSection>
    </ExpandedDetailSurface>
  );
}
