"use client";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DetailCard,
  DetailField,
  DetailFieldsGrid,
  ExpandedDetailSection,
  ExpandedDetailSurface,
} from "@/components/shared";
import type { ProgramRequestRow } from "@/services/franchise.service";

interface ProgramRequestDetailsProps {
  request: ProgramRequestRow;
}

function statusTone(status: string): string {
  switch (status?.toLowerCase()) {
    case "active":
      return "bg-green-100 text-green-800 border-green-200";
    case "requested":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "termset":
    case "termsset":
    case "pendingsignature":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "rejected":
      return "bg-red-100 text-red-800 border-red-200";
    case "cancelled":
      return "bg-gray-100 text-gray-600 border-gray-200";
    default:
      return "bg-gray-100 text-gray-600 border-gray-200";
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
              <Badge className={`${statusTone(request.status)} border text-xs`}>
                {request.status}
              </Badge>
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
                value={request.status ?? "Requested"}
              />
            </DetailFieldsGrid>
          </DetailCard>
        </div>
      </ExpandedDetailSection>
    </ExpandedDetailSurface>
  );
}
