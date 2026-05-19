import type { User } from "@/lib/auth";
import type { AgreementRecord } from "@/services/agreement.service";

export function parseMoney(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = parseFloat(value.replace(/,/g, "").trim());
    return Number.isFinite(n) ? n : null;
  }
  const n = parseFloat(String(value).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

function sumPayrollTotals(rows: unknown): number | null {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  let sum = 0;
  let any = false;
  for (const r of rows) {
    const row = r as { totalAmount?: unknown; franchiseFee?: unknown };
    const t = parseMoney(row.totalAmount);
    if (t != null && t > 0) {
      sum += t;
      any = true;
      continue;
    }
    const f = parseMoney(row.franchiseFee);
    if (f != null && f > 0) {
      sum += f;
      any = true;
    }
  }
  return any ? sum : null;
}

/**
 * Payable franchise fee for Razorpay: prefer agreement row (ipa-new), then legacy payroll array on profile.
 */
export function resolveAgreementPayableAmount(
  feeAgreement: AgreementRecord | null,
  profilePayrolls: unknown,
): number | null {
  if (feeAgreement) {
    if (feeAgreement.payment != null) {
      const a = parseMoney(feeAgreement.payment.amount);
      if (a !== null && a >= 0) return a;
    }
    const t = parseMoney(feeAgreement.totalAmount);
    if (t != null && t > 0) return t;
    const f = parseMoney(feeAgreement.franchiseFee);
    if (f != null && f > 0) return f;
  }
  return sumPayrollTotals(profilePayrolls);
}

export function programNameForAgreement(
  profile: User["profile"] | undefined,
  programId: number | null | undefined,
): string {
  if (programId == null || programId === undefined) return "Program";
  const hit = (profile?.franchise?.agreements ?? []).find((a) => a.programId === programId);
  return hit?.programName ?? hit?.program?.name ?? `Program #${programId}`;
}

/**
 * Shape expected by PaymentBreakdown (single-program agreement terms on the agreement row).
 */
export function agreementToPaymentBreakdownRows(
  feeAgreement: AgreementRecord | null,
  programName: string,
): unknown[] | null {
  if (!feeAgreement) return null;
  const hasAny =
    feeAgreement.franchiseFee != null ||
    feeAgreement.totalAmount != null ||
    feeAgreement.monthlyFee != null ||
    feeAgreement.kitCost != null ||
    feeAgreement.materialCost != null ||
    feeAgreement.royalty != null;
  if (!hasAny) return null;
  return [
    {
      franchiseFee: feeAgreement.franchiseFee,
      monthlyFee: feeAgreement.monthlyFee,
      kitCost: feeAgreement.kitCost,
      materialCost: feeAgreement.materialCost,
      royalty: feeAgreement.royalty,
      ciShare: feeAgreement.ciShare,
      franchiseShare: feeAgreement.franchiseShare,
      installment: feeAgreement.installment,
      totalAmount: feeAgreement.totalAmount,
      gstFranchiseFee: feeAgreement.gstFranchiseFee,
      gstRoyalty: feeAgreement.gstRoyalty,
      gstMaterialCost: feeAgreement.gstMaterialCost,
      program: { name: programName, id: feeAgreement.programId },
    },
  ];
}

export function buildAgreementDetailFranchiseData(
  agreement: AgreementRecord,
): Record<string, unknown> {
  const programName =
    agreement.program?.name ??
    agreement.programName ??
    agreement.programs?.[0]?.name ??
    (agreement.programId != null ? `Program #${agreement.programId}` : "Program");

  const paymentDetails = [
    {
      franchiseFee: agreement.franchiseFee,
      monthlyFee: agreement.monthlyFee,
      kitCost: agreement.kitCost,
      materialCost: agreement.materialCost,
      royalty: agreement.royalty,
      ciShare: agreement.ciShare,
      franchiseShare: agreement.franchiseShare,
      installment: agreement.installment,
      totalAmount: agreement.totalAmount,
      gstFranchiseFee: agreement.gstFranchiseFee,
      gstRoyalty: agreement.gstRoyalty,
      gstMaterialCost: agreement.gstMaterialCost,
      program: agreement.program ?? {
        id: agreement.programId,
        name: programName,
      },
    },
  ];

  return {
    name: agreement.franchise?.name ?? `Franchise ${agreement.franchiseId ?? ""}`.trim(),
    contactPerson: agreement.franchisee?.name ?? "-",
    email: agreement.franchisee?.mail ?? "-",
    phone: agreement.franchisee?.phone ?? "-",
    address: agreement.franchise?.address ?? "-",
    city: agreement.franchise?.city ?? "-",
    state: agreement.franchise?.state ?? "-",
    pincode: agreement.franchise?.pincode ?? "-",
    communicationAddress: agreement.franchisee?.communicationAddress ?? null,
    franchiseCode:
      agreement.franchiseId != null ? `FR-${agreement.franchiseId}` : "-",
    program: programName,
    franchiseType: agreement.franchise?.type ?? null,
    date: agreement.createdAt,
    paymentDetails,
    tenure: agreement.tenure ?? null,
    expiryDate: agreement.expiresAt ?? null,
  };
}

/**
 * Data passed to getProcessedAgreementContent + step 1 cards (profile + agreement terms).
 */
export function buildFranchiseDataForAgreementPage(
  user: User,
  feeAgreement: AgreementRecord | null,
): Record<string, unknown> {
  const profile = user.profile;
  const franchise = profile?.franchise;
  if (!franchise) {
    throw new Error("Missing franchise on profile");
  }

  const programName = programNameForAgreement(profile, feeAgreement?.programId);
  const fromAgreement = agreementToPaymentBreakdownRows(feeAgreement, programName);
  const paymentDetails =
    fromAgreement ??
    (franchise.franchisePayroll ? [franchise.franchisePayroll] : []);

  const programLabel =
    Array.isArray(paymentDetails) && paymentDetails.length > 0
      ? (paymentDetails as Array<{
          program?: { name?: string };
        }>)
          .map((row) => row.program?.name ?? "N/A")
          .join(", ")
      : programName;

  return {
    name: franchise.name,
    contactPerson: profile.name,
    email: profile.mail,
    phone: profile.phone,
    dob: profile.dob,
    bloodGroup: profile.bloodGroup,
    educationalQualification: profile.education,
    presentOccupation: profile.occupation,
    address: profile.address,
    city: profile.city ?? franchise.city,
    state: profile.state ?? "",
    pincode: profile.pincode,
    communicationAddress: profile.communicationAddress,
    franchiseCode: `FR-${franchise.id}`,
    program: programLabel || programName,
    franchiseType: franchise.type,
    reference: profile.reference,
    date: franchise.createdAt,
    paymentDetails,
    tenure: feeAgreement?.tenure ?? null,
    expiryDate: feeAgreement?.expiresAt ?? null,
  };
}
