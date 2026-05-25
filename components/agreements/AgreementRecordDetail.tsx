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
  Check,
  CreditCard,
  Download,
  ExternalLink,
  FileText,
  IndianRupee,
  Loader2,
  Mail,
  MapPin,
  Menu,
  PenLine,
  Phone,
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

        <TabsContent value="overview" className="space-y-3">
          {/* ── Top row: Franchisee | Centre | Franchise ── */}
          {(() => {
            const franchiseeName = String(data.franchisee?.name ?? franchiseData.contactPerson ?? "-");
            const nameParts = franchiseeName.split(/\s+/).filter(Boolean);
            const initials =
              nameParts.length >= 2
                ? (nameParts[0]![0]! + nameParts[1]![0]!).toUpperCase()
                : franchiseeName.slice(0, 2).toUpperCase();
            const sinceRaw = data.dateOfSigning ?? data.createdAt;
            const sinceLabel = sinceRaw
              ? (() => {
                  try { return format(parseISO(sinceRaw), "MMM yyyy"); } catch { return null; }
                })()
              : null;
            const franchiseStatus = data.franchise?.status;
            const centreCity = data.franchise?.city ?? "";
            const centreState = data.franchise?.state ?? "";
            const centreAddress = [
              data.franchise?.address ?? franchiseData.address,
              centreCity,
              centreState,
            ].filter(Boolean).join(", ");
            const commArea = String(data.franchisee?.communicationAddress ?? franchiseData.communicationAddress ?? "-");
            const programTag = String(data.program?.name ?? data.programName ?? data.programs?.[0]?.name ?? "") || null;
            const typeTag = String(data.franchise?.type ?? franchiseData.franchiseType ?? "") || null;
            const lifecycleBadge = agreementStatusBadge(data.status, data.signed);
            const createdSigned = !!(data.dateOfSigning);
            const timeLeft = (() => {
              if (!data.expiresAt) return "-";
              try {
                const ms = parseISO(data.expiresAt).getTime() - Date.now();
                if (ms <= 0) return "Expired";
                const months = Math.floor(ms / (1000 * 60 * 60 * 24 * 30.44));
                if (months < 12) return `${months}m`;
                const y = Math.floor(months / 12);
                const m = months % 12;
                return m > 0 ? `~${y}y ${m}m` : `~${y}y`;
              } catch { return "-"; }
            })();
            return (
              <>
                {/* ── Top row: Franchise+Centre | Franchisee+Signature ── */}
                <div className="grid gap-3 md:grid-cols-2">

                  {/* Left: Franchise + Centre */}
                  <Card className="rounded-xl">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* Franchise */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <FileText className="h-3.5 w-3.5" />
                            <span className="text-xs font-medium">Franchise</span>
                          </div>
                          <p className="text-lg font-semibold leading-tight">{String(franchiseData.name ?? "")}</p>
                          <div className="flex flex-wrap gap-1">
                            {programTag && <Badge variant="secondary" className="text-[10px]">{programTag}</Badge>}
                            {typeTag && <Badge variant="secondary" className="text-[10px]">{typeTag}</Badge>}
                            {data.type && <Badge variant="secondary" className="text-[10px]">{data.type}</Badge>}
                          </div>
                          <div className="pt-1 space-y-1.5">
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Code</p>
                              <p className="mt-0.5 rounded bg-muted px-1.5 py-1 font-mono text-xs break-all">{String(franchiseData.franchiseCode ?? "-")}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Applied</p>
                              <p className="text-xs mt-0.5 text-card-foreground">{fmtDate(String(franchiseData.date ?? ""))}</p>
                            </div>
                          </div>
                        </div>
                        {/* Centre location */}
                        <div className="border-t border-border pt-3 space-y-2">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" />
                            <span className="text-xs font-medium">Centre location</span>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Address</p>
                              <p className="text-xs mt-0.5 text-card-foreground">{centreAddress || "-"}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Communication Area</p>
                              <p className="text-xs mt-0.5 text-card-foreground">{commArea}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Right: Franchisee + Signature */}
                  <Card className="rounded-xl">
                    <CardContent className="p-4 space-y-3">
                      {/* Franchisee */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
                            {initials}
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{franchiseeName}</p>
                            <p className="text-xs text-muted-foreground">
                              Contact person{sinceLabel ? ` · since ${sinceLabel}` : ""}
                            </p>
                          </div>
                        </div>
                        {franchiseStatus && (
                          <Badge variant="secondary" className="shrink-0 text-xs">{franchiseStatus}</Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-border bg-muted/50">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Phone</p>
                            <p className="text-xs truncate">{String(data.franchisee?.phone ?? franchiseData.phone ?? "—")}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-border bg-muted/50">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Email</p>
                            <p className="text-xs truncate">{String(data.franchisee?.mail ?? franchiseData.email ?? "—")}</p>
                          </div>
                        </div>
                      </div>

                      {/* Signature */}
                      <div className="border-t border-border pt-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <PenLine className="h-3.5 w-3.5 text-muted-foreground" />
                            <p className="text-xs font-medium">Franchisee signature</p>
                          </div>
                          {(sigSrc || data.signed) && (
                            <Badge variant="outline" className="text-[10px] gap-1 border-emerald-200 text-emerald-700 bg-emerald-50 py-0">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              On file
                            </Badge>
                          )}
                        </div>
                        {sigSrc ? (
                          <div className="flex items-center justify-center rounded-lg border bg-muted/30 py-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={sigSrc} alt="Franchisee signature" className="max-h-14 w-auto max-w-full object-contain" />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center rounded-lg border bg-muted/30 py-3">
                            <p className="text-xs text-muted-foreground">
                              {data.signed ? "Stored on the franchisee profile" : "Not yet captured"}
                            </p>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Date of signing</p>
                            <p className="text-xs mt-0.5">{fmtDate(data.dateOfSigning)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Captured at</p>
                            <p className="text-xs mt-0.5">{fmtDate(data.franchiseeSignedAt)}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* ── Bottom row: Payment | Lifecycle ── */}
                <div className="grid gap-3 xl:grid-cols-[3fr,2fr] items-stretch">
                  <PaymentBreakdown
                    paymentDetails={franchiseData.paymentDetails}
                    hideRecurringFeesTable
                    className="h-full"
                  />

                  {/* Agreement lifecycle */}
                  <Card className="rounded-xl h-full">
                    <CardContent className="p-4 space-y-6 flex flex-col h-full">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                            <p className="font-semibold text-sm">Agreement lifecycle</p>
                          </div>
                          {data.tenure != null ? (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {data.tenure}-month tenure
                            </p>
                          ) : null}
                        </div>
                        <Badge variant={lifecycleBadge.tone} className="shrink-0">
                          {lifecycleBadge.label}
                        </Badge>
                      </div>

                      {/* Timeline */}
                      <div className="flex items-start">
                        <div className="flex flex-col items-center">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <Check className="h-4 w-4" />
                          </div>
                          <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Created</p>
                          <p className="text-xs font-medium text-center">{fmtShortDate(data.createdAt)}</p>
                          <p className="text-[11px] text-muted-foreground text-center">
                            {data.createdAt ? (() => { try { return format(parseISO(data.createdAt), "p"); } catch { return ""; } })() : ""}
                          </p>
                        </div>
                        <div className={cn("mt-4 flex-1 h-px", createdSigned ? "bg-primary" : "bg-border")} />
                        <div className="flex flex-col items-center">
                          <div className={cn("flex h-8 w-8 items-center justify-center rounded-full", createdSigned ? "bg-primary text-primary-foreground" : "border-2 border-border bg-background")}>
                            {createdSigned && <Check className="h-4 w-4" />}
                          </div>
                          <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Signed</p>
                          <p className="text-xs font-medium text-center">{fmtShortDate(data.dateOfSigning)}</p>
                          <p className="text-[11px] text-muted-foreground text-center">
                            {data.dateOfSigning ? (() => { try { return format(parseISO(data.dateOfSigning), "p"); } catch { return ""; } })() : ""}
                          </p>
                        </div>
                        <div className="mt-4 flex-1 h-px bg-border" />
                        <div className="flex flex-col items-center">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-border bg-background" />
                          <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Expires</p>
                          <p className="text-xs font-medium text-center">{fmtShortDate(data.expiresAt ?? null)}</p>
                          <p className="text-[11px] text-muted-foreground text-center">
                            {data.expiresAt ? (() => { try { return format(parseISO(data.expiresAt), "p"); } catch { return ""; } })() : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex-1" />
                      <div className="grid grid-cols-2 gap-2 border-t border-border pt-4">
                        <SimpleFactRow label="Last updated" value={data.updatedAt ? fmtShortDate(data.updatedAt) : "—"} />
                        <SimpleFactRow label="Time remaining" value={timeLeft} />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            );
          })()}
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
            executedAt={data.franchiseeSignedAt ?? data.dateOfSigning}
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

function LevelRoyaltyCard({
  label,
  sublabel,
  level,
  gstExclusive,
}: {
  label: string;
  sublabel: string;
  level: AgreementScheduleBView["level1"];
  gstExclusive: boolean;
}) {
  const ipaGst =
    gstExclusive && level.ipaShare > 0
      ? Math.round(level.ipaShare * 0.18 * 100) / 100
      : 0;
  const ipaPayable = level.ipaShare + ipaGst;

  const franchiseeTotal = level.franchiseShare * level.months;
  const ciTotal = level.ciShare * level.months;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">{label}</p>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
              {level.months} MO
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{sublabel}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
            Term Fee
          </p>
          <p className="text-xl font-bold tabular-nums">{money(level.termFees)}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <p className="text-xs text-muted-foreground">Franchisee</p>
          <p className="font-semibold tabular-nums text-sm">{money(franchiseeTotal)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">CI</p>
          <p className="font-semibold tabular-nums text-sm">{money(ciTotal)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">IPA</p>
          <p className="font-semibold tabular-nums text-sm">
            {money(gstExclusive ? ipaPayable : level.ipaShare)}
          </p>
          {gstExclusive && level.ipaShare > 0 ? (
            <p className="text-[11px] text-muted-foreground leading-tight">
              {money(level.ipaShare)} + GST {money(ipaGst)}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ScheduleBCard({
  data,
  signatureSrc,
  executedAt,
  loading,
  onDownload,
}: {
  data: AgreementScheduleBView | null;
  signatureSrc: string | null;
  executedAt?: string | null;
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

  const feePayable = getFranchiseFeePayable(data.franchiseFee, data.gstFranchiseFee);
  const materialPayable = getFranchiseFeePayable(data.materialCost, false);

  const executedAtFmt = executedAt
    ? (() => {
        try {
          const d = parseISO(executedAt);
          return format(d, "d MMMM yyyy, h:mm a");
        } catch {
          return executedAt;
        }
      })()
    : null;

  const franchiseeInitials = (data.franchiseeName ?? "")
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w[0] ?? "")
    .join("")
    .toUpperCase();

  return (
    <Card className="overflow-hidden rounded-2xl border-border shadow-sm">
      {/* Header */}
      <CardHeader className="border-b border-border bg-accent/30 p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-xl font-normal">Schedule B</CardTitle>
              <Badge variant="outline" className="text-[10px] tracking-widest uppercase px-2">
                Annexure · Commercials
              </Badge>
            </div>
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
        {/* Commercial terms + Parties */}
        <div className="grid md:grid-cols-[3fr,2fr] overflow-hidden rounded-xl border border-border">
          <div className="p-4 space-y-3">
            <div className="flex items-baseline justify-between">
              <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">
                Commercial Terms
              </p>
              {data.effectiveDate && (
                <p className="text-xs text-muted-foreground">
                  Effective{" "}
                  <span className="font-medium text-foreground">
                    {fmtShortDate(data.effectiveDate)}
                  </span>
                </p>
              )}
            </div>
            <div>
              <p className="text-3xl font-bold tabular-nums tracking-tight">
                {money(data.franchiseFee)}
              </p>
              <p className="text-sm text-muted-foreground">franchise fee</p>
            </div>
            {!feePayable.inclusive && (
              <p className="text-sm text-muted-foreground">
                + 18% GST{" "}
                <span className="text-foreground font-medium">{money(feePayable.gst)}</span>
                {" · "}total payable{" "}
                <span className="text-foreground font-medium">{money(feePayable.payable)}</span>
              </p>
            )}
            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border">
              <div>
                <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">
                  Tenure
                </p>
                <p className="font-semibold mt-0.5">
                  {data.tenureMonths}{" "}
                  <span className="font-normal text-sm text-muted-foreground">months</span>
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">
                  Registration
                </p>
                <p className="font-semibold mt-0.5 tabular-nums">{money(data.kitCost)}</p>
                <p className="text-xs text-muted-foreground">one-time</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">
                  Material Kit
                </p>
                <p className="font-semibold mt-0.5 tabular-nums">{money(data.materialCost)}</p>
                {!data.gstMaterialCost && (
                  <p className="text-xs text-muted-foreground">+ GST {money(materialPayable.gst)}</p>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 border-t md:border-t-0 md:border-l border-border bg-muted/20 space-y-2">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">
              Parties
            </p>
            <div className="flex items-start gap-3 pt-1">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
                IPA
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  Franchisor
                </p>
                <p className="font-medium text-sm">{data.centreName}</p>
                <p className="text-xs text-muted-foreground">{data.centreAddress}</p>
              </div>
            </div>
            <div className="ml-4 flex items-center gap-2 py-0.5">
              <div className="w-px h-4 bg-border" />
              <p className="text-[10px] text-muted-foreground tracking-wide">↕ AGREEMENT</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted border border-border text-xs font-bold text-muted-foreground">
                {franchiseeInitials || "??"}
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  Franchisee
                </p>
                <p className="font-medium text-sm">{data.franchiseeName}</p>
                <p className="text-xs text-muted-foreground">{data.franchiseeAddress}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Royalty breakup */}
        <Card className="rounded-xl border-border bg-card shadow-none">
          <CardHeader className="p-3 pb-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <IndianRupee className="h-4 w-4" />
                Royalty breakup
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                How each term fee is split between the three parties
              </p>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <LevelRoyaltyCard
                label="Level 1"
                sublabel="Initial onboarding tier"
                level={data.level1}
                gstExclusive={!data.gstRoyaltyInclusive}
              />
              <LevelRoyaltyCard
                label="Level 2 onwards"
                sublabel="Steady-state tier"
                level={data.level2}
                gstExclusive={!data.gstRoyaltyInclusive}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Term fees, franchisee share and CI share are not subject to GST. The IPA share is
              shown net of 18% GST; the payable amount adds GST on top.
            </p>
          </CardContent>
        </Card>

        {/* Execution & signatures */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-base font-semibold">Execution &amp; signatures</h3>
              <p className="text-sm text-muted-foreground">
                Both parties have executed this agreement.
              </p>
            </div>
            {executedAtFmt && (
              <Badge className="text-xs gap-1.5 shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                Executed · {executedAtFmt}
              </Badge>
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Card className="rounded-xl border-border shadow-none">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">
                    Franchisor Signatory
                  </p>
                  <Badge className="text-[10px] px-2 py-0.5">
                    SIGNED
                  </Badge>
                </div>
                <div className="min-h-20 rounded-lg border bg-muted/30 flex items-center justify-center p-4">
                  <p
                    className="text-2xl italic font-light text-foreground/70"
                    style={{ fontFamily: "cursive" }}
                  >
                    {data.franchisorSignatory?.split(/\s+/).find((w) => w.length > 2) ??
                      data.franchisorSignatory}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-sm">{data.franchisorSignatory}</p>
                  <p className="text-xs text-muted-foreground">
                    Authorised signatory · {data.centreName}
                  </p>
                </div>
                {data.presenceWitnessName ? (
                  <div className="pt-2 border-t border-border">
                    <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mb-1">
                      Witness
                    </p>
                    <p className="text-sm font-medium">{data.presenceWitnessName}</p>
                    {data.presenceWitnessAddress && (
                      <p className="text-xs text-muted-foreground">{data.presenceWitnessAddress}</p>
                    )}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="rounded-xl border-border shadow-none">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">
                    Franchisee Signatory
                  </p>
                  {signatureSrc && (
                    <Badge className="text-[10px] px-2 py-0.5">
                      SIGNED
                    </Badge>
                  )}
                </div>
                {signatureSrc ? (
                  <div className="overflow-hidden rounded-lg border bg-muted/30 p-3 min-h-20 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={signatureSrc}
                      alt="Franchisee signature"
                      className="mx-auto max-h-20 w-auto max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="min-h-20 rounded-lg border bg-muted/30 flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">No signature preview available.</p>
                  </div>
                )}
                <div>
                  <p className="font-medium text-sm">{data.franchiseeName}</p>
                  <p className="text-xs text-muted-foreground">Franchisee</p>
                </div>
                <div className="pt-2 border-t border-border grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mb-0.5">
                      Address
                    </p>
                    <p className="text-sm">{data.franchiseeAddress}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mb-0.5">
                      Centre
                    </p>
                    <p className="text-sm">{data.centreName}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
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
