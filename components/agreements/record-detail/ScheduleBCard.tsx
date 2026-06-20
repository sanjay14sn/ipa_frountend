"use client";

import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getFranchiseFeePayable } from "@/lib/gst";
import { formatRupees } from "@/lib/currency-utils";
import { type AgreementScheduleBView } from "@/services/agreement.service";
import { Download, IndianRupee, Loader2 } from "lucide-react";
import { type LucideIcon } from "lucide-react";
import { fmtShortDate } from "@/components/agreements/record-detail/agreement-utils";

// ── OverviewPanel ─────────────────────────────────────────────────────────────

function OverviewPanel({
  title,
  rows,
  icon: Icon,
  className,
}: {
  title: string;
  rows: Array<[string, string]>;
  icon: LucideIcon;
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

// ── LevelRoyaltyCard ──────────────────────────────────────────────────────────

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
          <p className="text-xl font-semibold tabular-nums">{formatRupees(level.termFees)}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <p className="text-xs text-muted-foreground">Franchisee</p>
          <p className="font-semibold tabular-nums text-sm">{formatRupees(franchiseeTotal)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">CI</p>
          <p className="font-semibold tabular-nums text-sm">{formatRupees(ciTotal)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">IPA</p>
          <p className="font-semibold tabular-nums text-sm">
            {formatRupees(gstExclusive ? ipaPayable : level.ipaShare)}
          </p>
          {gstExclusive && level.ipaShare > 0 ? (
            <p className="text-[11px] text-muted-foreground leading-tight">
              {formatRupees(level.ipaShare)} + GST {formatRupees(ipaGst)}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ── ScheduleBCard ─────────────────────────────────────────────────────────────

export function ScheduleBCard({
  data,
  signatureSrc,
  executedAt,
  loading,
  onDownload,
  downloadDisabled = false,
  downloadDisabledTitle,
}: {
  data: AgreementScheduleBView | null;
  signatureSrc: string | null;
  executedAt?: string | null;
  loading: boolean;
  /** When omitted and `downloadDisabled` is false, the Download PDF action is hidden. */
  onDownload?: () => void;
  /** Franchisee: disabled while franchise-fee receivables are still pending. */
  downloadDisabled?: boolean;
  downloadDisabledTitle?: string;
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
          {onDownload || downloadDisabled ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading || downloadDisabled}
              onClick={onDownload}
              title={downloadDisabled ? downloadDisabledTitle : undefined}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Download PDF
            </Button>
          ) : null}
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
              <p className="text-3xl font-semibold tabular-nums tracking-tight">
                {formatRupees(data.franchiseFee)}
              </p>
              <p className="text-sm text-muted-foreground">franchise fee</p>
            </div>
            {!feePayable.inclusive && (
              <p className="text-sm text-muted-foreground">
                + 18% GST{" "}
                <span className="text-foreground font-medium">{formatRupees(feePayable.gst)}</span>
                {" · "}total payable{" "}
                <span className="text-foreground font-medium">{formatRupees(feePayable.payable)}</span>
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
                <p className="font-semibold mt-0.5 tabular-nums">{formatRupees(data.kitCost)}</p>
                <p className="text-xs text-muted-foreground">one-time</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">
                  Material Kit
                </p>
                <p className="font-semibold mt-0.5 tabular-nums">{formatRupees(data.materialCost)}</p>
                {!data.gstMaterialCost && (
                  <p className="text-xs text-muted-foreground">+ GST {formatRupees(materialPayable.gst)}</p>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 border-t md:border-t-0 md:border-l border-border bg-muted/20 space-y-2">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">
              Parties
            </p>
            <div className="flex items-start gap-3 pt-1">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-semibold">
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
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted border border-border text-xs font-semibold text-muted-foreground">
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
                    className="text-2xl italic font-normal text-foreground/70"
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
                      loading="lazy"
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
