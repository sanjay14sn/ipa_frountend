"use client";

import { type ReactNode, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Check,
  FileText,
  IndianRupee,
  Mail,
  MapPin,
  PenLine,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ciAgreementContent } from "@/lib/ciAgreementContent";
import type { CIAgreementRecord } from "@/services/ci-training.service";
import { ciSignatureSrc } from "@/services/ci-training.service";
import { formatRupees } from "@/lib/currency-utils";
import type { ESignatureResult, ESignaturePadProps } from "@/components/esignature/ESignaturePad";

const ESignaturePad = dynamic<ESignaturePadProps>(
  () => import("@/components/esignature/ESignaturePad").then((m) => ({ default: m.ESignaturePad })),
  { ssr: false, loading: () => null },
);

function fmtDate(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtShortDate(value?: string | null): string {
  if (!value) return "—";
  try {
    const d = typeof value === "string" ? parseISO(value) : new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return format(d, "PP");
  } catch {
    return String(value);
  }
}

function fmtTime(value?: string | null): string {
  if (!value) return "";
  try {
    return format(parseISO(value), "p");
  } catch {
    return "";
  }
}


type BadgeTone = "default" | "secondary" | "outline" | "destructive";

function phaseBadge(phase: string): { label: string; tone: BadgeTone } {
  if (phase === "PENDING_FRANCHISEE_SIGNATURE")
    return { label: "Awaiting franchisee signature", tone: "secondary" };
  if (phase === "SIGNED") return { label: "Signed", tone: "default" };
  if (phase === "EXPIRED") return { label: "Expired", tone: "destructive" };
  return { label: "Awaiting CI signature", tone: "secondary" };
}

interface CIAgreementDetailProps {
  agreement: CIAgreementRecord;
  packageSectionActions?: ReactNode;
  packageSectionContent?: ReactNode;
  hideAgreementTerms?: boolean;
  onCISign?: (result: ESignatureResult) => Promise<void>;
}

export function CIAgreementDetail({
  agreement,
  packageSectionActions,
  packageSectionContent,
  hideAgreementTerms,
  onCISign,
}: CIAgreementDetailProps) {
  const [now] = useState(() => Date.now());
  const [eSignatureOpen, setESignatureOpen] = useState(false);
  const [signingBusy, setSigningBusy] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(ciAgreementContent.sections.slice(0, 2).map((section) => section.id)),
  );

  const share = Number(agreement.ciShare ?? 0);
  const l1 = agreement.levelDurations?.l1 ?? 0;
  const l2 = agreement.levelDurations?.l2 ?? 0;
  const validity = useMemo(
    () =>
      agreement.validFrom && agreement.validUntil
        ? `${fmtDate(agreement.validFrom)} to ${fmtDate(agreement.validUntil)}`
        : "-",
    [agreement.validFrom, agreement.validUntil],
  );
  const receivables = agreement.receivables ?? [];
  const badge = phaseBadge(agreement.phase);

  const instructorName = agreement.instructor?.name ?? "—";
  const instructorInitials = (() => {
    const parts = instructorName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
    return instructorName.slice(0, 2).toUpperCase();
  })();

  const franchiseeName = agreement.franchisee?.name ?? "—";
  const franchiseeInitials = (() => {
    const parts = franchiseeName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
    return franchiseeName.slice(0, 2).toUpperCase();
  })();

  const ciSignedAt = agreement.ciSignedAt ?? agreement.dateOfSigning;
  const ciSigned = !!ciSignedAt;
  const franchiseeSigned = !!agreement.franchiseeSignedAt;
  const sigSrc = ciSignatureSrc(agreement.ciSignatureUrl);

  async function handleAdoptCISignature(result: ESignatureResult) {
    if (!onCISign) return;
    setSigningBusy(true);
    try {
      await onCISign(result);
      setESignatureOpen(false);
    } finally {
      setSigningBusy(false);
    }
  }

  const timeLeft = (() => {
    if (!agreement.validUntil) return "—";
    try {
      const ms = parseISO(agreement.validUntil).getTime() - now;
      if (ms <= 0) return "Expired";
      const months = Math.floor(ms / (1000 * 60 * 60 * 24 * 30.44));
      if (months < 12) return `${months}m`;
      const y = Math.floor(months / 12);
      const m = months % 12;
      return m > 0 ? `~${y}y ${m}m` : `~${y}y`;
    } catch {
      return "—";
    }
  })();

  return (
    <div className="space-y-4">
      {/* Top row: Centre + Franchisee | Course Instructor + Signature */}
      <div className="grid gap-3 md:grid-cols-2 items-stretch">
        {/* Left: Centre + Franchisee + Term */}
        <Card className="rounded-xl h-full">
          <CardContent className="p-4 flex flex-col h-full">
            <div className="space-y-3">
              {/* Centre */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">Centre</span>
                </div>
                <p className="text-lg font-semibold leading-tight">
                  {agreement.franchisee?.centreName ?? "—"}
                </p>
                <div className="pt-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Centre Address
                  </p>
                  <p className="text-xs mt-0.5 text-card-foreground">
                    {agreement.franchisee?.centreAddress ?? "—"}
                  </p>
                </div>
              </div>
              {/* Franchisee with avatar */}
              <div className="border-t border-border pt-3 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground text-sm font-semibold">
                    {franchiseeInitials}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{franchiseeName}</p>
                    <p className="text-xs text-muted-foreground">Franchisee</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-border bg-muted/50">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Phone</p>
                      <p className="text-xs truncate">{agreement.franchisee?.phone ?? "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-border bg-muted/50">
                      <Mail className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Email</p>
                      <p className="text-xs truncate">{agreement.franchisee?.mail ?? "—"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right: CI + Signature */}
        <Card className="rounded-xl">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
                  {instructorInitials}
                </div>
                <div>
                  <p className="font-semibold text-sm">{instructorName}</p>
                  <p className="text-xs text-muted-foreground">Course instructor</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-border bg-muted/50">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Phone</p>
                  <p className="text-xs truncate">{agreement.instructor?.phone ?? "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-border bg-muted/50">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Address</p>
                  <p className="text-xs truncate">{agreement.instructor?.address ?? "—"}</p>
                </div>
              </div>
            </div>

            {/* Signature */}
            <div className="border-t border-border pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <PenLine className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-xs font-medium">CI signature</p>
                </div>
                {(sigSrc || ciSigned) && (
                  <Badge variant="outline" className="text-[10px] gap-1 border-emerald-200 text-emerald-700 bg-emerald-50 py-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    On file
                  </Badge>
                )}
              </div>
              {sigSrc ? (
                <div className="flex items-center justify-center rounded-lg border bg-muted/30 py-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={sigSrc} alt="CI signature" className="max-h-14 w-auto max-w-full object-contain" loading="lazy" />
                </div>
              ) : onCISign ? (
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
                    {ciSigned ? "Stored on the CI profile" : "Not yet captured"}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    CI signed at
                  </p>
                  <p className="text-xs mt-0.5">{fmtDate(ciSignedAt)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Franchisee signed at
                  </p>
                  <p className="text-xs mt-0.5">{fmtDate(agreement.franchiseeSignedAt)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom row: Commercial terms | Lifecycle */}
      <div className="grid gap-3 xl:grid-cols-[3fr,2fr] items-stretch">
        {/* Commercial terms */}
        <Card className="rounded-xl h-full">
          <CardContent className="p-4 space-y-3 flex flex-col h-full">
            <div className="flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
              <p className="font-semibold text-sm">Commercial terms</p>
            </div>
            <p className="text-xs text-muted-foreground">
              CI earns <span className="font-medium text-foreground">{formatRupees(share)}</span> per month for the duration of each level.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <LevelEarningCard label="Level 1" months={l1} share={share} hint="Initial onboarding tier" />
              <LevelEarningCard label="Level 2 onwards" months={l2} share={share} hint="Steady-state tier" />
            </div>
            <div className="flex-1" />
            <p className="text-[11px] text-muted-foreground border-t border-border pt-3">
              CI share is paid per month for the active level. Totals shown are per level.
            </p>
          </CardContent>
        </Card>

        {/* Lifecycle */}
        <Card className="rounded-xl h-full">
          <CardContent className="p-4 space-y-6 flex flex-col h-full">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                  <p className="font-semibold text-sm">Agreement lifecycle</p>
                </div>
                {agreement.validFrom && agreement.validUntil ? (
                  <p className="text-xs text-muted-foreground mt-0.5">{validity}</p>
                ) : null}
              </div>
              <Badge variant={badge.tone} className="shrink-0">{badge.label}</Badge>
            </div>

            {/* Timeline */}
            <div className="flex items-start">
              <TimelineNode
                label="CI Signed"
                date={ciSignedAt}
                complete={ciSigned}
              />
              <TimelineConnector complete={franchiseeSigned} />
              <TimelineNode
                label="Franchisee Signed"
                date={agreement.franchiseeSignedAt}
                complete={franchiseeSigned}
              />
              <TimelineConnector complete={false} />
              <TimelineNode
                label="Expires"
                date={agreement.validUntil}
                complete={false}
              />
            </div>

            <div className="flex-1" />
            <div className="grid grid-cols-2 gap-2 border-t border-border pt-4">
              <SimpleFactRow label="Valid from" value={fmtShortDate(agreement.validFrom)} />
              <SimpleFactRow label="Time remaining" value={timeLeft} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Training receivables */}
      <Card className="rounded-2xl border-border shadow-sm">
        <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg font-normal">Training receivables</CardTitle>
            {packageSectionActions ? (
              <div className="flex flex-wrap items-center gap-2">{packageSectionActions}</div>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-2 sm:p-5 sm:pt-2">
          {packageSectionContent ? (
            packageSectionContent
          ) : receivables.length === 0 ? (
            <p className="text-sm text-muted-foreground">No receivables linked to this agreement.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Levels</TableHead>
                    <TableHead className="text-right">Fee</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receivables
                    .slice()
                    .sort((a, b) => a.receivableOrder - b.receivableOrder)
                    .map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.receivableOrder}</TableCell>
                        <TableCell className="font-medium text-card-foreground">{r.label}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {r.levelFrom} – {r.levelTo}
                        </TableCell>
                        <TableCell className="text-right">{formatRupees(r.fee)}</TableCell>
                        <TableCell className="text-right capitalize">{r.status}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Agreement terms */}
      {!hideAgreementTerms ? (
        <Card className="rounded-2xl border-border shadow-sm">
          <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg font-normal">Agreement terms</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setExpanded(new Set(ciAgreementContent.sections.map((section) => section.id)))
                  }
                >
                  Expand all
                </Button>
                <Button variant="outline" size="sm" onClick={() => setExpanded(new Set())}>
                  Collapse all
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 p-4 pt-2 sm:p-5 sm:pt-2">
            {ciAgreementContent.sections.map((section, index) => {
              const isOpen = expanded.has(section.id);
              return (
                <div key={section.id} className="rounded-xl border">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-2 text-left"
                    onClick={() =>
                      setExpanded((prev) => {
                        const next = new Set(prev);
                        if (next.has(section.id)) next.delete(section.id);
                        else next.add(section.id);
                        return next;
                      })
                    }
                  >
                    <span className="text-sm font-medium text-card-foreground">
                      {index + 1}. {section.title}
                    </span>
                    <span className="text-xs text-muted-foreground">{isOpen ? "Hide" : "Show"}</span>
                  </button>
                  {isOpen ? (
                    <div className="space-y-2 border-t bg-muted/30 px-3 py-3 text-sm text-card-foreground">
                      {section.points.map((point) => (
                        <p key={point.id}>{point.text}</p>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}
      {onCISign && (
        <ESignaturePad
          open={eSignatureOpen}
          onOpenChange={setESignatureOpen}
          defaultName={instructorName !== "—" ? instructorName : ""}
          onAdopt={handleAdoptCISignature}
          submitting={signingBusy}
        />
      )}
    </div>
  );
}

function LevelEarningCard({
  label,
  months,
  share,
  hint,
}: {
  label: string;
  months: number;
  share: number;
  hint: string;
}) {
  const total = months * share;
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">{label}</p>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
              {months} MO
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
            Total
          </p>
          <p className="text-xl font-semibold tabular-nums">{formatRupees(total)}</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {formatRupees(share)} × {months} {months === 1 ? "month" : "months"}
      </p>
    </div>
  );
}

function TimelineNode({
  label,
  date,
  complete,
}: {
  label: string;
  date?: string | null;
  complete: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full",
          complete
            ? "bg-primary text-primary-foreground"
            : "border-2 border-border bg-background",
        )}
      >
        {complete && <Check className="h-4 w-4" />}
      </div>
      <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="text-xs font-medium text-center">{fmtShortDate(date)}</p>
      <p className="text-[11px] text-muted-foreground text-center">{fmtTime(date)}</p>
    </div>
  );
}

function TimelineConnector({ complete }: { complete: boolean }) {
  return <div className={cn("mt-4 flex-1 h-px", complete ? "bg-primary" : "bg-border")} />;
}

function SimpleFactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium text-card-foreground">{value}</p>
    </div>
  );
}
