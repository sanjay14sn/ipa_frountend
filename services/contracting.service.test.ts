import { describe, expect, it } from "vitest";
import {
  countPendingCISignatures,
  deriveCIGatePhase,
  type CIAgreementRecord,
} from "./contracting.service";

function agreement(over: Partial<CIAgreementRecord>): CIAgreementRecord {
  return {
    id: 1,
    title: "Course Instructor Agreement",
    phase: "SIGNED",
    status: "ACTIVE" as CIAgreementRecord["status"],
    tenure: 12,
    expiresAt: null,
    dateOfSigning: null,
    ciShare: null,
    levelDurations: { l1: 4, l2: 3 },
    franchisee: null,
    instructor: null,
    ...over,
  };
}

describe("deriveCIGatePhase", () => {
  it("returns null with no agreements (unchanged gate behavior)", () => {
    expect(deriveCIGatePhase([])).toBeNull();
  });

  it("single agreement: returns its phase VERBATIM — parity with the old gate", () => {
    for (const phase of [
      "SIGNED",
      "PENDING_CI_SIGNATURE",
      "PENDING_FRANCHISEE_SIGNATURE",
      "EXPIRED",
    ] as const) {
      expect(deriveCIGatePhase([agreement({ phase })])).toBe(phase);
    }
    // even a voided single agreement reports its phase, as before
    expect(
      deriveCIGatePhase([
        agreement({
          phase: "EXPIRED",
          status: "VOID" as CIAgreementRecord["status"],
        }),
      ]),
    ).toBe("EXPIRED");
  });

  it("several agreements: one signed keeps the portal open while a new attach waits", () => {
    expect(
      deriveCIGatePhase([
        agreement({ id: 1, phase: "SIGNED" }),
        agreement({
          id: 2,
          phase: "PENDING_CI_SIGNATURE",
          status: "APPROVED" as CIAgreementRecord["status"],
        }),
      ]),
    ).toBe("SIGNED");
  });

  it("several agreements: voided rows do not count toward the gate", () => {
    expect(
      deriveCIGatePhase([
        agreement({
          id: 1,
          phase: "SIGNED",
          status: "VOID" as CIAgreementRecord["status"],
        }),
        agreement({
          id: 2,
          phase: "PENDING_CI_SIGNATURE",
          status: "APPROVED" as CIAgreementRecord["status"],
        }),
      ]),
    ).toBe("PENDING_CI_SIGNATURE");
  });

  it("several pending agreements: reports the most-advanced phase", () => {
    expect(
      deriveCIGatePhase([
        agreement({
          id: 1,
          phase: "PENDING_CI_SIGNATURE",
          status: "APPROVED" as CIAgreementRecord["status"],
        }),
        agreement({
          id: 2,
          phase: "PENDING_FRANCHISEE_SIGNATURE",
          status: "APPROVED" as CIAgreementRecord["status"],
        }),
      ]),
    ).toBe("PENDING_FRANCHISEE_SIGNATURE");
  });
});

describe("countPendingCISignatures", () => {
  it("counts non-void agreements awaiting the CI's signature", () => {
    expect(
      countPendingCISignatures([
        agreement({ id: 1, phase: "SIGNED" }),
        agreement({
          id: 2,
          phase: "PENDING_CI_SIGNATURE",
          status: "APPROVED" as CIAgreementRecord["status"],
        }),
        agreement({
          id: 3,
          phase: "PENDING_CI_SIGNATURE",
          status: "VOID" as CIAgreementRecord["status"],
        }),
      ]),
    ).toBe(1);
  });
});
