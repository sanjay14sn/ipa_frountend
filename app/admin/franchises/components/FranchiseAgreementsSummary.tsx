"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AgreementRecord } from "@/services/agreement.service";
import {
  agreementOutstandingEmi,
  normalizeStatus,
  type BadgeTone,
  type NormalizedAgreementStatus,
} from "@/components/agreements/record-detail/agreement-utils";
import { formatRupees } from "@/lib/currency-utils";

const STATUS_BUCKETS: {
  status: NormalizedAgreementStatus;
  label: string;
  tone: BadgeTone;
}[] = [
  { status: "Valid", label: "Valid", tone: "default" },
  { status: "Approved", label: "Awaiting", tone: "secondary" },
  { status: "Draft", label: "Draft", tone: "outline" },
  { status: "Suspended", label: "Suspended", tone: "secondary" },
  { status: "Expired", label: "Expired", tone: "destructive" },
  { status: "Void", label: "Void", tone: "destructive" },
];

/**
 * Lightweight at-a-glance agreements panel for the franchise list expansion —
 * status counts + total outstanding EMI + a link into the full agreements
 * surface. Replaces the heavy inline workspace that used to render here.
 */
export function FranchiseAgreementsSummary({
  franchiseId,
  agreements,
}: {
  franchiseId: string;
  agreements: AgreementRecord[];
}) {
  if (agreements.length === 0) {
    return <p className="text-sm text-muted-foreground">No agreements on file.</p>;
  }

  const counts = agreements.reduce<Record<string, number>>((acc, agreement) => {
    const key = normalizeStatus(agreement.status);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const outstanding = agreements.reduce(
    (sum, agreement) => sum + agreementOutstandingEmi(agreement),
    0,
  );

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-sm font-medium">
          {agreements.length} agreement{agreements.length === 1 ? "" : "s"}
        </span>
        {STATUS_BUCKETS.filter((bucket) => counts[bucket.status]).map((bucket) => (
          <Badge key={bucket.status} variant={bucket.tone}>
            {counts[bucket.status]} {bucket.label}
          </Badge>
        ))}
      </div>

      <div className="text-sm text-muted-foreground">
        Outstanding EMI{" "}
        <span className="font-semibold tabular-nums text-card-foreground">
          {formatRupees(outstanding)}
        </span>
      </div>

      <Button asChild variant="outline" size="sm" className="ml-auto rounded-lg">
        <Link href={`/admin/franchise/${franchiseId}?tab=agreements`}>
          View agreements
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
