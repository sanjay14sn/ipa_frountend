/**
 * lib/agreement-summary.ts — Derives the agreement-lifecycle summary shown on
 * the card row above agreement lists (admin franchise detail, franchisee
 * "My agreements", CI portal).
 *
 * The input is structural (plain string dates) so the same helper serves
 * `AgreementRecord` rows and the CI portal's `history` entries.
 */

export interface AgreementSummaryInput {
  kind?: string | null;
  origin?: string | null;
  status?: string | null;
  dateOfSigning?: string | null;
  activatedAt?: string | null;
  createdAt?: string | null;
  expiresAt?: string | null;
  tenure?: number | null;
}

export interface AgreementSummary {
  total: number;
  /** Earliest signing/activation date — "when they joined". Null until a first agreement is signed. */
  joinedAt: string | null;
  /** When the most recent renewal took effect (or was issued, for unsigned drafts). */
  latestRenewalAt: string | null;
  renewalCount: number;
  /** Expiry of the current ACTIVE agreement. */
  activeExpiresAt: string | null;
  /** Tenure (months) of that same ACTIVE agreement. */
  activeTenure: number | null;
}

function toTime(value: string | null | undefined): number | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

/**
 * FRANCHISE-kind rows define the franchise lifecycle when present; PROGRAM
 * rows only stand in when there is no franchise agreement at all. CI history
 * entries are all CI-kind, so they pass through unchanged.
 */
function preferFranchiseKind(rows: AgreementSummaryInput[]) {
  const franchise = rows.filter((row) => row.kind === "FRANCHISE");
  return franchise.length > 0 ? franchise : rows;
}

export function deriveAgreementSummary(
  rows: readonly AgreementSummaryInput[] | null | undefined,
): AgreementSummary {
  const all = [...(rows ?? [])];

  // Joined: earliest signed (or activated) agreement. Signing dates are
  // preferred over activation so backfilled agreements keep their historic
  // signing date rather than the adoption date.
  let joinedAt: string | null = null;
  let joinedTime = Number.POSITIVE_INFINITY;
  const signedRows = all.filter((row) => row.dateOfSigning || row.activatedAt);
  for (const row of preferFranchiseKind(signedRows)) {
    const basis = row.dateOfSigning ?? row.activatedAt ?? null;
    const time = toTime(basis);
    if (time != null && time < joinedTime) {
      joinedTime = time;
      joinedAt = basis;
    }
  }

  // Renewals: activation comes first because CI renewals inherit their
  // predecessor's signatures (a stale dateOfSigning); unsigned scheduled
  // renewals fall back to their issue date (createdAt).
  const renewals = all.filter((row) => row.origin === "RENEWAL");
  let latestRenewalAt: string | null = null;
  let latestRenewalTime = Number.NEGATIVE_INFINITY;
  for (const row of renewals) {
    const basis = row.activatedAt ?? row.dateOfSigning ?? row.createdAt ?? null;
    const time = toTime(basis);
    if (time != null && time > latestRenewalTime) {
      latestRenewalTime = time;
      latestRenewalAt = basis;
    }
  }

  // Current validity: latest expiry among ACTIVE agreements.
  let activeExpiresAt: string | null = null;
  let activeTenure: number | null = null;
  let activeExpiryTime = Number.NEGATIVE_INFINITY;
  const activeRows = all.filter(
    (row) => row.status === "ACTIVE" && row.expiresAt,
  );
  for (const row of preferFranchiseKind(activeRows)) {
    const time = toTime(row.expiresAt);
    if (time != null && time > activeExpiryTime) {
      activeExpiryTime = time;
      activeExpiresAt = row.expiresAt ?? null;
      activeTenure = row.tenure ?? null;
    }
  }

  return {
    total: all.length,
    joinedAt,
    latestRenewalAt,
    renewalCount: renewals.length,
    activeExpiresAt,
    activeTenure,
  };
}
