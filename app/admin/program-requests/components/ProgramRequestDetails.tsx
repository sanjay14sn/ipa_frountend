"use client";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DetailCard,
  DetailField,
  DetailFieldsGrid,
  ExpandedDetailSection,
  ExpandedDetailSurface,
  StatusBadge,
  type StatusTone,
} from "@/components/shared";
import type { ProgramRequestRow } from "@/services/franchise.service";

interface ProgramRequestDetailsProps {
  request: ProgramRequestRow;
}

function getStatusTone(status: string): StatusTone {
  switch (status?.toLowerCase()) {
    case "active":
    case "approved":
      return "success";
    case "requested":
      return "info";
    case "termset":
    case "termsset":
    case "pendingsignature":
    case "pending":
      return "warning";
    case "rejected":
      return "destructive";
    case "cancelled":
    case "canceled":
      return "neutral";
    default:
      return "neutral";
  }
}

function fmt(date: string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString();
}

export default function ProgramRequestDetails({
  request,
}: ProgramRequestDetailsProps) {
  const fe = request.franchisee;
  const franchise = request.franchise;
  const programName = request.program?.name ?? `Program #${request.programId}`;

  return (
    <ExpandedDetailSurface>
      <ExpandedDetailSection title="Franchisee information">
        <DetailFieldsGrid columns={3}>
          <DetailField label="Name" value={fe?.name ?? "—"} />
          <DetailField label="Email" value={fe?.mail ?? "—"} />
          <DetailField label="Phone" value={fe?.phone ?? "—"} />
        </DetailFieldsGrid>
      </ExpandedDetailSection>

      <Separator />

      <ExpandedDetailSection title="Request overview">
        <DetailFieldsGrid columns={3}>
          <DetailField label="Franchise" value={franchise?.name ?? request.franchiseId} />
          <DetailField label="Program" value={programName} />
          <DetailField
            label="Status"
            value={
              <StatusBadge
                tone={getStatusTone(request.status)}
                label={request.status}
              />
            }
          />
          <DetailField
            label="Location"
            value={[franchise?.city, franchise?.state].filter(Boolean).join(", ") || "—"}
          />
          <DetailField label="Request date" value={fmt(request.createdAt)} />
          <DetailField label="Franchise ID" value={request.franchiseId} span={2} />
        </DetailFieldsGrid>
      </ExpandedDetailSection>

      <Separator />

      <ExpandedDetailSection
        title="Program / approval context"
        description="Agreement terms are created during the approval flow, then sent for signature."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <DetailCard title="Requested program" meta="1 selected">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{programName}</Badge>
            </div>
          </DetailCard>

          <DetailCard title="Approval note">
            <DetailFieldsGrid columns={2}>
              <DetailField
                label="Program used for approval"
                value={programName}
              />
              <DetailField
                label="Agreement terms"
                value="Created when the admin approves the request"
              />
              <DetailField
                label="Signature flow"
                value="Triggered after terms are saved"
              />
              <DetailField
                label="Current request state"
                value={request.status ?? "Pending"}
              />
            </DetailFieldsGrid>
          </DetailCard>
        </div>
      </ExpandedDetailSection>
    </ExpandedDetailSurface>
  );
}
