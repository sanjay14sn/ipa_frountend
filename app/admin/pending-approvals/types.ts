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
  installment: number;
  totalAmount: number;
  gstInclusive: boolean;
  freeload: boolean;
}

export interface PayrollDetails {
  franchiseId: number;
  dateOfPayment: string;
  dateOfJoining: string;
  programPayrolls: ProgramPayroll[];
  renewalDate?: string;
  renewalAmount?: number;
}
