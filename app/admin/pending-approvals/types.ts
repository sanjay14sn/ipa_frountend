export interface PayrollDetails {
  franchiseId: number;
  franchiseFee: number;
  dateOfPayment: string;
  dateOfJoining: string;
  monthlyFee: number;
  ciShare: number;
  franchiseShare: number;
  royalty: number;
  installment: number;
  totalAmount: number;
  renewalDate?: string;
  renewalAmount?: number;
}
