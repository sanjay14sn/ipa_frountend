"use client";

import { type ReactNode, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { parseISO } from "date-fns";
import { formatDate } from "@/lib/date-utils";
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
import { ContactPill, ContactPillGrid, FactCell, Timeline } from "@/components/shared";
import { SignatureDisplay } from "@/components/esignature/SignatureDisplay";

const ESignaturePad = dynamic<ESignaturePadProps>(
  () => import("@/components/esignature/ESignaturePad").then((m) => ({ default: m.ESignaturePad })),
  { ssr: false, loading: () => null },
);

function fmtTime(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
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
      agreement.tenure != null
        ? `${agreement.tenure}-month tenure`
        : "-",
    [agreement.tenure],
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
    if (!agreement.expiresAt) return "—";
    try {
      const ms = parseISO(agreement.expiresAt).getTime() - now;
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
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Phone</p>
                      <p className="text-xs truncate">{agreement.franchisee?.phone ?? "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-border bg-muted/50">
                      <Mail className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Email</p>
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
            <ContactPillGrid>
              <ContactPill
                icon={Phone}
                label="Phone"
                value={agreement.instructor?.phone ?? "—"}
              />
              <ContactPill
                icon={MapPin}
                label="Address"
                value={agreement.instructor?.address ?? "—"}
              />
            </ContactPillGrid>

            {/* Signature */}
            <div className="border-t border-border pt-3 space-y-2">
              <SignatureDisplay
                src={sigSrc ?? undefined}
                signerLabel="CI signature"
                maxH="sm"
                onFile={Boolean(sigSrc || ciSigned)}
                emptyContent={
                  onCISign ? (
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
                      {ciSigned ? "Stored on the CI profile" : "Not yet captured"}
                    </p>
                  )
                }
              />
              <div className="grid grid-cols-2 gap-2">
                <FactCell label="CI signed at" value={formatDate(ciSignedAt)} />
                <FactCell
                  label="Franchisee signed at"
                  value={formatDate(agreement.franchiseeSignedAt)}
                />
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
                {agreement.tenure != null ? (
                  <p className="text-xs text-muted-foreground mt-0.5">{validity}</p>
                ) : null}
              </div>
              <Badge variant={badge.tone} className="shrink-0">{badge.label}</Badge>
            </div>

            {/* Timeline */}
            <Timeline
              stops={[
                {
                  label: "CI Signed",
                  state: ciSigned ? "done" : "upcoming",
                  sublabel: formatDate(ciSignedAt),
                  meta: fmtTime(ciSignedAt),
                },
                {
                  label: "Franchisee Signed",
                  state: franchiseeSigned ? "done" : "upcoming",
                  sublabel: formatDate(agreement.franchiseeSignedAt),
                  meta: fmtTime(agreement.franchiseeSignedAt),
                },
                {
                  label: "Expires",
                  state: "upcoming",
                  sublabel: formatDate(agreement.expiresAt),
                  meta: fmtTime(agreement.expiresAt),
                },
              ]}
            />

            <div className="flex-1" />
            <div className="grid grid-cols-2 gap-2 border-t border-border pt-4">
              <FactCell label="Tenure" value={agreement.tenure != null ? `${agreement.tenure} months` : "—"} />
              <FactCell label="Time remaining" value={timeLeft} />
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

