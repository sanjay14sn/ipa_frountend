"use client";

import { useEffect, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  getProcessedAgreementContent,
  type AgreementContent,
} from "@/lib/agreementContent";
import {
  agreementSignatureSrc,
  downloadScheduleBPdfAdmin,
  downloadScheduleBPdfMine,
  getAdminAgreementContent,
  getFranchiseeAgreementContent,
  getReceivablePlanMine,
  type AgreementLinkedPayment,
  type AgreementRecord,
  type ReceivableInstallmentSummary,
  type ReceivableSummaryItem,
} from "@/services/agreement.service";
import {
  buildAgreementDetailFranchiseData,
} from "@/lib/agreement-page-terms";
import { getErrorMessage } from "@/lib/error-utils";
import { parseISO } from "date-fns";
import { formatDate, formatMonthYear } from "@/lib/date-utils";
import { getFranchiseFeePayable } from "@/lib/gst";
import { formatRupees } from "@/lib/currency-utils";
import { methodLabel } from "@/lib/payment-details-display";
import PaymentBreakdown from "@/components/agreements/PaymentBreakdown";
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
  Wallet,
} from "lucide-react";
import {
  fmtShortDate,
  agreementStatusBadge,
  getAgreementActionVisibility,
} from "@/components/agreements/record-detail/agreement-utils";
import { AgreementEmiScheduleCard } from "@/components/agreements/record-detail/AgreementEmiScheduleCard";
import { ScheduleBCard } from "@/components/agreements/record-detail/ScheduleBCard";
import type { ESignatureResult, ESignaturePadProps } from "@/components/esignature/ESignaturePad";
import { ContactPill, ContactPillGrid, FactCell, Timeline } from "@/components/shared";
import { SignatureDisplay } from "@/components/esignature/SignatureDisplay";

const ESignaturePad = dynamic<ESignaturePadProps>(
  () => import("@/components/esignature/ESignaturePad").then((m) => ({ default: m.ESignaturePad })),
  { ssr: false, loading: () => null },
);

// ── Local-only small helpers (not needed outside this file) ──────────────────

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

function ReadOnlyAgreementContent({
  title,
  description,
  sections,
  expandedSections,
  onToggleSection,
  onExpandAll,
  onCollapseAll,
  onDownloadPDF,
  downloadDisabled = false,
  downloadDisabledTitle,
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
  /** When omitted and `downloadDisabled` is false, the PDF download action is hidden. */
  onDownloadPDF?: () => void;
  downloadDisabled?: boolean;
  downloadDisabledTitle?: string;
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
            {onDownloadPDF || downloadDisabled ? (
              <Button
                onClick={onDownloadPDF}
                variant="outline"
                size="sm"
                className="rounded-lg border-border text-xs"
                disabled={loading || downloadDisabled}
                title={downloadDisabled ? downloadDisabledTitle : undefined}
              >
                {loading ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <Download className="mr-1 h-3 w-3" />
                )}
                PDF
              </Button>
            ) : null}
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
          {sections.map((section) => (
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
                    {section.title}
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

function formatTimeLeft(expiresAt: string | null | undefined, now: number): string {
  if (!expiresAt) return "-";
  try {
    const ms = parseISO(expiresAt).getTime() - now;
    if (ms <= 0) return "Expired";
    const months = Math.floor(ms / (1000 * 60 * 60 * 24 * 30.44));
    if (months < 12) return `${months}m`;
    const y = Math.floor(months / 12);
    const m = months % 12;
    return m > 0 ? `~${y}y ${m}m` : `~${y}y`;
  } catch {
    return "-";
  }
}

function formatTimePart(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function deriveInitials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function AgreementOverviewTab({
  data,
  franchiseData,
  onSign,
  linkedPayments,
  totalReceived,
  outstandingAmount,
  now,
}: {
  data: AgreementRecord;
  franchiseData: ReturnType<typeof buildAgreementDetailFranchiseData>;
  onSign?: (result: ESignatureResult) => Promise<void>;
  linkedPayments: AgreementLinkedPayment[];
  totalReceived: number;
  outstandingAmount: number | null;
  now: number;
}) {
  const [eSignatureOpen, setESignatureOpen] = useState(false);
  const [signingBusy, setSigningBusy] = useState(false);

  const sigSrc = agreementSignatureSrc(data);
  const franchiseeName = String(data.franchisee?.name ?? franchiseData.contactPerson ?? "-");
  const initials = deriveInitials(franchiseeName);
  const sinceRaw = data.dateOfSigning ?? data.createdAt;
  // Month-year "since" label is deliberately not a full date (SW-P3).
  const sinceLabel = formatMonthYear(sinceRaw);
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
  const timeLeft = formatTimeLeft(data.expiresAt, now);

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

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">

        <Card className="rounded-xl">
          <CardContent className="p-4">
            <div className="space-y-3">
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
                    <p className="text-xs mt-0.5 text-card-foreground">{formatDate(String(franchiseData.date ?? ""))}</p>
                  </div>
                </div>
              </div>
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

        <Card className="rounded-xl">
          <CardContent className="p-4 space-y-3">
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
            <ContactPillGrid>
              <ContactPill
                icon={Phone}
                label="Phone"
                value={String(data.franchisee?.phone ?? franchiseData.phone ?? "—")}
              />
              <ContactPill
                icon={Mail}
                label="Email"
                value={String(data.franchisee?.mail ?? franchiseData.email ?? "—")}
              />
            </ContactPillGrid>

            <div className="border-t border-border pt-3 space-y-2">
              <SignatureDisplay
                src={sigSrc ?? undefined}
                signerLabel="Franchisee signature"
                maxH="sm"
                onFile={Boolean(sigSrc || data.signed)}
                emptyContent={
                  onSign ? (
                    <>
                      <p className="text-xs text-muted-foreground">
                        No signature on file
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setESignatureOpen(true)}
                        className="gap-1.5"
                      >
                        <PenLine className="h-3.5 w-3.5" />
                        Add Signature
                      </Button>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {data.signed
                        ? "Stored on the franchisee profile"
                        : "Not yet captured"}
                    </p>
                  )
                }
              />
              <div className="grid grid-cols-2 gap-2">
                <FactCell
                  label="Date of signing"
                  value={formatDate(data.dateOfSigning)}
                />
                <FactCell
                  label="Captured at"
                  value={formatDate(data.franchiseeSignedAt)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 xl:grid-cols-[3fr,2fr] items-stretch">
        <PaymentBreakdown
          paymentDetails={franchiseData.paymentDetails}
          hideRecurringFeesTable
          className="h-full"
        />

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

            <Timeline
              stops={[
                {
                  label: "Created",
                  state: "done",
                  sublabel: fmtShortDate(data.createdAt),
                  meta: formatTimePart(data.createdAt),
                },
                {
                  label: "Signed",
                  state: createdSigned ? "done" : "upcoming",
                  sublabel: fmtShortDate(data.dateOfSigning),
                  meta: formatTimePart(data.dateOfSigning),
                },
                {
                  label: "Expires",
                  state: "upcoming",
                  sublabel: fmtShortDate(data.expiresAt ?? null),
                  meta: formatTimePart(data.expiresAt),
                },
              ]}
            />

            <div className="flex-1" />
            <div className="grid grid-cols-2 gap-2 border-t border-border pt-4">
              <FactCell label="Last updated" value={data.updatedAt ? fmtShortDate(data.updatedAt) : "—"} />
              <FactCell label="Time remaining" value={timeLeft} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-semibold">Payments received</p>
            <Badge variant="secondary" className="ml-auto text-xs">
              {linkedPayments.length}{" "}
              payment{linkedPayments.length === 1 ? "" : "s"}
            </Badge>
          </div>

          {linkedPayments.length === 0 ? (
            <p className="mt-3 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
              No payments recorded against this agreement.
            </p>
          ) : (
            <div className="mt-3 divide-y divide-border rounded-lg border border-border">
              {linkedPayments.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-card-foreground">
                      {formatDate(p.paidAt)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {methodLabel(p.method)}
                      {p.reference ? ` · ${p.reference}` : ""}
                    </p>
                  </div>
                  <span className="tabular-nums text-sm font-semibold text-card-foreground">
                    {formatRupees(p.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Total received
              </p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums text-card-foreground">
                {formatRupees(totalReceived)}
              </p>
            </div>
            {outstandingAmount != null ? (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Outstanding
                </p>
                <p
                  className={cn(
                    "mt-0.5 text-sm font-semibold tabular-nums",
                    outstandingAmount > 0
                      ? "text-primary"
                      : "text-emerald-600",
                  )}
                >
                  {formatRupees(outstandingAmount)}
                </p>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
      {onSign && (
        <ESignaturePad
          open={eSignatureOpen}
          onOpenChange={setESignatureOpen}
          defaultName={String(data.franchisee?.name ?? "")}
          onAdopt={handleAdoptSignature}
          submitting={signingBusy}
        />
      )}
    </>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function AgreementRecordDetail({
  data,
  onPayReceivableItem,
  isInitiatingReceivablePayment,
  onSign,
  onWaiveItem,
  onEditDueDate,
  isUpdatingDueDate,
  onRecordPayment,
  onSendReminder,
  actionBar,
}: {
  data: AgreementRecord;
  onPayReceivableItem?: () => void;
  isInitiatingReceivablePayment?: boolean;
  onSign?: (result: ESignatureResult) => Promise<void>;
  onWaiveItem?: (item: ReceivableSummaryItem) => void;
  onEditDueDate?: (itemId: number, dueAtISO: string) => Promise<void>;
  isUpdatingDueDate?: boolean;
  /** Admin-only: record an offline payment against an EMI item. */
  onRecordPayment?: (item: ReceivableSummaryItem) => void;
  /** Admin-only: send a manual reminder for a due/overdue EMI item. */
  onSendReminder?: (item: ReceivableSummaryItem) => void;
  /**
   * Optional context-aware action toolbar rendered above the EMI card. The
   * admin surface composes `<AgreementActionBar />` here; franchisee callers
   * omit it, so their detail renders unchanged.
   */
  actionBar?: ReactNode;
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
  const [now] = useState(() => Date.now());

  const sigSrc = agreementSignatureSrc(data);
  const franchiseData = buildAgreementDetailFranchiseData(data);
  // Render the document that reflects this agreement. The backend resolves the
  // legal text (all `{token}`s already replaced) from the agreement's linked
  // template version; we seed with the default and refine on fetch.
  const [agreementContent, setAgreementContent] = useState<AgreementContent>(
    () => getProcessedAgreementContent(franchiseData),
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const resolved = isAdminContext
          ? await getAdminAgreementContent(data.id)
          : await getFranchiseeAgreementContent(data.id);
        if (cancelled) return;
        // Re-running token replacement on already-resolved text is a harmless
        // no-op and keeps section sorting consistent.
        setAgreementContent(
          resolved
            ? getProcessedAgreementContent(franchiseData, resolved)
            : getProcessedAgreementContent(franchiseData),
        );
      } catch {
        if (!cancelled) {
          setAgreementContent(getProcessedAgreementContent(franchiseData));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // franchiseData is derived from `data` each render; key the effect on the
    // identifying fields rather than the fresh object reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.id, isAdminContext]);
  const installmentSummary =
    fullReceivablePlan ??
    data.receivables?.installmentSummary ??
    data.receivables?.paymentSummary ??
    null;

  const linkedPayments: AgreementLinkedPayment[] = data.payments ?? [];
  const totalReceived = linkedPayments.reduce(
    (acc, p) => acc + (Number(p.amount) || 0),
    0,
  );
  const feePayable =
    data.franchiseFee != null
      ? getFranchiseFeePayable(data.franchiseFee, data.gstFranchiseFee)
      : null;
  const outstandingAmount =
    feePayable != null ? Math.max(0, feePayable.payable - totalReceived) : null;
  const actionVisibility = getAgreementActionVisibility(
    data,
    isAdminContext ? "admin" : "franchisee",
  );
  const canDownloadScheduleB = actionVisibility.download;
  const scheduleBDownloadDisabledTitle =
    "Complete pending franchise fee payments to download Schedule B";

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
      {actionBar}

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
        onEditDueDate={onEditDueDate}
        isUpdatingDueDate={isUpdatingDueDate}
        onRecordPayment={onRecordPayment}
        onSendReminder={onSendReminder}
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
          <AgreementOverviewTab
            data={data}
            franchiseData={franchiseData}
            onSign={onSign}
            linkedPayments={linkedPayments}
            totalReceived={totalReceived}
            outstandingAmount={outstandingAmount}
            now={now}
          />
        </TabsContent>

        <TabsContent value="agreement">
          <ReadOnlyAgreementContent
            title={agreementContent.title}
            description={agreementContent.description}
            expandedSections={expandedSections}
            onToggleSection={toggleSection}
            onExpandAll={expandAllSections}
            onCollapseAll={collapseAllSections}
            onDownloadPDF={
              canDownloadScheduleB
                ? () => void handleDownloadScheduleB()
                : undefined
            }
            downloadDisabled={!isAdminContext && !canDownloadScheduleB}
            downloadDisabledTitle={scheduleBDownloadDisabledTitle}
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
            onDownload={
              canDownloadScheduleB
                ? () => void handleDownloadScheduleB()
                : undefined
            }
            downloadDisabled={!isAdminContext && !canDownloadScheduleB}
            downloadDisabledTitle={scheduleBDownloadDisabledTitle}
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
