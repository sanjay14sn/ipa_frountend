import type { User } from "@/lib/auth";
import type { AgreementRecord } from "@/services/agreement.service";
import { getFranchiseFeePayable } from "@/lib/gst";

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

function sumPayrollFranchiseFees(rows: unknown): number | null {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  let sum = 0;
  let any = false;
  for (const r of rows) {
    const row = r as {
      franchiseFee?: unknown;
      gstFranchiseFee?: boolean | null;
    };
    const f = parseMoney(row.franchiseFee);
    if (f != null && f > 0) {
      sum += getFranchiseFeePayable(f, row.gstFranchiseFee ?? null).payable;
      any = true;
    }
  }
  return any ? sum : null;
}

/**
 * Payable amount for Razorpay = franchise fee + 18% GST when not GST-inclusive.
 * Falls back to a linked payment row first (already includes GST), then the
 * agreement's franchise fee, then the legacy multi-program payroll array on
 * the profile.
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
    const f = parseMoney(feeAgreement.franchiseFee);
    if (f != null && f > 0) {
      return getFranchiseFeePayable(f, feeAgreement.gstFranchiseFee ?? null)
        .payable;
    }
  }
  return sumPayrollFranchiseFees(profilePayrolls);
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
      gstFranchiseFee: feeAgreement.gstFranchiseFee,
      gstRoyalty: feeAgreement.gstRoyalty,
      gstMaterialCost: feeAgreement.gstMaterialCost,
      program: { name: programName, id: feeAgreement.programId },
    },
  ];
}

export interface AgreementDetailFranchiseData {
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  communicationAddress: string | null;
  franchiseCode: string;
  program: string;
  franchiseType: string | null;
  date: string | null | undefined;
  paymentDetails: Record<string, unknown>[];
  tenure: number | string | null | undefined;
  expiryDate: string | null | undefined;
}

export function buildAgreementDetailFranchiseData(
  agreement: AgreementRecord,
): AgreementDetailFranchiseData {
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

  const programName =
    feeAgreement?.program?.name ??
    feeAgreement?.programName ??
    programNameForAgreement(profile, feeAgreement?.programId);
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
