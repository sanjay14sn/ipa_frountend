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
  Calculator,
  Users,
  GraduationCap,
  Building2,
  Calendar,
  Percent,
  Settings,
} from "lucide-react";
import {
  getPendingFranchise,
  createPayrollDetails,
  type FranchiseData,
} from "@/services/franchisee.service";
import { PayrollDetails } from "./types";
import PendingApprovalsTable from "./components/PendingApprovalsTable";

// Calculation functions for payroll
const calculateFranchisePayments = (
  payrollDetails: PayrollDetails,
  numStudents: number
) => {
  const franchiseFee = payrollDetails.franchiseFee || 0;
  const monthlyFee = payrollDetails.monthlyFee || 0;
  const installment = payrollDetails.installment || 0;
  const royaltyPercent = payrollDetails.royalty || 0;
  const trainingFeePerCI = payrollDetails.ciShare || 0;
  const numCIs = payrollDetails.franchiseShare || 0;

  // Royalty calculations (percentage of monthly fee)
  const royaltyPerStudent = (monthlyFee * royaltyPercent) / 100;
  const monthlyRoyaltyTotal = royaltyPerStudent * numStudents;
  const yearlyRoyaltyTotal = monthlyRoyaltyTotal * 12;

  // Training cost (one-time)
  const totalTrainingCost = trainingFeePerCI * numCIs;

  // Initial costs
  const initialCosts = franchiseFee + installment;

  return {
    initialCosts,
    royaltyPerStudent,
    monthlyRoyaltyTotal,
    yearlyRoyaltyTotal,
    totalTrainingCost,
    firstYearTotal: yearlyRoyaltyTotal + totalTrainingCost + initialCosts,
    monthlyFeePerStudent: monthlyFee,
    royaltyPercent,
    trainingFeePerCI,
    numCIs,
  };
};

export default function PendingApprovals() {
  const [allApplications, setAllApplications] = useState<FranchiseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] =
    useState<FranchiseData | null>(null);
  const [showPayrollDialog, setShowPayrollDialog] = useState(false);
  const [payrollDetails, setPayrollDetails] = useState<PayrollDetails>({
    franchiseId: 0,
    franchiseFee: 0.0,
    dateOfPayment: "",
    dateOfJoining: "",
    monthlyFee: 0.0,
    ciShare: 0.0,
    franchiseShare: 0.0,
    royalty: 0.0,
    totalAmount: 0,
    installment: 0,
  });

  useEffect(() => {
    fetchAllApplications();
  }, []);

  const fetchAllApplications = async () => {
    try {
      setLoading(true);
      const response = await getPendingFranchise();
      setAllApplications(response.result || []);
    } catch (error) {
      console.error("Error fetching applications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (application: FranchiseData) => {
    setSelectedApplication(application);
    setPayrollDetails({
      ...payrollDetails,
      franchiseId: application.id,
    });
    setShowPayrollDialog(true);
  };

  const handleReject = async (application: FranchiseData) => {
    // TODO: Implement rejection logic
    console.log("Rejecting application:", application);
    // You would typically call an API endpoint to reject the application
  };

  const submitPayrollDetails = async () => {
    if (!selectedApplication) return;

    try {
      const payrollData = {
        franchiseFee: Number(payrollDetails.franchiseFee) || 0,
        dateOfPayment: new Date(payrollDetails.dateOfPayment),
        kitCost: Number(payrollDetails.ciShare) || 0,
        materialCost: Number(payrollDetails.franchiseShare) || 0,
        dateOfJoining: new Date(payrollDetails.dateOfJoining),
        monthlyFee: Number(payrollDetails.monthlyFee) || 0,
        ciShare: 0,
        franchiseShare: 0,
        royalty: Number(payrollDetails.royalty) || 0,
        installment: Number(payrollDetails.installment) || 0,
        totalAmount:
          ((Number(payrollDetails.monthlyFee) || 0) *
            (Number(payrollDetails.royalty) || 0)) /
          100,
      };

      await createPayrollDetails(selectedApplication.id, payrollData);

      console.log("Payroll details submitted successfully");
      setShowPayrollDialog(false);
      setSelectedApplication(null);
      await fetchAllApplications(); // Refresh the list
    } catch (error) {
      console.error("Error submitting payroll details:", error);
      // You might want to show a toast notification here
    }
  };

  const handlePayrollChange = (field: keyof PayrollDetails, value: string) => {
    setPayrollDetails((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
        <div className="animate-pulse space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-8 bg-gray-200 rounded-lg w-64"></div>
              <div className="h-4 bg-gray-200 rounded w-96"></div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

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
            onClick={fetchAllApplications}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Stats */}

      {/* Applications Table */}
      <div className="w-full">
        <PendingApprovalsTable
          applications={allApplications}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      </div>

      {/* Empty State */}
      {allApplications.length === 0 && (
        <div className="text-center py-16">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-12 w-12 text-green-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            All caught up!
          </h3>
          <p className="text-gray-600 mb-6">
            There are no franchise applications to review at this time.
          </p>
        </div>
      )}

      {/* Payroll Details Dialog */}
      <Dialog open={showPayrollDialog} onOpenChange={setShowPayrollDialog}>
        <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="pb-3 border-b">
            <DialogTitle className="flex items-center gap-2 text-lg font-medium">
              <Settings className="h-4 w-4 text-green-600" />
              Configure Payroll - {selectedApplication?.franchisee.name}
            </DialogTitle>
          </DialogHeader>

          {selectedApplication && (
            <div className="py-4 space-y-5">
              {/* Franchise Info Header */}
              {/* <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg p-3 border">
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500 text-xs">Franchisee</span>
                    <p className="font-medium">
                      {selectedApplication.franchisee.name}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs">Type</span>
                    <p className="font-medium">{selectedApplication.type}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs">City</span>
                    <p className="font-medium">
                      {selectedApplication.franchisee.city}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs">Email</span>
                    <p className="font-medium text-xs">
                      {selectedApplication.franchisee.mail}
                    </p>
                  </div>
                </div>
              </div> */}

              {/* Two Column Layout */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                {/* Left Column */}
                <div className="space-y-4">
                  {/* Financial Terms */}
                  <div className="border rounded-lg p-4 bg-green-50/30">
                    <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
                      <IndianRupee className="h-4 w-4 text-green-600" />
                      Financial Terms
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">
                          Franchise Fee
                        </Label>
                        <div className="relative">
                          <IndianRupee className="absolute left-2 top-2.5 h-3 w-3 text-gray-400" />
                          <Input
                            type="number"
                            value={payrollDetails.franchiseFee}
                            onChange={(e) =>
                              handlePayrollChange(
                                "franchiseFee",
                                e.target.value
                              )
                            }
                            className="pl-7 h-8 text-sm"
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">
                          Monthly Fee/Student
                        </Label>
                        <div className="relative">
                          <IndianRupee className="absolute left-2 top-2.5 h-3 w-3 text-gray-400" />
                          <Input
                            type="number"
                            value={payrollDetails.monthlyFee}
                            onChange={(e) =>
                              handlePayrollChange("monthlyFee", e.target.value)
                            }
                            className="pl-7 h-8 text-sm"
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">
                          Installment
                        </Label>
                        <div className="relative">
                          <IndianRupee className="absolute left-2 top-2.5 h-3 w-3 text-gray-400" />
                          <Input
                            type="number"
                            value={payrollDetails.installment}
                            onChange={(e) =>
                              handlePayrollChange("installment", e.target.value)
                            }
                            className="pl-7 h-8 text-sm"
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">
                          Royalty/Student (%)
                        </Label>
                        <div className="relative">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={payrollDetails.royalty}
                            onChange={(e) =>
                              handlePayrollChange("royalty", e.target.value)
                            }
                            className="pr-7 h-8 text-sm"
                            placeholder="0"
                          />
                          <span className="absolute right-2 top-2.5 text-xs text-gray-400">
                            %
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          Franchise pays admin per student
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">Kit Cost</Label>
                        <div className="relative">
                          <IndianRupee className="absolute left-2 top-2.5 h-3 w-3 text-gray-400" />
                          <Input
                            type="number"
                            value={payrollDetails.ciShare}
                            onChange={(e) =>
                              handlePayrollChange("ciShare", e.target.value)
                            }
                            className="pl-7 h-8 text-sm"
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">
                          Material Cost
                        </Label>
                        <div className="relative">
                          <IndianRupee className="absolute left-2 top-2.5 h-3 w-3 text-gray-400" />
                          <Input
                            type="number"
                            value={payrollDetails.franchiseShare}
                            onChange={(e) =>
                              handlePayrollChange(
                                "franchiseShare",
                                e.target.value
                              )
                            }
                            className="pl-7 h-8 text-sm"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Renewal Details */}
                  <div className="border rounded-lg p-4 bg-purple-50/30">
                    <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-purple-600" />
                      Renewal Details
                    </h3>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">
                          Renewal Fee
                        </Label>
                        <div className="relative">
                          <IndianRupee className="absolute left-2 top-2.5 h-3 w-3 text-gray-400" />
                          <Input
                            type="number"
                            value={payrollDetails.renewalAmount || ""}
                            onChange={(e) =>
                              handlePayrollChange(
                                "renewalAmount",
                                e.target.value
                              )
                            }
                            className="pl-7 h-8 text-sm"
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">
                          Renewal Date
                        </Label>
                        <Input
                          type="date"
                          value={payrollDetails.renewalDate || ""}
                          onChange={(e) =>
                            handlePayrollChange("renewalDate", e.target.value)
                          }
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">
                        Renewal Amount
                      </Label>
                      <div className="relative">
                        <IndianRupee className="absolute left-2 top-2.5 h-3 w-3 text-gray-400" />
                        <Input
                          type="number"
                          value={payrollDetails.renewalAmount || ""}
                          onChange={(e) =>
                            handlePayrollChange("renewalAmount", e.target.value)
                          }
                          className="pl-7 h-8 text-sm"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  {/* Dates & Terms */}
                  <div className="border rounded-lg p-4 bg-blue-50/30">
                    <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      Dates & Terms
                    </h3>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">
                          Date of Joining
                        </Label>
                        <Input
                          type="date"
                          value={payrollDetails.dateOfJoining}
                          onChange={(e) =>
                            handlePayrollChange("dateOfJoining", e.target.value)
                          }
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">
                          Payment Date
                        </Label>
                        <Input
                          type="date"
                          value={payrollDetails.dateOfPayment}
                          onChange={(e) =>
                            handlePayrollChange("dateOfPayment", e.target.value)
                          }
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">
                          Contract Expiry
                        </Label>
                        <Input
                          type="date"
                          value={payrollDetails.renewalDate || ""}
                          onChange={(e) =>
                            handlePayrollChange("renewalDate", e.target.value)
                          }
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Payment Calculations */}
                  <div className="border rounded-lg p-4 bg-orange-50/30">
                    <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
                      <Calculator className="h-4 w-4 text-orange-600" />
                      Payment Summary
                    </h3>

                    {/* Franchise to Admin Payments */}
                    {(() => {
                      const monthlyFee = Number(payrollDetails.monthlyFee) || 0;
                      const royaltyPercent =
                        Number(payrollDetails.royalty) || 0;

                      const royaltyPerStudent =
                        (monthlyFee * royaltyPercent) / 100;
                      const totalYearlyRoyalty = royaltyPerStudent * 12;

                      return (
                        <div className="space-y-4">
                          {/* Recurring Payments */}
                          <div className="bg-blue-50 border border-blue-200 rounded p-3">
                            <h4 className="font-medium text-xs flex items-center gap-1 mb-2 text-blue-900">
                              <Users className="h-3 w-3" />
                              Royalty Payment (Per Student)
                            </h4>
                            <div className="space-y-1.5 text-xs">
                              <div className="flex justify-between">
                                <span>Monthly Fee per Student:</span>
                                <span className="font-semibold">
                                  ₹{monthlyFee.toLocaleString()}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Royalty Rate:</span>
                                <span className="font-semibold">
                                  {royaltyPercent}%
                                </span>
                              </div>
                              <div className="border-t border-blue-200 pt-1.5">
                                <div className="flex justify-between">
                                  <span className="font-medium">
                                    Royalty per Student (Monthly):
                                  </span>
                                  <span className="font-bold text-blue-900">
                                    ₹{royaltyPerStudent.toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="font-medium">
                                    Royalty per Student (Yearly):
                                  </span>
                                  <span className="font-bold text-blue-900">
                                    ₹{totalYearlyRoyalty.toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-3 border-t">
                <Button
                  onClick={submitPayrollDetails}
                  className="bg-green-600 hover:bg-green-700 text-white h-9 text-sm flex-1"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Approve & Setup Payroll
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowPayrollDialog(false)}
                  className="h-9 text-sm px-6"
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
