"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { getProcessedAgreementContent } from "@/lib/agreementContent";
import { GST_RATE_LABEL, getFranchiseFeePayable } from "@/lib/gst";
import { EmiTimeline } from "@/components/receivables/EmiTimeline";
import {
  agreementSignatureSrc,
  downloadScheduleBPdfAdmin,
  downloadScheduleBPdfMine,
  getReceivablePlanMine,
  type AgreementRecord,
  type ReceivableCompactSummary,
  type ReceivableFranchiseeSummary,
  type ReceivableInstallmentSummary,
  type ReceivableSummaryItem,
  type AgreementScheduleBView,
} from "@/services/agreement.service";
import {
  buildAgreementDetailFranchiseData,
} from "@/lib/agreement-page-terms";
import { getErrorMessage } from "@/lib/error-utils";
import PaymentBreakdown from "@/app/franchisee/agreement/components/PaymentBreakdown";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  CreditCard,
  Download,
  ExternalLink,
  FileText,
  IndianRupee,
  Loader2,
  MapPin,
  Menu,
  PenLine,
  ShieldCheck,
  User,
} from "lucide-react";

function fmtDate(value: string | null | undefined): string {
  if (value == null || value === "") return "-";
  try {
    const d = typeof value === "string" ? parseISO(value) : new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return format(d, "PPpp");
  } catch {
    return String(value);
  }
}

function fmtShortDate(value: string | null | undefined): string {
  if (value == null || value === "") return "-";
  try {
    const d = typeof value === "string" ? parseISO(value) : new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return format(d, "PP");
  } catch {
    return String(value);
  }
}

const PAYMENT_LABELS: Record<string, string> = {
  razorpayOrderId: "Razorpay order ID",
  razorpayPaymentId: "Razorpay payment ID",
  amount: "Amount",
  currency: "Currency",
  type: "Payment type",
  status: "Status",
  method: "Method",
  bank: "Bank",
  wallet: "Wallet",
  vpa: "UPI VPA",
  email: "Email",
  contact: "Contact",
  cardLast4: "Card last 4",
  cardNetwork: "Card network",
  cardIssuer: "Card issuer",
  cardType: "Card type",
  fee: "Fee",
  tax: "Tax",
  franchiseeId: "Franchisee ID",
  subscriptionId: "Subscription ID",
};

const money = (n: number | undefined | null) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(n ?? 0));

function formatFranchiseFee(
  data: Pick<AgreementScheduleBView, "franchiseFee" | "gstFranchiseFee">,
): string {
  const payable = getFranchiseFeePayable(data.franchiseFee, data.gstFranchiseFee);
  if (payable.inclusive) {
    return `${money(payable.base)} (GST inclusive)`;
  }
  return `${money(payable.base)} + ${GST_RATE_LABEL} (${money(payable.payable)} payable)`;
}

/** Same shape as `formatFranchiseFee` but reads the material-cost GST flag. */
function formatMaterialCharges(
  data: Pick<AgreementScheduleBView, "materialCost" | "gstMaterialCost">,
): string {
  const inclusive = data.gstMaterialCost !== false;
  if (inclusive) {
    return `${money(data.materialCost)} (GST inclusive)`;
  }
  const payable = getFranchiseFeePayable(data.materialCost, false);
  return `${money(payable.base)} + ${GST_RATE_LABEL} (${money(payable.payable)} payable)`;
}

function prettifyToken(value: string | null | undefined): string {
  if (!value) return "-";
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function paymentStatusTone(status: string | null | undefined) {
  switch ((status ?? "").toLowerCase()) {
    case "completed":
    case "captured":
    case "paid":
      return "default";
    case "failed":
      return "destructive";
    default:
      return "secondary";
  }
}

function isFullInstallmentSummary(
  summary:
    | ReceivableInstallmentSummary
    | ReceivableFranchiseeSummary
    | ReceivableCompactSummary
    | null
    | undefined,
): summary is ReceivableInstallmentSummary {
  return Boolean(summary && "items" in summary && Array.isArray(summary.items));
}

function hasReceivablePlan(
  summary:
    | ReceivableInstallmentSummary
    | ReceivableFranchiseeSummary
    | ReceivableCompactSummary
    | null
    | undefined,
): boolean {
  if (!summary) return false;
  return !("hasPlan" in summary) || Boolean(summary.hasPlan);
}

type BadgeTone = "default" | "secondary" | "outline" | "destructive";

/**
 * Lifecycle badge for an agreement. The new contract (post-refactor):
 *   - `agreement.signed` is the single source of truth for "signed".
 *   - `agreement.status === 'Valid'` only after BOTH signed AND payment-linked.
 * The combo `status='Approved' && signed=true` means "signed, awaiting payment"
 * — a real intermediate state that was previously rendered as plain "Approved".
 */
function agreementStatusBadge(
  status: string | null | undefined,
  signed: boolean | undefined,
): { label: string; tone: BadgeTone } {
  switch (status) {
    case "Valid":
    case "Signed": // legacy alias — same tone
      return { label: "Valid", tone: "default" };
    case "Approved":
    case "PendingSignature": // legacy alias — same family
      return signed
        ? { label: "Signed · awaiting payment", tone: "default" }
        : { label: "Approved · awaiting signature", tone: "secondary" };
    case "Suspended":
      return { label: "Suspended", tone: "secondary" };
    case "Void":
    case "Expired":
      return { label: "Void", tone: "destructive" };
    case "Draft":
      return { label: "Draft", tone: "outline" };
    default:
      return { label: status ?? "-", tone: "secondary" };
  }
}

export function AgreementRecordDetail({
  data,
  onPayReceivableItem,
  isInitiatingReceivablePayment,
}: {
  data: AgreementRecord;
  onPayReceivableItem?: () => void;
  isInitiatingReceivablePayment?: boolean;
}) {
  const pathname = usePathname();
  const isAdminContext = pathname?.startsWith("/admin") ?? false;
  const [schedulePdfLoading, setSchedulePdfLoading] = useState(false);
  const [fullReceivablePlan, setFullReceivablePlan] =
    useState<ReceivableInstallmentSummary | null>(null);
  const [fullReceivablePlanLoading, setFullReceivablePlanLoading] =
    useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["franchise-agreement", "financial-terms"]),
  );

  const sigSrc = agreementSignatureSrc(data);
  const franchiseData = buildAgreementDetailFranchiseData(data);
  const agreementContent = getProcessedAgreementContent(franchiseData);
  const payment = data.payment;
  const installmentSummary =
    fullReceivablePlan ??
    data.receivables?.installmentSummary ??
    data.receivables?.paymentSummary ??
    null;
  const receivablePaymentItems = isFullInstallmentSummary(installmentSummary)
    ? installmentSummary.items
        .filter((item) => item.paymentId != null || item.paidAt != null)
        .slice()
        .sort((left, right) => {
          const leftAt = left.paidAt ? new Date(left.paidAt).getTime() : 0;
          const rightAt = right.paidAt ? new Date(right.paidAt).getTime() : 0;
          if (leftAt !== rightAt) return rightAt - leftAt;
          return right.sortOrder - left.sortOrder;
        })
    : [];
  const paymentMetaEntries = payment
    ? Object.entries(payment as unknown as Record<string, unknown>).filter(
        ([k, v]) =>
          v != null &&
          v !== "" &&
          ![
            "createdAt",
            "updatedAt",
            "amount",
            "currency",
            "status",
            "type",
            "paidAt",
          ].includes(k) &&
          typeof v !== "object",
      )
    : [];
  const paymentPrimaryRows = payment
    ? [
        ["Payment type", prettifyToken(payment.type)],
        [
          "Paid at",
          fmtDate(
            (payment as AgreementRecord["payment"] & {
              paidAt?: string | null;
            })?.paidAt ?? null,
          ),
        ],
        ["Payment ID", payment.razorpayPaymentId ?? "-"],
        ["Order ID", payment.razorpayOrderId ?? "-"],
      ]
    : [];
  const keyFacts = [
    {
      label: "Program",
      value:
        data.program?.name ??
        data.programName ??
        data.programs?.[0]?.name ??
        (data.programId != null ? `Program #${data.programId}` : "-"),
      icon: FileText,
    },
    {
      label: "Franchise",
      value: data.franchise?.name ?? data.franchiseId ?? "-",
      icon: Building2,
    },
    {
      label: "Executed",
      value: fmtDate(data.dateOfSigning),
      icon: CalendarDays,
    },
    {
      label: "Signature",
      value: data.signed ? "Signed" : "Pending",
      icon: PenLine,
    },
  ];

  async function handleDownloadScheduleB() {
    setSchedulePdfLoading(true);
    try {
      if (isAdminContext) {
        await downloadScheduleBPdfAdmin(data.id);
      } else {
        await downloadScheduleBPdfMine(data.id);
      }
      toast.success("Schedule B PDF download started");
    } catch (e) {
      toast.error(getErrorMessage(e, "Failed to download Schedule B PDF"));
    } finally {
      setSchedulePdfLoading(false);
    }
  }

  function toggleSection(sectionId: string) {
    const next = new Set(expandedSections);
    if (next.has(sectionId)) {
      next.delete(sectionId);
    } else {
      next.add(sectionId);
    }
    setExpandedSections(next);
  }

  function expandAllSections() {
    setExpandedSections(new Set(agreementContent.sections.map((s) => s.id)));
  }

  function collapseAllSections() {
    setExpandedSections(new Set());
  }

  async function handleViewFullSchedule() {
    if (isAdminContext || fullReceivablePlanLoading) return;
    setFullReceivablePlanLoading(true);
    try {
      const plan = await getReceivablePlanMine(data.id);
      setFullReceivablePlan(plan);
    } catch (e) {
      toast.error(getErrorMessage(e, "Failed to load EMI schedule"));
    } finally {
      setFullReceivablePlanLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden rounded-2xl border-border shadow-sm">
        <CardContent className="p-0">
          <div className="border-b border-border bg-accent/30 px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl text-card-foreground">
                    {data.title || `Agreement #${data.id}`}
                  </h2>
                  {(() => {
                    const badge = agreementStatusBadge(data.status, data.signed);
                    return <Badge variant={badge.tone}>{badge.label}</Badge>;
                  })()}
                  <Badge variant="secondary">{data.type}</Badge>
                  {data.referenceCode ? (
                    <Badge variant="outline">Ref: {data.referenceCode}</Badge>
                  ) : null}
                </div>
                <p className="max-w-3xl text-sm text-muted-foreground">
                  Review agreement summary, legal terms, Schedule B, payment,
                  and signature details.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={schedulePdfLoading}
                onClick={() => void handleDownloadScheduleB()}
              >
                {schedulePdfLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Schedule B PDF
              </Button>
            </div>
          </div>

          <div className="grid gap-3 px-4 py-4 sm:px-5 md:grid-cols-2 xl:grid-cols-4">
            {keyFacts.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="rounded-xl border border-border bg-card p-3 shadow-sm"
                >
                  <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                    <Icon className="h-4 w-4" />
                    <span className="text-[11px] font-medium uppercase tracking-[0.08em]">
                      {item.label}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-card-foreground">
                    {item.value}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <AgreementEmiScheduleCard
        summary={installmentSummary}
        onViewFullSchedule={
          !isAdminContext && !fullReceivablePlan
            ? () => void handleViewFullSchedule()
            : undefined
        }
        viewFullScheduleLabel={
          fullReceivablePlanLoading ? "Loading schedule..." : "View full schedule"
        }
        onPayReceivableItem={isAdminContext ? undefined : onPayReceivableItem}
        isInitiatingReceivablePayment={isInitiatingReceivablePayment}
      />

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="agreement">Agreement</TabsTrigger>
          <TabsTrigger value="schedule-b">Schedule B</TabsTrigger>
          {data.metadata && Object.keys(data.metadata).length > 0 ? (
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid items-start gap-3 xl:grid-cols-12">
            <OverviewPanel
              className="xl:col-span-4"
              icon={User}
              title="Franchisee Information"
              rows={[
                ["Contact person", String(franchiseData.contactPerson ?? "-")],
                ["Email", String(franchiseData.email ?? "-")],
                ["Phone", String(franchiseData.phone ?? "-")],
              ]}
            />
            <OverviewPanel
              className="xl:col-span-4"
              icon={MapPin}
              title="Location Details"
              rows={[
                ["Centre address", String(franchiseData.address ?? "-")],
                [
                  "City / State",
                  `${String(franchiseData.city ?? "-")}${
                    franchiseData.state ? `, ${String(franchiseData.state)}` : ""
                  }`,
                ],
                ["Communication", String(franchiseData.communicationAddress ?? "-")],
              ]}
            />
            <OverviewPanel
              className="xl:col-span-4"
              icon={Building2}
              title="Franchise Details"
              rows={[
                ["Franchise name", String(franchiseData.name ?? "-")],
                ["Code", String(franchiseData.franchiseCode ?? "-")],
                ["Program", String(franchiseData.program ?? "-")],
                ["Type", String(franchiseData.franchiseType ?? "-")],
                ["Applied", fmtDate(String(franchiseData.date ?? ""))],
              ]}
            />
          </div>

          <div className="grid items-stretch gap-3 xl:grid-cols-12">
            <div className="h-full xl:col-span-8">
              <PaymentBreakdown paymentDetails={franchiseData.paymentDetails} />
            </div>

            <div className="flex h-full flex-col gap-3 xl:col-span-4">
              <Card className="flex flex-1 flex-col rounded-xl">
                <CardHeader className="p-3 pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <ShieldCheck className="h-4 w-4" />
                    Agreement lifecycle
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 space-y-2 p-3 pt-0 text-sm">
                  <Row label="Agreement ID" value={String(data.id)} />
                  <Row label="Created" value={fmtDate(data.createdAt)} />
                  <Row label="Last updated" value={fmtDate(data.updatedAt)} />
                  <Row label="Date of signing" value={fmtDate(data.dateOfSigning)} />
                  <Row
                    label="Tenure"
                    value={
                      data.tenure != null
                        ? `${data.tenure} month${data.tenure === 1 ? "" : "s"}`
                        : "-"
                    }
                  />
                  <Row label="Expires" value={fmtDate(data.expiresAt ?? null)} />
                </CardContent>
              </Card>

              <Card className="flex flex-1 flex-col rounded-xl">
                <CardHeader className="p-3 pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <PenLine className="h-4 w-4" />
                    Franchisee signature
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col space-y-3 p-3 pt-0">
                  <Row label="Date of signing" value={fmtDate(data.dateOfSigning)} />
                  <Row label="Captured at" value={fmtDate(data.franchiseeSignedAt)} />
                  {sigSrc ? (
                    <div className="flex flex-1 flex-col space-y-2">
                      <div className="flex flex-1 items-center justify-center overflow-hidden rounded-lg border bg-muted/30 px-4 py-5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={sigSrc}
                          alt="Franchisee signature"
                          className="mx-auto max-h-32 w-auto max-w-full object-contain"
                        />
                      </div>
                      <a
                        href={sigSrc}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary inline-flex items-center gap-1 text-sm font-medium hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open signature file
                      </a>
                    </div>
                  ) : data.signed ? (
                    <p className="flex flex-1 items-center text-sm text-muted-foreground">
                      Signature on file (stored on the franchisee profile).
                    </p>
                  ) : (
                    <p className="flex flex-1 items-center text-sm text-muted-foreground">
                      Signature not yet captured.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <Card className="rounded-xl">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-4 w-4" />
                Payment details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {!payment && receivablePaymentItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No payment linked.
                </p>
              ) : (
                <div className="space-y-4">
                  {payment ? (
                    <>
                      <div className="flex flex-col gap-3 rounded-xl border border-border bg-accent/30 p-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                            Amount received
                          </p>
                          <p className="mt-1.5 text-2xl font-semibold tracking-tight text-card-foreground">
                            {money(payment.amount)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                              Currency
                            </p>
                            <p className="mt-1 text-sm font-medium text-card-foreground">
                              {payment.currency ?? "-"}
                            </p>
                          </div>
                          <Badge variant={paymentStatusTone(payment.status)}>
                            {prettifyToken(payment.status)}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                        {paymentPrimaryRows.map(([label, value]) => (
                          <SimpleFactRow key={label} label={label} value={value} />
                        ))}
                      </div>

                      {paymentMetaEntries.length > 0 ? (
                        <div className="border-t border-border pt-4">
                          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                            Additional references
                          </p>
                          <div className="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2 xl:grid-cols-3">
                            {paymentMetaEntries.map(([key, value]) => (
                              <SimpleFactRow
                                key={key}
                                label={PAYMENT_LABELS[key] ?? prettifyToken(key)}
                                value={String(value)}
                              />
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </>
                  ) : null}

                  {receivablePaymentItems.length > 0 ? (
                    <div className={cn(payment ? "border-t border-border pt-4" : "")}>
                      <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                        Receivable payment history
                      </p>
                      <div className="overflow-x-auto rounded-lg border border-border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Item</TableHead>
                              <TableHead>Paid date</TableHead>
                              <TableHead>Payment ID</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {receivablePaymentItems.map((item) => {
                              // Show payable (principal + GST) as the primary
                              // number — matches what was actually charged via
                              // Razorpay. Mirrors the inline split used in
                              // InstallmentSummaryCard ItemRows.
                              const principal =
                                item.principalAmount ?? item.amount;
                              const gst = item.gstAmount ?? 0;
                              const payable =
                                item.payableAmount ?? item.amount;
                              const showSplit =
                                item.isGstInclusive === false && gst > 0;
                              return (
                                <TableRow key={item.receivableItemId}>
                                  <TableCell>
                                    <div className="font-medium">{item.label}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {prettifyToken(item.kind)}
                                    </div>
                                  </TableCell>
                                  <TableCell>{fmtDate(item.paidAt)}</TableCell>
                                  <TableCell>{item.paymentId ?? "-"}</TableCell>
                                  <TableCell>
                                    <Badge variant={statusVariant(item.status)}>
                                      {prettifyToken(item.status)}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right font-medium">
                                    <div className="flex flex-col items-end gap-0.5">
                                      <span>{money(payable)}</span>
                                      {showSplit ? (
                                        <span className="text-[11px] font-normal text-muted-foreground">
                                          {money(principal)} + {GST_RATE_LABEL}{" "}
                                          {money(gst)}
                                        </span>
                                      ) : null}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agreement">
          <ReadOnlyAgreementContent
            title={agreementContent.title}
            description={agreementContent.description}
            expandedSections={expandedSections}
            onToggleSection={toggleSection}
            onExpandAll={expandAllSections}
            onCollapseAll={collapseAllSections}
            onDownloadPDF={() => void handleDownloadScheduleB()}
            sections={agreementContent.sections}
            loading={schedulePdfLoading}
          />
        </TabsContent>

        <TabsContent value="schedule-b">
          <ScheduleBCard
            data={data.scheduleB ?? null}
            signatureSrc={sigSrc}
            loading={schedulePdfLoading}
            onDownload={() => void handleDownloadScheduleB()}
          />
        </TabsContent>

        {data.metadata && Object.keys(data.metadata).length > 0 ? (
          <TabsContent value="metadata">
            <Card className="rounded-xl">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base">Additional metadata</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <pre className="max-h-96 overflow-auto rounded-md bg-muted p-3 text-xs">
                  {JSON.stringify(data.metadata, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}

function AgreementEmiScheduleCard({
  summary,
  onViewFullSchedule,
  viewFullScheduleLabel = "View full schedule",
  onPayReceivableItem,
  isInitiatingReceivablePayment = false,
}: {
  summary:
    | ReceivableInstallmentSummary
    | ReceivableFranchiseeSummary
    | ReceivableCompactSummary
    | null
    | undefined;
  onViewFullSchedule?: () => void;
  viewFullScheduleLabel?: string;
  onPayReceivableItem?: () => void;
  isInitiatingReceivablePayment?: boolean;
}) {
  const hasPlan = hasReceivablePlan(summary);

  if (!summary || !hasPlan) {
    return (
      <EmiTimeline summary={summary} title="Franchise fee EMI plan" />
    );
  }

  const fullSummary = isFullInstallmentSummary(summary) ? summary : null;
  const nextDueItem = fullSummary
    ? fullSummary.nextDueItem
    : "nextDueItem" in summary
      ? summary.nextDueItem
      : null;
  const initialPayableItem = fullSummary
    ? fullSummary.initialPayableItem
    : "initialPayableItem" in summary
      ? summary.initialPayableItem
      : null;
  const agreementId = fullSummary
    ? fullSummary.agreementId
    : "agreementId" in summary
      ? summary.agreementId
      : null;
  const payableItem =
    nextDueItem && !nextDueItem.paidAt
      ? nextDueItem
      : initialPayableItem && !initialPayableItem.paidAt
        ? initialPayableItem
        : null;
  const canPayNow = Boolean(payableItem && onPayReceivableItem);
  const payableAmountToShow =
    payableItem?.payableAmount ?? payableItem?.amount ?? null;

  return (
    <div className="space-y-3">
      <EmiTimeline
        summary={summary}
        title="Franchise fee EMI plan"
        agreementRef={agreementId ? `Agreement #${agreementId}` : null}
      />

      {summary.holdReason ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {summary.holdReason}
        </p>
      ) : null}

      {/* Pay-now CTA — only when the franchisee can pay and we have a payable item */}
      {canPayNow && payableItem ? (
        <div className="flex flex-col gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">
              Next payable
            </p>
            <p className="mt-0.5 text-sm font-medium text-card-foreground">
              {payableItem.label}
              {payableItem.dueAt ? (
                <span className="ml-1 text-xs text-muted-foreground">
                  · due {fmtShortDate(payableItem.dueAt)}
                </span>
              ) : null}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => onPayReceivableItem?.()}
            disabled={isInitiatingReceivablePayment}
          >
            {isInitiatingReceivablePayment ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Opening payment…
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Pay {money(payableAmountToShow)} now
              </>
            )}
          </Button>
        </div>
      ) : null}

      {/* Loading indicator while the full plan is being fetched */}
      {!fullSummary && onViewFullSchedule ? (
        <button
          type="button"
          onClick={onViewFullSchedule}
          disabled={viewFullScheduleLabel.toLowerCase().includes("loading")}
          className="text-xs text-muted-foreground underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
        >
          {viewFullScheduleLabel.toLowerCase().includes("loading")
            ? "Loading full schedule…"
            : "Load full schedule"}
        </button>
      ) : null}
    </div>
  );
}

function statusVariant(status: string | null | undefined) {
  switch ((status ?? "").toLowerCase()) {
    case "paid":
    case "completed":
    case "current":
      return "default" as const;
    case "overdue":
    case "on-hold":
    case "failed":
      return "destructive" as const;
    case "due":
    case "grace":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

function EmiMetric({
  label,
  value,
  hint,
  strong,
}: {
  label: string;
  value: string;
  hint?: string;
  strong?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 break-words text-sm font-medium leading-snug text-card-foreground",
          strong && "text-primary",
        )}
      >
        {value}
      </p>
      {hint && hint !== "-" ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function EmiScheduleRow({ item }: { item: ReceivableSummaryItem }) {
  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">{item.label}</div>
        <div className="text-xs text-muted-foreground">
          {prettifyToken(item.kind)}
          {item.isInitialPayable ? " · initial payment" : ""}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={statusVariant(item.status)}>{prettifyToken(item.status)}</Badge>
      </TableCell>
      <TableCell>{fmtShortDate(item.dueAt)}</TableCell>
      <TableCell>{fmtShortDate(item.paidAt)}</TableCell>
      <TableCell className="text-right font-medium">{money(item.amount)}</TableCell>
    </TableRow>
  );
}

function OverviewPanel({
  title,
  rows,
  icon: Icon,
  className,
}: {
  title: string;
  rows: Array<[string, string]>;
  icon: typeof User;
  className?: string;
}) {
  return (
    <Card className={cn("h-full rounded-xl border-border shadow-sm", className)}>
      <CardHeader className="p-3 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 p-3 pt-0">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="grid gap-0.5 border-b border-border/60 pb-2 last:border-b-0 last:pb-0"
          >
            <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              {label}
            </span>
            <span className="break-words text-sm font-medium text-card-foreground">
              {value}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ScheduleBCard({
  data,
  signatureSrc,
  loading,
  onDownload,
}: {
  data: AgreementScheduleBView | null;
  signatureSrc: string | null;
  loading: boolean;
  onDownload: () => void;
}) {
  if (!data) {
    return (
      <Card className="rounded-xl">
        <CardContent className="p-8 text-sm text-muted-foreground">
          Schedule B details are not available for this agreement yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden rounded-2xl border-border shadow-sm">
      <CardHeader className="border-b border-border bg-accent/30 p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="text-xl font-normal">Schedule B</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Commercial schedule and royalty breakup for this agreement.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={onDownload}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Download PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-2">
          <DetailList
            title="Agreement details"
            rows={[
              ["Effective date", data.effectiveDate],
              ["Franchise fee", formatFranchiseFee(data)],
              ["Tenure", `${data.tenureMonths} months`],
              [
                "Registration charges",
                money(data.kitCost),
              ],
              ["Material charges", formatMaterialCharges(data)],
            ]}
          />
          <DetailList
            title="Parties"
            rows={[
              ["Franchisee", data.franchiseeName],
              ["Franchisee address", data.franchiseeAddress],
              ["Centre", data.centreName],
              ["Centre address", data.centreAddress],
            ]}
          />
        </div>

        <Card className="rounded-xl border-border bg-card shadow-none">
          <CardHeader className="p-3 pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <IndianRupee className="h-4 w-4" />
              Royalty breakup
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-3 pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Level</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                  <TableHead className="text-right">Term fees</TableHead>
                  <TableHead className="text-right">Franchisee share</TableHead>
                  <TableHead className="text-right">CI share</TableHead>
                  <TableHead className="text-right">IPA share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(
                  [
                    ["Level 1", data.level1],
                    ["Level 2 onwards", data.level2],
                  ] as const
                ).map(([label, row]) => {
                  const level = row as AgreementScheduleBView["level1"];
                  const exclusive = !data.gstRoyaltyInclusive;
                  // When the breakup is GST-exclusive, the displayed cells are
                  // net values — show "+ 18% GST ₹X" beneath each so the
                  // franchisee can see the payable build-up at a glance.
                  const gstFor = (n: number) =>
                    Math.round(n * 0.18 * 100) / 100;
                  const renderCell = (value: number) => (
                    <span className="block tabular-nums">
                      <span className="block">{money(value)}</span>
                      {exclusive && value > 0 ? (
                        <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">
                          + 18% GST {money(gstFor(value))}
                        </span>
                      ) : null}
                    </span>
                  );
                  return (
                    <TableRow key={label}>
                      <TableCell className="font-medium align-top">{label}</TableCell>
                      <TableCell className="text-right align-top">
                        {level.months} months
                      </TableCell>
                      <TableCell className="text-right align-top">
                        {renderCell(level.termFees)}
                      </TableCell>
                      <TableCell className="text-right align-top">
                        {renderCell(level.franchiseShare)}
                      </TableCell>
                      <TableCell className="text-right align-top">
                        {renderCell(level.ciShare)}
                      </TableCell>
                      <TableCell className="text-right align-top">
                        {renderCell(level.ipaShare)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <p className="mt-3 text-xs text-muted-foreground">
              {data.gstRoyaltyInclusive
                ? "Values shown include 18% GST."
                : "Values shown exclude GST. 18% GST is added to each amount on payment."}
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-3 md:grid-cols-2">
          <Card className="rounded-xl border-border shadow-none">
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-base">Franchisor signatory</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-3 pt-0 text-sm">
              <Row label="Name" value={data.franchisorSignatory} />
              <Row label="Witness" value={data.presenceWitnessName} />
              <Row label="Witness address" value={data.presenceWitnessAddress} />
            </CardContent>
          </Card>
          <Card className="rounded-xl border-border shadow-none">
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-base">Franchisee signatory</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-3 pt-0 text-sm">
              <Row label="Name" value={data.franchiseeName} />
              {signatureSrc ? (
                <div className="overflow-hidden rounded-md border bg-muted/30 p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={signatureSrc}
                    alt="Franchisee signature"
                    className="mx-auto max-h-44 w-auto max-w-full object-contain"
                  />
                </div>
              ) : (
                <p className="text-muted-foreground">
                  No signature preview available.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}

function ReadOnlyAgreementContent({
  title,
  description,
  sections,
  expandedSections,
  onToggleSection,
  onExpandAll,
  onCollapseAll,
  onDownloadPDF,
  loading,
}: {
  title: string;
  description: string;
  sections: Array<{
    id: string;
    title: string;
    description?: string;
    points: Array<{ id: string; text: string }>;
  }>;
  expandedSections: Set<string>;
  onToggleSection: (sectionId: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onDownloadPDF: () => void;
  loading: boolean;
}) {
  return (
    <Card className="overflow-hidden rounded-2xl border-border shadow-sm">
      <CardHeader className="border-b border-border bg-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-xl font-normal">{title}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={onDownloadPDF}
              variant="outline"
              size="sm"
              className="rounded-lg border-border text-xs"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Download className="mr-1 h-3 w-3" />
              )}
              PDF
            </Button>
            <Button
              onClick={onExpandAll}
              variant="outline"
              size="sm"
              className="rounded-lg border-border text-xs"
            >
              Expand
            </Button>
            <Button
              onClick={onCollapseAll}
              variant="outline"
              size="sm"
              className="rounded-lg border-border text-xs"
            >
              Collapse
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[min(65vh,720px)] overflow-y-auto">
          {sections.map((section, index) => (
            <div
              key={section.id}
              className="border-b border-border last:border-b-0"
            >
              <button
                type="button"
                onClick={() => onToggleSection(section.id)}
                className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-accent/30 sm:px-5"
              >
                <div>
                  <h4 className="text-sm font-medium text-card-foreground">
                    {index + 1}. {section.title}
                  </h4>
                  {section.description ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {section.description}
                    </p>
                  ) : null}
                </div>
                <span className="text-xs font-medium text-muted-foreground">
                  {expandedSections.has(section.id) ? "Hide" : "Show"}
                </span>
              </button>
              {expandedSections.has(section.id) ? (
                <div className="bg-muted/30 px-4 pb-4 sm:px-5">
                  <ul className="space-y-2.5 text-sm text-card-foreground">
                    {section.points.map((point) => (
                      <li key={point.id} className="flex items-start gap-3">
                        <span className="mt-1 text-primary">•</span>
                        <span className="whitespace-pre-line leading-relaxed">
                          {point.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function DetailList({
  title,
  rows,
}: {
  title: string;
  rows: Array<[string, string]>;
}) {
  return (
    <Card className="rounded-xl border-border shadow-none">
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 p-3 pt-0 text-sm">
        {rows.map(([label, value]) => (
          <Row key={label} label={label} value={value} />
        ))}
      </CardContent>
    </Card>
  );
}

function PaymentFactCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium text-card-foreground">
        {value}
      </p>
    </div>
  );
}

function SimpleFactRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium text-card-foreground">
        {value}
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className={cn("flex flex-col gap-0.5 sm:flex-row sm:gap-3")}>
      <span className="shrink-0 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground sm:w-40">
        {label}
      </span>
      <span className="min-w-0 break-words text-sm text-card-foreground">
        {value}
      </span>
    </div>
  );
}
