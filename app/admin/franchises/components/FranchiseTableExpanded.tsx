"use client";

import { Separator } from "@/components/ui/separator";
import {
  DetailField,
  DetailFieldsGrid,
  ExpandedDetailSection,
  ExpandedDetailSurface,
} from "@/components/shared";
import type { FranchiseData } from "@/services/franchisee.service";
import { FranchiseAgreementsWorkspace } from "@/app/admin/franchise/components/FranchiseAgreementsWorkspace";
import { formatDate } from "@/lib/date-utils";

function franchiseeMail(fe: FranchiseData["franchisee"]): string {
  if (!fe) return "-";
  const raw = fe as { mail?: string; email?: string };
  return raw.mail || raw.email || "-";
}

function programLabels(agreements: FranchiseData["agreements"]): string {
  const names = (agreements ?? [])
    .map((a) => a.programName ?? a.program?.name)
    .filter((name): name is string => Boolean(name?.trim()));
  return names.length > 0 ? [...new Set(names)].join(", ") : "-";
}

export function FranchiseTableExpanded({ item }: { item: FranchiseData }) {
  const franchisee = item.franchisee;
  const agreements = item.agreements ?? [];
  const location = [item.city, item.state].filter(Boolean).join(", ") || "-";

  return (
    <ExpandedDetailSurface>
      <ExpandedDetailSection title="Franchise overview">
        <DetailFieldsGrid columns={3}>
          <DetailField label="Type" value={item.type ?? "-"} />
          <DetailField label="Location" value={location} />
          <DetailField label="Created" value={formatDate(item.createdAt)} />
          <DetailField label="Programs" value={programLabels(agreements)} span={3} />
        </DetailFieldsGrid>
      </ExpandedDetailSection>

      <Separator />

      <ExpandedDetailSection title="Franchisee information">
        <DetailFieldsGrid columns={3}>
          <DetailField label="Name" value={franchisee?.name ?? "-"} />
          <DetailField label="Email" value={franchiseeMail(franchisee)} />
          <DetailField label="Phone" value={franchisee?.phone ?? "-"} />
          <DetailField
            label="Date of birth"
            value={franchisee?.dob ? String(franchisee.dob).slice(0, 10) : "-"}
          />
          <DetailField label="Blood group" value={franchisee?.bloodGroup ?? "-"} />
          <DetailField
            label="Communication address"
            value={franchisee?.communicationAddress ?? "-"}
            span={3}
          />
          <DetailField label="Education" value={franchisee?.education ?? "-"} />
          <DetailField label="Occupation" value={franchisee?.occupation ?? "-"} />
          <DetailField label="Reference" value={franchisee?.reference ?? "-"} />
        </DetailFieldsGrid>
      </ExpandedDetailSection>

      <Separator />

      <ExpandedDetailSection title="Agreement & financial terms">
        <FranchiseAgreementsWorkspace agreements={agreements} />
      </ExpandedDetailSection>
    </ExpandedDetailSurface>
  );
}
