import { describe, it, expect } from "vitest";
import {
  agreementTermsFormFromRecord,
  buildAgreementDetailsPatch,
  validateAgreementTermsForm,
  type AgreementTermsFormState,
} from "@/app/admin/franchise/_components/edit-agreement-terms-section";
import type { AgreementRecord } from "@/services/agreement.service";

function agreement(over: Partial<AgreementRecord> = {}): AgreementRecord {
  return {
    id: 50, kind: "FRANCHISE", origin: "NEW", status: "APPROVED",
    franchiseFee: 100000, monthlyFee: 0, royalty: 0, materialCost: 0,
    kitCost: 0, ciShare: 0, franchiseShare: 0, gstFranchiseFee: false,
    gstRoyalty: false, gstMaterialCost: false, installment: false, tenure: 12,
    dateOfSigning: null, franchiseId: "F-1", franchiseeId: 7,
    franchiseeSignedAt: null, title: "Franchise agreement", notes: null,
    metadata: null, referenceCode: null, createdAt: "",
    ...over,
  } as AgreementRecord;
}

function form(over: Partial<AgreementTermsFormState> = {}): AgreementTermsFormState {
  return {
    title: "Franchise agreement", notes: "", tenure: 12, franchiseFee: 100000,
    monthlyFee: 0, royalty: 0, materialCost: 0, kitCost: 0, ciShare: 0,
    franchiseShare: 0, gstFranchiseFee: false, gstRoyalty: false,
    gstMaterialCost: false, installment: false, installmentMonths: 0,
    downPayment: 0, signedAt: "", activatedAt: "", expiresAt: "",
    ...over,
  };
}

describe("agreementTermsFormFromRecord — D9 tenure fallback", () => {
  // A DRAFT has tenure null. Showing 12 made the field look stored, and the
  // sparse diff then compared 12 to 12 and never sent it — the agreement kept
  // null while the admin believed they had seen and kept 12 months.
  it("leaves a null tenure empty instead of fabricating 12", () => {
    expect(agreementTermsFormFromRecord(agreement({ tenure: null })).tenure).toBe(0);
  });

  it("still seeds a stored tenure verbatim", () => {
    expect(agreementTermsFormFromRecord(agreement({ tenure: 24 })).tenure).toBe(24);
  });

  it("a fabricated tenure would have been diffed away — the seeded 0 is not", () => {
    const initial = agreementTermsFormFromRecord(agreement({ tenure: null }));
    const patch = buildAgreementDetailsPatch(initial, { ...initial, tenure: 12 });
    expect(patch.tenure).toBe(12);
  });
});

describe("lifecycle dates (superadmin fields)", () => {
  it("seeds yyyy-MM-dd values from the record's ISO timestamps", () => {
    const seeded = agreementTermsFormFromRecord(
      agreement({
        franchiseeSignedAt: "2026-02-01T10:30:00.000Z",
        activatedAt: "2026-02-03T00:00:00.000Z",
        expiresAt: "2027-02-01T00:00:00.000Z",
      } as Partial<AgreementRecord>),
    );
    expect(seeded.signedAt).toBe("2026-02-01");
    expect(seeded.activatedAt).toBe("2026-02-03");
    expect(seeded.expiresAt).toBe("2027-02-01");
  });

  it("sends only the dates that changed", () => {
    const initial = form({
      signedAt: "2026-02-01", activatedAt: "2026-02-03", expiresAt: "2027-02-01",
    });
    const patch = buildAgreementDetailsPatch(initial, {
      ...initial,
      signedAt: "2025-12-15",
    });
    expect(patch.signedAt).toBe("2025-12-15");
    expect(patch.activatedAt).toBeUndefined();
    expect(patch.expiresAt).toBeUndefined();
  });

  it("treats a blanked date as unchanged — dates move, never unset", () => {
    const initial = form({ signedAt: "2026-02-01" });
    const patch = buildAgreementDetailsPatch(initial, {
      ...initial,
      signedAt: "",
    });
    expect(patch.signedAt).toBeUndefined();
  });
});

describe("validateAgreementTermsForm", () => {
  it("requires a tenure — the DRAFT case D9 used to hide", () => {
    expect(validateAgreementTermsForm(form({ tenure: 0 }), agreement())).toMatch(
      /tenure/i,
    );
  });

  // D10: the backend keeps an APPROVED agreement payable, so a cleared fee
  // field 400s — after the franchise half has already committed (D2).
  it("rejects a zeroed franchise fee while APPROVED", () => {
    expect(
      validateAgreementTermsForm(form({ franchiseFee: 0 }), agreement()),
    ).toMatch(/greater than zero/i);
  });

  it("allows a zero fee on a DRAFT, which the backend permits", () => {
    expect(
      validateAgreementTermsForm(
        form({ franchiseFee: 0 }),
        agreement({ status: "DRAFT" }),
      ),
    ).toBeNull();
  });

  // A7: the plan builder splits (franchiseFee - downPayment) across the months,
  // so a down payment at or above the fee produces negative installments.
  it("rejects a down payment at or above the franchise fee", () => {
    const over = form({
      installment: true, installmentMonths: 6,
      franchiseFee: 100000, downPayment: 200000,
    });
    expect(validateAgreementTermsForm(over, agreement())).toMatch(/down payment/i);

    const equal = form({
      installment: true, installmentMonths: 6,
      franchiseFee: 100000, downPayment: 100000,
    });
    expect(validateAgreementTermsForm(equal, agreement())).toMatch(/down payment/i);
  });

  it("accepts a down payment below the fee", () => {
    const ok = form({
      installment: true, installmentMonths: 6,
      franchiseFee: 100000, downPayment: 25000,
    });
    expect(validateAgreementTermsForm(ok, agreement())).toBeNull();
  });

  it("requires installment months only when the plan is on", () => {
    expect(
      validateAgreementTermsForm(
        form({ installment: true, installmentMonths: 0 }),
        agreement(),
      ),
    ).toMatch(/installment months/i);
    expect(
      validateAgreementTermsForm(
        form({ installment: false, installmentMonths: 0 }),
        agreement(),
      ),
    ).toBeNull();
  });

  it("ignores the down-payment rule when the plan is off", () => {
    expect(
      validateAgreementTermsForm(
        form({ installment: false, franchiseFee: 1000, downPayment: 5000 }),
        agreement(),
      ),
    ).toBeNull();
  });
});
