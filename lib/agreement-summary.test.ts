/**
 * lib/agreement-summary.test.ts — Unit tests for the agreement-lifecycle
 * summary derivation behind the agreement card rows.
 */

import { describe, it, expect } from "vitest";
import {
  deriveAgreementSummary,
  type AgreementSummaryInput,
} from "./agreement-summary";

const originalFranchise: AgreementSummaryInput = {
  kind: "FRANCHISE",
  origin: "NEW",
  status: "SUPERSEDED",
  dateOfSigning: "2023-12-14T10:00:00.000Z",
  activatedAt: "2026-08-08T00:00:00.000Z", // backfilled adoption date
  createdAt: "2026-08-08T00:00:00.000Z",
  expiresAt: "2026-12-14T00:00:00.000Z",
  tenure: 36,
};

describe("deriveAgreementSummary", () => {
  it("returns an empty summary for no rows", () => {
    expect(deriveAgreementSummary(undefined)).toEqual({
      total: 0,
      joinedAt: null,
      latestRenewalAt: null,
      renewalCount: 0,
      activeExpiresAt: null,
      activeTenure: null,
    });
  });

  it("uses the historic signing date as joined, not the adoption/creation date", () => {
    const summary = deriveAgreementSummary([originalFranchise]);
    expect(summary.joinedAt).toBe("2023-12-14T10:00:00.000Z");
    expect(summary.renewalCount).toBe(0);
    expect(summary.latestRenewalAt).toBeNull();
  });

  it("keeps joined at the original agreement and reports the newest renewal", () => {
    const firstRenewal: AgreementSummaryInput = {
      kind: "FRANCHISE",
      origin: "RENEWAL",
      status: "SUPERSEDED",
      dateOfSigning: "2026-01-10T00:00:00.000Z",
      activatedAt: "2026-01-12T00:00:00.000Z",
      createdAt: "2025-12-01T00:00:00.000Z",
      expiresAt: "2027-01-12T00:00:00.000Z",
    };
    const secondRenewal: AgreementSummaryInput = {
      kind: "FRANCHISE",
      origin: "RENEWAL",
      status: "ACTIVE",
      dateOfSigning: "2027-01-05T00:00:00.000Z",
      activatedAt: "2027-01-08T00:00:00.000Z",
      createdAt: "2026-12-01T00:00:00.000Z",
      expiresAt: "2030-01-08T00:00:00.000Z",
      tenure: 36,
    };
    const summary = deriveAgreementSummary([
      originalFranchise,
      firstRenewal,
      secondRenewal,
    ]);
    expect(summary.joinedAt).toBe("2023-12-14T10:00:00.000Z");
    expect(summary.renewalCount).toBe(2);
    expect(summary.latestRenewalAt).toBe("2027-01-08T00:00:00.000Z");
    expect(summary.activeExpiresAt).toBe("2030-01-08T00:00:00.000Z");
    expect(summary.activeTenure).toBe(36);
    expect(summary.total).toBe(3);
  });

  it("dates a CI renewal by activation despite inherited (stale) signatures", () => {
    const ciOriginal: AgreementSummaryInput = {
      kind: "CI",
      origin: "NEW",
      status: "SUPERSEDED",
      dateOfSigning: "2024-02-01T00:00:00.000Z",
      activatedAt: "2024-02-01T00:00:00.000Z",
      createdAt: "2024-01-20T00:00:00.000Z",
    };
    const ciRenewal: AgreementSummaryInput = {
      kind: "CI",
      origin: "RENEWAL",
      status: "ACTIVE",
      // Signatures are carried over from the predecessor on CI renewals.
      dateOfSigning: "2024-02-01T00:00:00.000Z",
      activatedAt: "2026-02-01T00:00:00.000Z",
      createdAt: "2026-02-01T00:00:00.000Z",
      expiresAt: "2028-02-01T00:00:00.000Z",
      tenure: 24,
    };
    const summary = deriveAgreementSummary([ciOriginal, ciRenewal]);
    expect(summary.joinedAt).toBe("2024-02-01T00:00:00.000Z");
    expect(summary.latestRenewalAt).toBe("2026-02-01T00:00:00.000Z");
    expect(summary.activeExpiresAt).toBe("2028-02-01T00:00:00.000Z");
  });

  it("counts an unsigned scheduled renewal by its issue date", () => {
    const scheduled: AgreementSummaryInput = {
      kind: "FRANCHISE",
      origin: "RENEWAL",
      status: "DRAFT",
      dateOfSigning: null,
      activatedAt: null,
      createdAt: "2026-11-20T00:00:00.000Z",
    };
    const summary = deriveAgreementSummary([originalFranchise, scheduled]);
    expect(summary.renewalCount).toBe(1);
    expect(summary.latestRenewalAt).toBe("2026-11-20T00:00:00.000Z");
  });

  it("prefers FRANCHISE-kind rows over PROGRAM rows for joined and validity", () => {
    const activeFranchise: AgreementSummaryInput = {
      ...originalFranchise,
      status: "ACTIVE",
    };
    const olderProgram: AgreementSummaryInput = {
      kind: "PROGRAM",
      origin: "NEW",
      status: "ACTIVE",
      dateOfSigning: "2022-05-01T00:00:00.000Z",
      activatedAt: "2022-05-01T00:00:00.000Z",
      createdAt: "2022-05-01T00:00:00.000Z",
      expiresAt: "2031-05-01T00:00:00.000Z",
      tenure: 108,
    };
    const summary = deriveAgreementSummary([activeFranchise, olderProgram]);
    expect(summary.joinedAt).toBe("2023-12-14T10:00:00.000Z");
    expect(summary.activeExpiresAt).toBe("2026-12-14T00:00:00.000Z");
    expect(summary.activeTenure).toBe(36);
  });

  it("leaves joined null while nothing is signed or activated", () => {
    const pending: AgreementSummaryInput = {
      kind: "FRANCHISE",
      origin: "NEW",
      status: "APPROVED",
      dateOfSigning: null,
      activatedAt: null,
      createdAt: "2026-08-01T00:00:00.000Z",
    };
    const summary = deriveAgreementSummary([pending]);
    expect(summary.joinedAt).toBeNull();
    expect(summary.total).toBe(1);
  });
});
