import { BloodGroup, FranchiseType } from "@/services/franchise.enums";
import type { PaymentMode } from "@/services/franchisee.service";

export interface PaidPaymentRow {
  amount: number;
  paidAt: string;
  mode: PaymentMode;
  reference: string;
}

export interface ProgramPayroll {
  programId: number;
  franchiseFee: number;
  kitCost: number;
  materialCost: number;
  monthlyFee: number;
  ciShare: number;
  franchiseShare: number;
  royalty: number;
  gstFranchiseFee: boolean;
  gstRoyalty: boolean;
  gstMaterialCost: boolean;
  /** Agreement signing date (YYYY-MM-DD). Drives expiry = signedAt + tenure. */
  signedAt: string;
  /** Agreement tenure in months. Drives expiry = signedAt + tenure. */
  tenure: number;
  /** Historical payments already received against this program. */
  paidPayments: PaidPaymentRow[];
  /** When true, the unpaid remainder is split into N equal EMIs. */
  unpaidSplitEnabled: boolean;
  /** Number of EMI receivables to create for the unpaid remainder. */
  unpaidSplitCount: number;
  /**
   * Explicit due date of the first unpaid receivable (yyyy-mm-dd).
   * When the unpaid amount is split, subsequent EMIs are scheduled at
   * monthly intervals from this date.
   */
  unpaidFirstDueDate: string;
}

export interface FormData {
  name: string;
  email: string;
  phone: string;
  dob: string;
  bloodGroup: BloodGroup;
  communicationAddress: string;
  city: string;
  state: string;
  pincode: string;
  education: string;
  occupation: string;
  reference: string;
  password: string;
  confirmPassword: string;
  franchiseName: string;
  franchiseType: FranchiseType;
  franchiseAddress: string;
  franchiseCity: string;
  franchiseState: string;
  franchisePincode: string;
  selectedPrograms: number[];
}

export type FranchiseeMode = "new" | "existing";
