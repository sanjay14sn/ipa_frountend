"use client";

import { type ReactNode, useMemo, useState } from "react";
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
import { CalendarDays, FileText, IndianRupee, PenLine, User } from "lucide-react";
import { ciAgreementContent } from "@/lib/ciAgreementContent";
import type { CIAgreementRecord } from "@/services/ci-training.service";

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

function fmtMoney(value?: number | null): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function packageCoverage(ids: number[]) {
  if (!ids.length) return "No levels";
  const sorted = [...ids].sort((a, b) => a - b);
  return `Levels ${sorted[0]} to ${sorted[sorted.length - 1]}`;
}

function phaseLabel(phase: string): string {
  if (phase === "PENDING_FRANCHISEE_SIGNATURE") return "Awaiting franchisee signature";
  if (phase === "SIGNED") return "Signed";
  if (phase === "EXPIRED") return "Expired";
  return "Awaiting CI signature";
}

interface CIAgreementDetailProps {
  agreement: CIAgreementRecord;
  packageSectionActions?: ReactNode;
  packageSectionContent?: ReactNode;
}

export function CIAgreementDetail({
  agreement,
  packageSectionActions,
  packageSectionContent,
}: CIAgreementDetailProps) {
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
  const packages = agreement.trainingPackages ?? [];

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden rounded-2xl border-border shadow-sm">
        <CardHeader className="border-b border-border bg-accent/30 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl text-card-foreground">Course Instructor Agreement</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Read-only agreement details and signing lifecycle.
              </p>
            </div>
            <Badge variant={agreement.phase === "SIGNED" ? "default" : "secondary"}>
              {phaseLabel(agreement.phase)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 sm:p-5">
          <StatCard label="Franchisee" value={agreement.franchisee?.name ?? "-"} icon={User} />
          <StatCard label="Centre" value={agreement.franchisee?.centreName ?? "-"} icon={FileText} />
          <StatCard label="Course Instructor" value={agreement.instructor?.name ?? "-"} icon={User} />
          <StatCard label="Validity" value={validity} icon={CalendarDays} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl border-border shadow-sm">
          <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-normal">
              <IndianRupee className="h-4 w-4" />
              Commercial terms
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-2 sm:p-5 sm:pt-2">
            <p className="text-sm text-muted-foreground">
              CI share per month: <span className="font-medium text-card-foreground">{fmtMoney(share)}</span>
            </p>
            <div className="rounded-xl border bg-background p-3 text-sm">
              <p className="font-medium text-card-foreground">Level 1</p>
              <p className="mt-1 text-muted-foreground">
                Duration: {l1} month(s) | Total: {fmtMoney(share * l1)}
              </p>
            </div>
            <div className="rounded-xl border bg-background p-3 text-sm">
              <p className="font-medium text-card-foreground">Level 2 onwards</p>
              <p className="mt-1 text-muted-foreground">
                Duration: {l2} month(s) per level | Total: {fmtMoney(share * l2)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border shadow-sm">
          <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-normal">
              <PenLine className="h-4 w-4" />
              Signature lifecycle
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-2 sm:p-5 sm:pt-2">
            <InfoRow label="CI signed at" value={fmtDate(agreement.ciSignedAt ?? agreement.dateOfSigning)} />
            <InfoRow label="Franchisee signed at" value={fmtDate(agreement.franchiseeSignedAt)} />
            <InfoRow label="Agreement phase" value={phaseLabel(agreement.phase)} />
            <InfoRow label="CI phone" value={agreement.instructor?.phone ?? "-"} />
            <InfoRow label="CI address" value={agreement.instructor?.address ?? "-"} />
            <InfoRow label="Centre address" value={agreement.franchisee?.centreAddress ?? "-"} />
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-border shadow-sm">
        <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg font-normal">Assigned training packages</CardTitle>
            {packageSectionActions ? (
              <div className="flex flex-wrap items-center gap-2">{packageSectionActions}</div>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-2 sm:p-5 sm:pt-2">
          {packageSectionContent ? (
            packageSectionContent
          ) : packages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No packages linked to this agreement.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead>Coverage</TableHead>
                    <TableHead className="text-right">Fee</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {packages
                    .slice()
                    .sort((a, b) => a.packageOrder - b.packageOrder)
                    .map((pkg) => (
                      <TableRow key={pkg.id}>
                        <TableCell>{pkg.packageOrder}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-card-foreground">{pkg.name}</span>
                            <span className="text-xs text-muted-foreground">{pkg.code}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {packageCoverage(pkg.trainingLevelIds)}
                        </TableCell>
                        <TableCell className="text-right">{fmtMoney(pkg.fee)}</TableCell>
                        <TableCell className="text-right">
                          {pkg.purchaseStatus === "PAID"
                            ? "Purchased"
                            : pkg.purchaseStatus === "PENDING"
                            ? "Pending"
                            : "Unpaid"}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border shadow-sm">
        <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg font-normal">Agreement terms</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExpanded(new Set(ciAgreementContent.sections.map((section) => section.id)))}
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
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof User;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-[11px] font-medium uppercase tracking-[0.08em]">
          {label}
        </span>
      </div>
      <p className="text-sm font-semibold text-card-foreground">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-2 text-sm last:border-b-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-card-foreground">{value}</span>
    </div>
  );
}
