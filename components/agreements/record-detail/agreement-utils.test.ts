import { describe, expect, it } from "vitest";
import {
  agreementOutstandingEmi,
  agreementStatusBadge,
  getAgreementActionVisibility,
} from "./agreement-utils";
import type { AgreementRecord } from "@/services/agreement.service";

type ActionAgreement = Pick<
  AgreementRecord,
  "kind" | "status" | "programId" | "franchiseId" | "materialsDispatched"
>;

function makeAgreement(overrides: Partial<ActionAgreement> = {}): ActionAgreement {
  return {
    kind: "PROGRAM",
    status: "ACTIVE",
    programId: 1,
    franchiseId: "F-1",
    materialsDispatched: false,
    ...overrides,
  };
}

describe("agreementStatusBadge", () => {
  it("prettifies UPPER_SNAKE statuses", () => {
    expect(agreementStatusBadge("ACTIVE", true)).toEqual({
      label: "Active",
      tone: "default",
    });
    expect(agreementStatusBadge("SUSPENDED", true).label).toBe("Suspended");
    expect(agreementStatusBadge("VOID", false)).toEqual({
      label: "Void",
      tone: "destructive",
    });
    expect(agreementStatusBadge("EXPIRED", true)).toEqual({
      label: "Expired",
      tone: "destructive",
    });
    expect(agreementStatusBadge("DRAFT", false).label).toBe("Draft");
  });

  it("splits APPROVED by the signed boolean", () => {
    expect(agreementStatusBadge("APPROVED", true)).toEqual({
      label: "Signed · awaiting payment",
      tone: "default",
    });
    expect(agreementStatusBadge("APPROVED", false)).toEqual({
      label: "Approved · awaiting signature",
      tone: "secondary",
    });
  });

  it("SUPERSEDED renders as a neutral/secondary historical badge", () => {
    expect(agreementStatusBadge("SUPERSEDED", true)).toEqual({
      label: "Superseded",
      tone: "secondary",
    });
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

  it("ACTIVE → suspend + void + renew; no reactivate", () => {
    const v = getAgreementActionVisibility(
      makeAgreement({ status: "ACTIVE" }),
      "admin",
    );
    expect(v.suspend).toBe(true);
    expect(v.reactivate).toBe(false);
    expect(v.void).toBe(true);
    // Renewable while live: the renewal is scheduled and takes over at expiry.
    expect(v.renew).toBe(true);
  });

  it.each(["ACTIVE", "SUSPENDED", "EXPIRED"] as const)(
    "%s is renewable so a renewal can be prepared before the term ends",
    (status) => {
      expect(
        getAgreementActionVisibility(makeAgreement({ status }), "admin").renew,
      ).toBe(true);
    },
  );

  it.each(["DRAFT", "APPROVED", "VOID", "SUPERSEDED"] as const)(
    "%s is not renewable",
    (status) => {
      expect(
        getAgreementActionVisibility(makeAgreement({ status }), "admin").renew,
      ).toBe(false);
    },
  );

  it("SUSPENDED → reactivate + void; no suspend", () => {
    const v = getAgreementActionVisibility(
      makeAgreement({ status: "SUSPENDED" }),
      "admin",
    );
    expect(v.reactivate).toBe(true);
    expect(v.suspend).toBe(false);
    expect(v.void).toBe(true);
  });

  it("EXPIRED → renew only; no suspend/void", () => {
    const v = getAgreementActionVisibility(
      makeAgreement({ status: "EXPIRED" }),
      "admin",
    );
    expect(v.renew).toBe(true);
    expect(v.suspend).toBe(false);
    expect(v.void).toBe(false);
  });

  it("VOID → terminal: no lifecycle actions and no kit-item management", () => {
    const v = getAgreementActionVisibility(
      makeAgreement({ status: "VOID" }),
      "admin",
    );
    expect(v.suspend).toBe(false);
    expect(v.reactivate).toBe(false);
    expect(v.void).toBe(false);
    expect(v.renew).toBe(false);
    expect(v.manageKitItems).toBe(false);
  });

  it("SUPERSEDED → download-only (historical row)", () => {
    const v = getAgreementActionVisibility(
      makeAgreement({ status: "SUPERSEDED", kind: "FRANCHISE" }),
      "admin",
    );
    expect(v.download).toBe(true);
    expect(v.suspend).toBe(false);
    expect(v.reactivate).toBe(false);
    expect(v.void).toBe(false);
    expect(v.renew).toBe(false);
    expect(v.manageKitItems).toBe(false);
    expect(v.franchiseKitEditor).toBe(false);
    expect(v.dispatchKit).toBe(false);
    expect(v.kitDispatched).toBe(false);
  });

  it("FRANCHISE kind + ACTIVE + undispatched → dispatch + kit editor", () => {
    const v = getAgreementActionVisibility(
      makeAgreement({
        kind: "FRANCHISE",
        status: "ACTIVE",
        materialsDispatched: false,
      }),
      "admin",
    );
    expect(v.dispatchKit).toBe(true);
    expect(v.kitDispatched).toBe(false);
    expect(v.franchiseKitEditor).toBe(true);
  });

  it("FRANCHISE kind + ACTIVE + dispatched → dispatched pill, not dispatch", () => {
    const v = getAgreementActionVisibility(
      makeAgreement({
        kind: "FRANCHISE",
        status: "ACTIVE",
        materialsDispatched: true,
      }),
      "admin",
    );
    expect(v.dispatchKit).toBe(false);
    expect(v.kitDispatched).toBe(true);
  });

  it("non-FRANCHISE kinds never expose kit dispatch/editor", () => {
    const v = getAgreementActionVisibility(
      makeAgreement({ kind: "PROGRAM", status: "ACTIVE" }),
      "admin",
    );
    expect(v.dispatchKit).toBe(false);
    expect(v.kitDispatched).toBe(false);
    expect(v.franchiseKitEditor).toBe(false);
  });

  it("editTerms: allowed for DRAFT and unsigned APPROVED, locked once signed", () => {
    expect(
      getAgreementActionVisibility(makeAgreement({ status: "DRAFT" }), "admin")
        .editTerms,
    ).toBe(true);
    expect(
      getAgreementActionVisibility(
        { ...makeAgreement({ status: "APPROVED" }), signed: false },
        "admin",
      ).editTerms,
    ).toBe(true);
    expect(
      getAgreementActionVisibility(
        { ...makeAgreement({ status: "APPROVED" }), signed: true },
        "admin",
      ).editTerms,
    ).toBe(false);
    expect(
      getAgreementActionVisibility(makeAgreement({ status: "ACTIVE" }), "admin")
        .editTerms,
    ).toBe(false);
  });

  it("editTerms: superadmin edits at any lifecycle point except SUPERSEDED/VOID", () => {
    const superAdmin = { superAdmin: true };
    expect(
      getAgreementActionVisibility(
        { ...makeAgreement({ status: "APPROVED" }), signed: true },
        "admin",
        superAdmin,
      ).editTerms,
    ).toBe(true);
    expect(
      getAgreementActionVisibility(
        makeAgreement({ status: "ACTIVE" }),
        "admin",
        superAdmin,
      ).editTerms,
    ).toBe(true);
    expect(
      getAgreementActionVisibility(
        makeAgreement({ status: "SUSPENDED" }),
        "admin",
        superAdmin,
      ).editTerms,
    ).toBe(true);
    expect(
      getAgreementActionVisibility(
        makeAgreement({ status: "EXPIRED" }),
        "admin",
        superAdmin,
      ).editTerms,
    ).toBe(true);
    expect(
      getAgreementActionVisibility(
        makeAgreement({ status: "SUPERSEDED" }),
        "admin",
        superAdmin,
      ).editTerms,
    ).toBe(false);
    expect(
      getAgreementActionVisibility(
        makeAgreement({ status: "VOID" }),
        "admin",
        superAdmin,
      ).editTerms,
    ).toBe(false);
    // CI kinds stay managed from the CI flows even for superadmin.
    expect(
      getAgreementActionVisibility(
        makeAgreement({ kind: "CI", status: "ACTIVE" }),
        "admin",
        superAdmin,
      ).editTerms,
    ).toBe(false);
  });

  it("editTerms: CI agreements and franchisees never edit terms here", () => {
    expect(
      getAgreementActionVisibility(
        makeAgreement({ kind: "CI", status: "DRAFT" }),
        "admin",
      ).editTerms,
    ).toBe(false);
    expect(
      getAgreementActionVisibility(
        makeAgreement({ status: "DRAFT" }),
        "franchisee",
      ).editTerms,
    ).toBe(false);
  });

  it("manage kit items requires a program and a non-VOID status", () => {
    expect(
      getAgreementActionVisibility(makeAgreement({ programId: null }), "admin")
        .manageKitItems,
    ).toBe(false);
    expect(
      getAgreementActionVisibility(
        makeAgreement({ programId: 5, status: "ACTIVE" }),
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
