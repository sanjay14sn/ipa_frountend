"use client";

import { SummaryStatCard, SummaryStatGrid } from "@/components/shared";
import { formatDate } from "@/lib/date-utils";
import {
  deriveAgreementSummary,
  type AgreementSummaryInput,
} from "@/lib/agreement-summary";

export interface AgreementSummaryCardsProps {
  /**
   * Full (unfiltered) agreement list for the subject — `AgreementRecord` rows
   * on the admin/franchisee surfaces, `history` entries on the CI portal.
   */
  agreements: readonly AgreementSummaryInput[] | null | undefined;
}

const DATE_VALUE_CLASS = "text-lg font-semibold leading-snug";

/**
 * Lifecycle card row above agreement lists: when the partner joined, the most
 * recent renewal, current validity, and the total agreement count.
 */
export function AgreementSummaryCards({
  agreements,
}: AgreementSummaryCardsProps) {
  const summary = deriveAgreementSummary(agreements);
  const renewalDescription =
    summary.renewalCount === 0
      ? "No renewals issued"
      : `${summary.renewalCount} renewal${summary.renewalCount === 1 ? "" : "s"} issued`;

  return (
    <div data-testid="agreement-summary-cards">
      <SummaryStatGrid>
        <SummaryStatCard
          label="Joined"
          value={formatDate(summary.joinedAt)}
          description={
            summary.joinedAt
              ? "First agreement signed"
              : "No signed agreement yet"
          }
          valueClassName={DATE_VALUE_CLASS}
        />
        <SummaryStatCard
          label="Latest renewal"
          value={formatDate(summary.latestRenewalAt)}
          description={renewalDescription}
          valueClassName={DATE_VALUE_CLASS}
        />
        <SummaryStatCard
          label="Valid till"
          value={formatDate(summary.activeExpiresAt)}
          description={
            summary.activeExpiresAt
              ? summary.activeTenure
                ? `${summary.activeTenure}-month active term`
                : "Current active agreement"
              : "No active agreement"
          }
          valueClassName={DATE_VALUE_CLASS}
        />
        <SummaryStatCard
          label="Total agreements"
          value={summary.total}
          description="Including renewals"
        />
      </SummaryStatGrid>
    </div>
  );
}
