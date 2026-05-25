"use client";

import { useMemo, useState } from "react";
import { Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DetailField, DetailFieldsGrid, DetailMessage } from "@/components/shared";
import type { AgreementRecord } from "@/services/agreement.service";
import { ReceivableCompactLine } from "@/components/receivables/InstallmentSummaryCard";
import { EmiTimeline } from "@/components/receivables/EmiTimeline";
import { GST_RATE_LABEL, getFranchiseFeePayable } from "@/lib/gst";
import { AgreementKitItemsDialog } from "./AgreementKitItemsDialog";

function formatInr(amount: number | string | null | undefined): string {
  if (amount == null || amount === "") return "-";
  const numeric =
    typeof amount === "string" ? Number.parseFloat(amount) : Number(amount);
  if (Number.isNaN(numeric)) return "-";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(numeric);
}

function yesNo(value: boolean | null | undefined): string {
  if (value == null) return "-";
  return value ? "Yes" : "No";
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function agreementLabel(agreement: AgreementRecord) {
  const program =
    agreement.programName?.trim() ||
    agreement.program?.name?.trim() ||
    (agreement.programId != null ? `Program #${agreement.programId}` : "Agreement");
  return `${program} | #${agreement.id}`;
}

function formatFranchiseFeePayable(
  franchiseFee: number | null | undefined,
  gstFranchiseFee: boolean | null | undefined,
): string {
  if (franchiseFee == null) return "-";
  const payable = getFranchiseFeePayable(franchiseFee, gstFranchiseFee);
  if (payable.inclusive) {
    return `${formatInr(payable.base)} (GST inclusive)`;
  }
  return `${formatInr(payable.base)} + ${GST_RATE_LABEL} (${formatInr(payable.payable)} payable)`;
}

function AgreementMoneyGrid({ agreement }: { agreement: AgreementRecord }) {
  const fields: { label: string; value: string }[] = [
    {
      label: "Franchise fee (payable)",
      value: formatFranchiseFeePayable(
        agreement.franchiseFee,
        agreement.gstFranchiseFee,
      ),
    },
    { label: "Monthly fee", value: formatInr(agreement.monthlyFee) },
    { label: "Kit cost", value: formatInr(agreement.kitCost) },
    { label: "Material cost", value: formatInr(agreement.materialCost) },
    { label: "Royalty", value: formatInr(agreement.royalty) },
    { label: "CI share", value: formatInr(agreement.ciShare) },
    { label: "Franchise share", value: formatInr(agreement.franchiseShare) },
    {
      label: "Tenure (months)",
      value: agreement.tenure != null ? String(agreement.tenure) : "-",
    },
    { label: "Expires", value: formatDate(agreement.expiresAt ?? null) },
    { label: "GST on royalty", value: yesNo(agreement.gstRoyalty) },
    { label: "GST on material", value: yesNo(agreement.gstMaterialCost) },
    { label: "Installment", value: yesNo(agreement.installment) },
    {
      label: "Payment ID",
      value: agreement.paymentId != null ? String(agreement.paymentId) : "-",
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

interface FranchiseAgreementsWorkspaceProps {
  agreements: AgreementRecord[];
}

export function FranchiseAgreementsWorkspace({
  agreements,
}: FranchiseAgreementsWorkspaceProps) {
  const sortedAgreements = useMemo(
    () => [...agreements].sort((a, b) => b.id - a.id),
    [agreements],
  );
  const initialAgreementId = sortedAgreements[0]?.id ?? null;
  const [activeAgreementId, setActiveAgreementId] = useState<string>(
    initialAgreementId != null ? String(initialAgreementId) : "",
  );
  const [kitDialogOpen, setKitDialogOpen] = useState(false);

  if (sortedAgreements.length === 0) {
    return <DetailMessage>No agreements on file.</DetailMessage>;
  }

  const resolvedActiveId =
    sortedAgreements.find((agreement) => String(agreement.id) === activeAgreementId)
      ?.id ?? sortedAgreements[0].id;

  const activeAgreement =
    sortedAgreements.find((agreement) => agreement.id === resolvedActiveId) ??
    sortedAgreements[0];

  return (
    <>
      <Tabs
        value={String(resolvedActiveId)}
        onValueChange={setActiveAgreementId}
        className="space-y-4"
      >
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          {sortedAgreements.map((agreement) => (
            <TabsTrigger key={agreement.id} value={String(agreement.id)}>
              {agreementLabel(agreement)}
            </TabsTrigger>
          ))}
        </TabsList>

        {sortedAgreements.map((agreement) => (
          <TabsContent
            key={agreement.id}
            value={String(agreement.id)}
            className="mt-0 space-y-4"
          >
            <div className="rounded-xl border bg-card p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-semibold">
                      {agreement.programName?.trim() ||
                        agreement.program?.name?.trim() ||
                        "Agreement"}
                    </h4>
                    {agreement.status ? (
                      <Badge variant="secondary">{agreement.status}</Badge>
                    ) : null}
                    {agreement.type ? (
                      <Badge variant="outline">{agreement.type}</Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Agreement #{agreement.id} | Signed on{" "}
                    {formatDate(agreement.dateOfSigning)}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="h-9"
                  onClick={() => setKitDialogOpen(true)}
                  disabled={agreement.programId == null}
                >
                  <Package className="mr-2 h-4 w-4" />
                  Manage kit items
                </Button>
              </div>
            </div>

            {agreement.title ? (
              <p className="text-sm text-muted-foreground">{agreement.title}</p>
            ) : null}

            <AgreementMoneyGrid agreement={agreement} />

            <Separator />

            <div className="space-y-3">
              <ReceivableCompactLine
                summary={agreement.receivables?.installmentSummary}
              />
              <EmiTimeline
                summary={agreement.receivables?.installmentSummary}
                gstFranchiseFee={agreement.gstFranchiseFee ?? null}
                title="Franchise fee EMI plan"
                agreementRef={
                  agreement.id ? `Agreement #${agreement.id}` : null
                }
              />
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <AgreementKitItemsDialog
        agreement={activeAgreement}
        open={kitDialogOpen}
        onOpenChange={setKitDialogOpen}
      />
    </>
  );
}
