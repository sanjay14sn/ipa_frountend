/** Form state aligned with POST /admin/franchise/:id/set-terms (SetFranchiseTermsDto). */
export interface ProgramPayroll {
  programId: number;
  programName: string;
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
  installment: boolean;
  tenure: number;
  downPaymentAmount: number;
  installmentMonths: number;
}

export interface PayrollDetails {
  franchiseId: string;
  programPayroll: ProgramPayroll;
}
