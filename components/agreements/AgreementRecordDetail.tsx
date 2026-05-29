"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { getProcessedAgreementContent } from "@/lib/agreementContent";
import {
  agreementSignatureSrc,
  downloadScheduleBPdfAdmin,
  downloadScheduleBPdfMine,
  getReceivablePlanMine,
  type AgreementRecord,
  type ReceivableInstallmentSummary,
  type ReceivableSummaryItem,
} from "@/services/agreement.service";
import {
  buildAgreementDetailFranchiseData,
} from "@/lib/agreement-page-terms";
import { getErrorMessage } from "@/lib/error-utils";
import { fmtDate } from "@/lib/date-utils";
import PaymentBreakdown from "@/app/franchisee/agreement/components/PaymentBreakdown";
import {
  Check,
  Download,
  FileText,
  Loader2,
  Mail,
  MapPin,
  PenLine,
  Phone,
  ShieldCheck,
} from "lucide-react";
import {
  fmtShortDate,
  agreementStatusBadge,
  isFullInstallmentSummary,
} from "@/components/agreements/record-detail/agreement-utils";
import { AgreementEmiScheduleCard } from "@/components/agreements/record-detail/AgreementEmiScheduleCard";
import { ScheduleBCard } from "@/components/agreements/record-detail/ScheduleBCard";
import type { ESignatureResult, ESignaturePadProps } from "@/components/esignature/ESignaturePad";

const ESignaturePad = dynamic<ESignaturePadProps>(
  () => import("@/components/esignature/ESignaturePad").then((m) => ({ default: m.ESignaturePad })),
  { ssr: false, loading: () => null },
);

// ── Local-only small helpers (not needed outside this file) ──────────────────

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

// ── Main export ───────────────────────────────────────────────────────────────

export function AgreementRecordDetail({
  data,
  onPayReceivableItem,
  isInitiatingReceivablePayment,
  onSign,
  onWaiveItem,
}: {
  data: AgreementRecord;
  onPayReceivableItem?: () => void;
  isInitiatingReceivablePayment?: boolean;
  onSign?: (result: ESignatureResult) => Promise<void>;
  onWaiveItem?: (item: ReceivableSummaryItem) => void;
}) {
  const pathname = usePathname();
  const isAdminContext = pathname?.startsWith("/admin") ?? false;
  const [schedulePdfLoading, setSchedulePdfLoading] = useState(false);
  const [eSignatureOpen, setESignatureOpen] = useState(false);
  const [signingBusy, setSigningBusy] = useState(false);
  const [fullReceivablePlan, setFullReceivablePlan] =
    useState<ReceivableInstallmentSummary | null>(null);
  const [fullReceivablePlanLoading, setFullReceivablePlanLoading] =
    useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["franchise-agreement", "financial-terms"]),
  );
  const [now] = useState(() => Date.now());

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
        ["Payment type", (payment.type ?? "-")],
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

  async function handleAdoptSignature(result: ESignatureResult) {
    if (!onSign) return;
    setSigningBusy(true);
    try {
      await onSign(result);
      setESignatureOpen(false);
    } finally {
      setSigningBusy(false);
    }
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
        onWaiveItem={onWaiveItem}
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
                const ms = parseISO(data.expiresAt).getTime() - now;
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
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
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
                            <img src={sigSrc} alt="Franchisee signature" className="max-h-14 w-auto max-w-full object-contain" loading="lazy" />
                          </div>
                        ) : onSign ? (
                          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border bg-muted/30 py-3">
                            <p className="text-xs text-muted-foreground">No signature on file</p>
                            <Button size="sm" variant="outline" onClick={() => setESignatureOpen(true)} className="gap-1.5">
                              <PenLine className="h-3.5 w-3.5" />
                              Add Signature
                            </Button>
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
      {onSign && (
        <ESignaturePad
          open={eSignatureOpen}
          onOpenChange={setESignatureOpen}
          defaultName={String(data.franchisee?.name ?? "")}
          onAdopt={handleAdoptSignature}
          submitting={signingBusy}
        />
      )}
    </div>
  );
}
