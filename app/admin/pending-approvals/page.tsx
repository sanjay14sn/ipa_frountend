"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  CheckCircle,
  IndianRupee,
  Settings,
  Calendar,
  Calculator,
  Users,
} from "lucide-react";
import {
  createPayrollDetails,
  type FranchiseData,
} from "@/services/franchisee.service";
import { PayrollDetails } from "./types";
import PendingApprovalsTable from "./components/PendingApprovalsTable";

export default function PendingApprovals() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedApplication, setSelectedApplication] =
    useState<FranchiseData | null>(null);
  const [showPayrollDialog, setShowPayrollDialog] = useState(false);
  const [payrollDetails, setPayrollDetails] = useState<PayrollDetails>({
    franchiseId: 0,
    dateOfPayment: "",
    dateOfJoining: "",
    programPayrolls: [],
  });

  const triggerRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleApprove = (application: FranchiseData) => {
    setSelectedApplication(application);

    // Initialize program payrolls based on franchisePrograms
    const programPayrolls = application.franchisePrograms?.map((fp) => ({
      programId: fp.program.id,
      programName: fp.program.name,
      franchiseFee: 0,
      kitCost: 0,
      materialCost: 0,
      monthlyFee: 0,
      ciShare: 0,
      franchiseShare: 0,
      royalty: 0,
      installment: 0,
      totalAmount: 0,
    })) || [];

    setPayrollDetails({
      franchiseId: application.id,
      dateOfPayment: new Date().toISOString().split('T')[0],
      dateOfJoining: new Date().toISOString().split('T')[0],
      programPayrolls,
    });
    setShowPayrollDialog(true);
  };

  const handleReject = async (application: FranchiseData) => {
    // TODO: Implement rejection logic with API endpoint
    alert("Rejection feature is not yet implemented");
  };

  const submitPayrollDetails = async () => {
    if (!selectedApplication) return;

    try {
      const payrollData = {
        programPayrolls: payrollDetails.programPayrolls.map((pp) => ({
          programId: pp.programId,
          franchiseFee: Number(pp.franchiseFee) || 0,
          kitCost: Number(pp.kitCost) || 0,
          materialCost: Number(pp.materialCost) || 0,
          monthlyFee: Number(pp.monthlyFee) || 0,
          ciShare: Number(pp.ciShare) || 0,
          franchiseShare: Number(pp.franchiseShare) || 0,
          royalty: Number(pp.royalty) || 0,
          installment: Number(pp.installment) || 0,
          totalAmount: Number(pp.totalAmount) || 0,
        })),
      };

      await createPayrollDetails(selectedApplication.id, payrollData);

      setShowPayrollDialog(false);
      setSelectedApplication(null);
      triggerRefresh(); // Refresh the list
    } catch (error) {
      console.error("Error submitting payroll details:", error);
      alert("Failed to submit payroll details. Please try again.");
    }
  };

  const handleProgramPayrollChange = (
    programIndex: number,
    field: keyof import('./types').ProgramPayroll,
    value: string | number
  ) => {
    setPayrollDetails((prev) => {
      const updatedProgramPayrolls = [...prev.programPayrolls];
      updatedProgramPayrolls[programIndex] = {
        ...updatedProgramPayrolls[programIndex],
        [field]: value,
      };

      // Auto-calculate totalAmount for this program
      if (
        ['franchiseFee', 'kitCost', 'materialCost', 'monthlyFee', 'installment'].includes(field)
      ) {
        const program = updatedProgramPayrolls[programIndex];
        updatedProgramPayrolls[programIndex].totalAmount =
          (Number(program.franchiseFee) || 0) +
          (Number(program.kitCost) || 0) +
          (Number(program.materialCost) || 0) +
          (Number(program.monthlyFee) || 0) +
          (Number(program.installment) || 0);
      }

      return {
        ...prev,
        programPayrolls: updatedProgramPayrolls,
      };
    });
  };

  const handleDateChange = (field: 'dateOfPayment' | 'dateOfJoining', value: string) => {
    setPayrollDetails((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Franchise Applications
          </h1>
          <p className="text-sm text-gray-600">
            Review and manage franchise applications with filtering and search
            capabilities
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
            onClick={triggerRefresh}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Stats */}

      {/* Applications Table */}
      <div className="w-full">
        <PendingApprovalsTable
          onApprove={handleApprove}
          onReject={handleReject}
          refreshTrigger={refreshTrigger}
        />
      </div>

      {/* Payroll Details Dialog */}
      <Dialog open={showPayrollDialog} onOpenChange={setShowPayrollDialog}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4 border-b border-primary">
            <DialogTitle className="flex items-center gap-2 text-xl font-semibold text-gray-900">
              <Settings className="h-5 w-5 text-primary" />
              Setup Payroll for {selectedApplication?.name}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 mt-2">
              Configure financial details for each program. All fields are required.
            </DialogDescription>
          </DialogHeader>

          {selectedApplication && (
            <div className="py-6 space-y-6">
              {/* Common Dates Section */}
              <div className="bg-blue-50/50 border border-primary rounded-lg p-5">
                <h3 className="font-semibold text-base mb-4 flex items-center gap-2 text-gray-900">
                  <Calendar className="h-5 w-5 text-primary" />
                  Franchise Dates
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Date of Joining
                    </Label>
                    <Input
                      type="date"
                      value={payrollDetails.dateOfJoining}
                      onChange={(e) => handleDateChange("dateOfJoining", e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Payment Date
                    </Label>
                    <Input
                      type="date"
                      value={payrollDetails.dateOfPayment}
                      onChange={(e) => handleDateChange("dateOfPayment", e.target.value)}
                      className="h-10"
                    />
                  </div>
                </div>
              </div>

              {/* Per-Program Payroll Section */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg text-gray-900 flex items-center gap-2">
                  <IndianRupee className="h-5 w-5 text-primary" />
                  Program-wise Payroll Configuration
                </h3>

                {payrollDetails.programPayrolls.map((program, index) => (
                  <div
                    key={program.programId}
                    className="bg-white border-2 border-primary rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="mb-4 pb-3 border-b border-primary">
                      <h4 className="font-semibold text-base text-gray-900">
                        {program.programName}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Configure financial details for this program
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      {/* Franchise Fee */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">
                          Franchise Fee
                        </Label>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            type="number"
                            value={program.franchiseFee}
                            onChange={(e) =>
                              handleProgramPayrollChange(index, "franchiseFee", e.target.value)
                            }
                            className="pl-10 h-10"
                            placeholder="0"
                          />
                        </div>
                      </div>

                      {/* Kit Cost */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">
                          Kit Cost
                        </Label>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            type="number"
                            value={program.kitCost}
                            onChange={(e) =>
                              handleProgramPayrollChange(index, "kitCost", e.target.value)
                            }
                            className="pl-10 h-10"
                            placeholder="0"
                          />
                        </div>
                      </div>

                      {/* Material Cost */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">
                          Material Cost
                        </Label>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            type="number"
                            value={program.materialCost}
                            onChange={(e) =>
                              handleProgramPayrollChange(index, "materialCost", e.target.value)
                            }
                            className="pl-10 h-10"
                            placeholder="0"
                          />
                        </div>
                      </div>

                      {/* Monthly Fee */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">
                          Monthly Fee/Student
                        </Label>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            type="number"
                            value={program.monthlyFee}
                            onChange={(e) =>
                              handleProgramPayrollChange(index, "monthlyFee", e.target.value)
                            }
                            className="pl-10 h-10"
                            placeholder="0"
                          />
                        </div>
                      </div>

                      {/* Installment */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">
                          Installment
                        </Label>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            type="number"
                            value={program.installment}
                            onChange={(e) =>
                              handleProgramPayrollChange(index, "installment", e.target.value)
                            }
                            className="pl-10 h-10"
                            placeholder="0"
                          />
                        </div>
                      </div>

                      {/* Royalty % */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">
                          Royalty/Student (%)
                        </Label>
                        <div className="relative">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={program.royalty}
                            onChange={(e) =>
                              handleProgramPayrollChange(index, "royalty", e.target.value)
                            }
                            className="pr-8 h-10"
                            placeholder="0"
                          />
                          <span className="absolute right-3 top-3 text-sm text-gray-400">
                            %
                          </span>
                        </div>
                      </div>

                      {/* CI Share % */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">
                          CI Share (%)
                        </Label>
                        <div className="relative">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={program.ciShare}
                            onChange={(e) =>
                              handleProgramPayrollChange(index, "ciShare", e.target.value)
                            }
                            className="pr-8 h-10"
                            placeholder="0"
                          />
                          <span className="absolute right-3 top-3 text-sm text-gray-400">
                            %
                          </span>
                        </div>
                      </div>

                      {/* Franchise Share % */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">
                          Franchise Share (%)
                        </Label>
                        <div className="relative">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={program.franchiseShare}
                            onChange={(e) =>
                              handleProgramPayrollChange(index, "franchiseShare", e.target.value)
                            }
                            className="pr-8 h-10"
                            placeholder="0"
                          />
                          <span className="absolute right-3 top-3 text-sm text-gray-400">
                            %
                          </span>
                        </div>
                      </div>

                      {/* Total Amount (Auto-calculated) */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">
                          Total Amount
                        </Label>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-primary" />
                          <Input
                            type="text"
                            value={program.totalAmount.toLocaleString()}
                            readOnly
                            className="pl-10 h-10 bg-gray-50 font-semibold text-primary cursor-not-allowed"
                          />
                        </div>
                        <p className="text-xs text-gray-500">Auto-calculated</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Grand Total Summary */}
              <div className="bg-primary/10 border-2 border-primary rounded-lg p-5">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">Grand Total (All Programs)</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Combined total franchise fee across all programs
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-primary">
                      ₹{payrollDetails.programPayrolls
                        .reduce((sum, p) => sum + Number(p.franchiseFee || 0), 0)
                        .toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Total: ₹{payrollDetails.programPayrolls
                        .reduce((sum, p) => sum + Number(p.totalAmount || 0), 0)
                        .toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Monthly Royalty Section */}
                <div className="mt-5 pt-5 border-t-2 border-primary space-y-3">
                  {(() => {
                    const totalMonthlyFee = payrollDetails.programPayrolls.reduce(
                      (sum, p) => sum + Number(p.monthlyFee || 0),
                      0
                    );
                    const avgRoyaltyPercent = payrollDetails.programPayrolls.length > 0
                      ? payrollDetails.programPayrolls.reduce(
                          (sum, p) => sum + Number(p.royalty || 0),
                          0
                        ) / payrollDetails.programPayrolls.length
                      : 0;
                    const adminRoyaltyPerStudent = (totalMonthlyFee * avgRoyaltyPercent) / 100;

                    const totalCISharePercent = payrollDetails.programPayrolls.reduce(
                      (sum, p) => sum + Number(p.ciShare || 0),
                      0
                    );
                    const ciRoyaltyPerStudent = (totalMonthlyFee * totalCISharePercent) / 100;

                    return (
                      <>
                        <div className="flex justify-between items-center py-2 px-3 bg-white border border-primary rounded">
                          <span className="text-sm font-medium text-gray-700">
                            Admin Royalty (per student/month):
                          </span>
                          <span className="text-base font-bold text-primary">
                            ₹{adminRoyaltyPerStudent.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 px-3 bg-white border border-primary rounded">
                          <span className="text-sm font-medium text-gray-700">
                            CI Royalty (per student/month):
                          </span>
                          <span className="text-base font-bold text-primary">
                            ₹{ciRoyaltyPerStudent.toLocaleString()}
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t-2 border-primary">
                <Button
                  onClick={submitPayrollDetails}
                  className="bg-primary hover:bg-primary/90 text-white h-11 text-base flex-1 font-semibold"
                >
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Approve & Setup Payroll
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowPayrollDialog(false)}
                  className="h-11 text-base px-8 border-2 border-primary hover:bg-primary/10"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
