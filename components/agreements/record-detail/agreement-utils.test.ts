import { describe, expect, it } from "vitest";
import {
  agreementOutstandingEmi,
  getAgreementActionVisibility,
  normalizeStatus,
} from "./agreement-utils";
import type { AgreementRecord } from "@/services/agreement.service";

type ActionAgreement = Pick<
  AgreementRecord,
  "type" | "status" | "programId" | "franchiseId" | "materialsDispatched"
>;

function makeAgreement(overrides: Partial<ActionAgreement> = {}): ActionAgreement {
  return {
    type: "NEW_PROGRAM",
    status: "Valid",
    programId: 1,
    franchiseId: "F-1",
    materialsDispatched: false,
    ...overrides,
  };
}

describe("normalizeStatus", () => {
  it("collapses legacy aliases", () => {
    expect(normalizeStatus("Signed")).toBe("Valid");
    expect(normalizeStatus("PendingSignature")).toBe("Approved");
  });

  it("keeps Expired distinct from Void (still renewable)", () => {
    expect(normalizeStatus("Expired")).toBe("Expired");
    expect(normalizeStatus("Void")).toBe("Void");
  });

  it("passes canonical statuses through unchanged", () => {
    for (const s of [
      "Draft",
      "Approved",
      "Valid",
      "Suspended",
      "Void",
      "Expired",
    ] as const) {
      expect(normalizeStatus(s)).toBe(s);
    }
  });
});

describe("getAgreementActionVisibility", () => {
  it("franchisees can download Schedule B only when no franchise-fee receivable is pending", () => {
    const v = getAgreementActionVisibility(makeAgreement(), "franchisee");
    expect(v.download).toBe(true);
    expect(v.suspend).toBe(false);
    expect(v.void).toBe(false);
    expect(v.dispatchKit).toBe(false);
    expect(v.manageKitItems).toBe(false);
    expect(v.renew).toBe(false);

    expect(
      getAgreementActionVisibility(
        {
          ...makeAgreement(),
          receivables: {
            installmentSummary: {
              outstandingAmount: 100,
              payableOutstandingAmount: 118,
            },
          },
        } as AgreementRecord,
        "franchisee",
      ).download,
    ).toBe(false);
  });

  it("Valid → suspend + void; no reactivate/renew", () => {
    const v = getAgreementActionVisibility(
      makeAgreement({ status: "Valid" }),
      "admin",
    );
    expect(v.suspend).toBe(true);
    expect(v.reactivate).toBe(false);
    expect(v.void).toBe(true);
    expect(v.renew).toBe(false);
  });

  it("Suspended → reactivate + void; no suspend", () => {
    const v = getAgreementActionVisibility(
      makeAgreement({ status: "Suspended" }),
      "admin",
    );
    expect(v.reactivate).toBe(true);
    expect(v.suspend).toBe(false);
    expect(v.void).toBe(true);
  });

  it("Expired → renew only; no suspend/void", () => {
    const v = getAgreementActionVisibility(
      makeAgreement({ status: "Expired" }),
      "admin",
    );
    expect(v.renew).toBe(true);
    expect(v.suspend).toBe(false);
    expect(v.void).toBe(false);
  });

  it("Void → terminal: no lifecycle actions and no kit-item management", () => {
    const v = getAgreementActionVisibility(
      makeAgreement({ status: "Void" }),
      "admin",
    );
    expect(v.suspend).toBe(false);
    expect(v.reactivate).toBe(false);
    expect(v.void).toBe(false);
    expect(v.renew).toBe(false);
    expect(v.manageKitItems).toBe(false);
  });

  it("NEW_FRANCHISE + Valid + undispatched → dispatch + kit editor", () => {
    const v = getAgreementActionVisibility(
      makeAgreement({
        type: "NEW_FRANCHISE",
        status: "Valid",
        materialsDispatched: false,
      }),
      "admin",
    );
    expect(v.dispatchKit).toBe(true);
    expect(v.kitDispatched).toBe(false);
    expect(v.franchiseKitEditor).toBe(true);
  });

  it("NEW_FRANCHISE + Valid + dispatched → dispatched pill, not dispatch", () => {
    const v = getAgreementActionVisibility(
      makeAgreement({
        type: "NEW_FRANCHISE",
        status: "Valid",
        materialsDispatched: true,
      }),
      "admin",
    );
    expect(v.dispatchKit).toBe(false);
    expect(v.kitDispatched).toBe(true);
  });

  it("non-NEW_FRANCHISE never exposes kit dispatch/editor", () => {
    const v = getAgreementActionVisibility(
      makeAgreement({ type: "NEW_PROGRAM", status: "Valid" }),
      "admin",
    );
    expect(v.dispatchKit).toBe(false);
    expect(v.kitDispatched).toBe(false);
    expect(v.franchiseKitEditor).toBe(false);
  });

  it("manage kit items requires a program and a non-Void status", () => {
    expect(
      getAgreementActionVisibility(makeAgreement({ programId: null }), "admin")
        .manageKitItems,
    ).toBe(false);
    expect(
      getAgreementActionVisibility(
        makeAgreement({ programId: 5, status: "Valid" }),
        "admin",
      ).manageKitItems,
    ).toBe(true);
  });
});

describe("agreementOutstandingEmi", () => {
  function withSummary(summary: unknown): AgreementRecord {
    return { receivables: { installmentSummary: summary } } as unknown as AgreementRecord;
  }

  it("returns 0 when there is no receivables plan", () => {
    expect(agreementOutstandingEmi({} as AgreementRecord)).toBe(0);
    expect(agreementOutstandingEmi(withSummary(null))).toBe(0);
  });

  it("full summary: prefers totals.payableOutstandingAmount, falls back to outstandingAmount", () => {
    expect(
      agreementOutstandingEmi(
        withSummary({
          items: [],
          totals: { outstandingAmount: 100, payableOutstandingAmount: 118 },
        }),
      ),
    ).toBe(118);
    expect(
      agreementOutstandingEmi(
        withSummary({ items: [], totals: { outstandingAmount: 100 } }),
      ),
    ).toBe(100);
  });

  it("compact summary: prefers top-level payableOutstandingAmount, falls back to outstandingAmount", () => {
    expect(
      agreementOutstandingEmi(
        withSummary({ outstandingAmount: 50, payableOutstandingAmount: 59 }),
      ),
    ).toBe(59);
    expect(
      agreementOutstandingEmi(withSummary({ outstandingAmount: 50 })),
    ).toBe(50);
  });
});
