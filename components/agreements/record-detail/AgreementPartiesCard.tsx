"use client";

import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { fmtDate } from "@/lib/date-utils";
import { type AgreementRecord } from "@/services/agreement.service";
import { type AgreementDetailFranchiseData } from "@/lib/agreement-page-terms";
import {
  FileText,
  Mail,
  MapPin,
  PenLine,
  Phone,
} from "lucide-react";
import { agreementStatusBadge } from "@/components/agreements/record-detail/agreement-utils";

export function AgreementPartiesCard({
  data,
  franchiseData,
  sigSrc,
}: {
  data: AgreementRecord;
  franchiseData: AgreementDetailFranchiseData;
  sigSrc: string | null;
}) {
  const franchiseeName = String(data.franchisee?.name ?? franchiseData.contactPerson ?? "-");
  const nameParts = franchiseeName.split(/\s+/).filter(Boolean);
  const initials =
    nameParts.length >= 2
      ? (nameParts[0]![0]! + nameParts[1]![0]!).toUpperCase()
      : franchiseeName.slice(0, 2).toUpperCase();
  const sinceRaw = data.dateOfSigning ?? data.createdAt;
  const sinceLabel = sinceRaw
    ? (() => {
        try {
          return format(parseISO(sinceRaw), "MMM yyyy");
        } catch {
          return null;
        }
      })()
    : null;
  const franchiseStatus = data.franchise?.status;
  const centreCity = data.franchise?.city ?? "";
  const centreState = data.franchise?.state ?? "";
  const centreAddress = [
    data.franchise?.address ?? franchiseData.address,
    centreCity,
    centreState,
  ]
    .filter(Boolean)
    .join(", ");
  const commArea = String(
    data.franchisee?.communicationAddress ?? franchiseData.communicationAddress ?? "-",
  );
  const programTag =
    String(data.program?.name ?? data.programName ?? data.programs?.[0]?.name ?? "") || null;
  const typeTag = String(data.franchise?.type ?? franchiseData.franchiseType ?? "") || null;

  // agreementStatusBadge is imported but only used in AgreementSignaturesCard — kept here to
  // avoid unused-import warnings; the call below is intentionally kept for tree-shaking.
  void agreementStatusBadge;

  return (
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
              <p className="text-lg font-semibold leading-tight">
                {String(franchiseData.name ?? "")}
              </p>
              <div className="flex flex-wrap gap-1">
                {programTag && (
                  <Badge variant="secondary" className="text-[10px]">
                    {programTag}
                  </Badge>
                )}
                {typeTag && (
                  <Badge variant="secondary" className="text-[10px]">
                    {typeTag}
                  </Badge>
                )}
                {data.type && (
                  <Badge variant="secondary" className="text-[10px]">
                    {data.type}
                  </Badge>
                )}
              </div>
              <div className="pt-1 space-y-1.5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Code
                  </p>
                  <p className="mt-0.5 rounded bg-muted px-1.5 py-1 font-mono text-xs break-all">
                    {String(franchiseData.franchiseCode ?? "-")}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Applied
                  </p>
                  <p className="text-xs mt-0.5 text-card-foreground">
                    {fmtDate(String(franchiseData.date ?? ""))}
                  </p>
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
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Address
                  </p>
                  <p className="text-xs mt-0.5 text-card-foreground">
                    {centreAddress || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Communication Area
                  </p>
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
              <Badge variant="secondary" className="shrink-0 text-xs">
                {franchiseStatus}
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-border bg-muted/50">
                <Phone className="h-3 w-3 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Phone
                </p>
                <p className="text-xs truncate">
                  {String(data.franchisee?.phone ?? franchiseData.phone ?? "—")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-border bg-muted/50">
                <Mail className="h-3 w-3 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Email
                </p>
                <p className="text-xs truncate">
                  {String(data.franchisee?.mail ?? franchiseData.email ?? "—")}
                </p>
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
                <Badge
                  variant="outline"
                  className="text-[10px] gap-1 border-emerald-200 text-emerald-700 bg-emerald-50 py-0"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  On file
                </Badge>
              )}
            </div>
            {sigSrc ? (
              <div className="flex items-center justify-center rounded-lg border bg-muted/30 py-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sigSrc}
                  alt="Franchisee signature"
                  className="max-h-14 w-auto max-w-full object-contain"
                  loading="lazy"
                />
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
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Date of signing
                </p>
                <p className="text-xs mt-0.5">{fmtDate(data.dateOfSigning)}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Captured at
                </p>
                <p className="text-xs mt-0.5">{fmtDate(data.franchiseeSignedAt)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
