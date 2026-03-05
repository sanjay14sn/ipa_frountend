"use client";

import { useState, useEffect, useRef } from "react";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

import {
  CheckCircle,
  IndianRupee,
  Settings,
  Calendar,
  Calculator,
  Users,
  ChevronDown,
} from "lucide-react";
import {
  createPayrollDetails,
  type FranchiseData,
  rejectFranchise,
} from "@/services/franchisee.service";
import { PayrollDetails } from "./types";
import PendingApprovalsTable from "./components/PendingApprovalsTable";
import {
  getProgramKits,
  type ProgramKit,
} from "@/services/starting-kit.service";

export default function PendingApprovals() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedApplication, setSelectedApplication] =
    useState<FranchiseData | null>(null);
  const [showPayrollDialog, setShowPayrollDialog] = useState(false);
  const [payrollDetails, setPayrollDetails] = useState<PayrollDetails>({
    franchiseId: "",
    dateOfPayment: "",
    dateOfJoining: "",
    programPayrolls: [],
  });
  const [programKits, setProgramKits] = useState<Record<number, ProgramKit[]>>(
    {},
  );
  const [selectedKits, setSelectedKits] = useState<
    Record<number, Record<number, number>>
  >({});
  const [openDropdowns, setOpenDropdowns] = useState<Record<number, boolean>>(
    {},
  );
  const [dropdownWidths, setDropdownWidths] = useState<Record<number, number>>(
    {},
  );
  const triggerRefs = useRef<Record<number, HTMLButtonElement | null>>({});

  const triggerRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleApprove = async (application: FranchiseData) => {
    setSelectedApplication(application);

    // Initialize program payrolls based on franchisePrograms
    const programPayrolls =
      application.franchisePrograms?.map((fp) => ({
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
        gstFranchiseFee: false,
        gstRoyalty: false,
        gstMaterialCost: false,
        freeload: false,
      })) || [];

    setPayrollDetails({
      franchiseId: application.id,
      dateOfPayment: new Date().toISOString().split("T")[0],
      dateOfJoining: new Date().toISOString().split("T")[0],
      programPayrolls,
    });

    // Fetch kit items for each program
    const kitsData: Record<number, ProgramKit[]> = {};
    const selectedData: Record<number, Record<number, number>> = {};

    if (application.franchisePrograms) {
      for (const fp of application.franchisePrograms) {
        try {
          const kits = await getProgramKits(fp.program.id);
          kitsData[fp.program.id] = kits;
          // Initialize with no items selected by default
          selectedData[fp.program.id] = {};
        } catch (error) {
          console.error(
            `Error fetching kits for program ${fp.program.id}:`,
            error,
          );
          kitsData[fp.program.id] = [];
          selectedData[fp.program.id] = {};
        }
      }
    }

    setProgramKits(kitsData);
    setSelectedKits(selectedData);
    setOpenDropdowns({});
    setShowPayrollDialog(true);
  };

  const handleReject = async (application: FranchiseData) => {
    if (!application?.id) return;
    const confirmed = window.confirm(
      `Reject franchise application for "${application.name}"? This will notify the franchisee.`,
    );
    if (!confirmed) return;

    try {
      await rejectFranchise(application.id);
      triggerRefresh();
    } catch (error) {
      console.error("Error rejecting franchise:", error);
      alert("Failed to reject application. Please try again.");
    }
  };

  const submitPayrollDetails = async () => {
    if (!selectedApplication) return;

    try {
      // Build franchise program kits from selected items
      const franchiseProgramKits = payrollDetails.programPayrolls
        .map((pp) => {
          const kits = programKits[pp.programId] || [];
          const selected = selectedKits[pp.programId] || {};
          const kitItems = Object.entries(selected)
            .filter(([_, quantity]) => quantity > 0)
            .map(([inventoryId, quantity]) => ({
              inventoryId: Number(inventoryId),
              quantity: quantity,
            }));

          return kitItems.length > 0
            ? {
                programId: pp.programId,
                kitItems,
              }
            : null;
        })
        .filter((kit) => kit !== null);

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
          gstFranchiseFee: Boolean(pp.gstFranchiseFee ?? false),
          gstRoyalty: Boolean(pp.gstRoyalty ?? false),
          gstMaterialCost: Boolean(pp.gstMaterialCost ?? false),
          freeload: Boolean(pp.freeload),
        })),
        ...(franchiseProgramKits.length > 0 && {
          franchiseProgramKits,
        }),
      };

      await createPayrollDetails(selectedApplication.id, payrollData);

      setShowPayrollDialog(false);
      setSelectedApplication(null);
      setProgramKits({});
      setSelectedKits({});
      setOpenDropdowns({});
      triggerRefresh(); // Refresh the list
    } catch (error) {
      console.error("Error submitting payroll details:", error);
      alert("Failed to submit payroll details. Please try again.");
    }
  };

  const handleKitToggle = (
    programId: number,
    inventoryId: number,
    checked: boolean,
    defaultQuantity: number = 1,
  ) => {
    setSelectedKits((prev) => {
      const programKits = prev[programId] || {};

      if (checked) {
        return {
          ...prev,
          [programId]: {
            ...programKits,
            [inventoryId]: defaultQuantity,
          },
        };
      } else {
        const updated = { ...programKits };
        delete updated[inventoryId];
        return {
          ...prev,
          [programId]: updated,
        };
      }
    });
  };

  const handleQuantityChange = (
    programId: number,
    inventoryId: number,
    quantity: number,
  ) => {
    setSelectedKits((prev) => ({
      ...prev,
      [programId]: {
        ...prev[programId],
        [inventoryId]: Math.max(1, quantity),
      },
    }));
  };

  const handleProgramPayrollChange = (
    programIndex: number,
    field: keyof import("./types").ProgramPayroll,
    value: string | number | boolean,
  ) => {
    setPayrollDetails((prev) => {
      const updatedProgramPayrolls = [...prev.programPayrolls];
      updatedProgramPayrolls[programIndex] = {
        ...updatedProgramPayrolls[programIndex],
        [field]: value,
      };

      const program = updatedProgramPayrolls[programIndex];

      // If freeload toggled on, zero-out main amounts
      if (field === "freeload" && value === true) {
        program.franchiseFee = 0;
        program.kitCost = 0;
        program.materialCost = 0;
        program.monthlyFee = 0;
        program.installment = 0;
      }

      // Recalc totalAmount: base sum + GST only on franchise fee, royalty, material cost when their flags are set
      const baseSum =
        (Number(program.franchiseFee) || 0) +
        (Number(program.kitCost) || 0) +
        (Number(program.materialCost) || 0) +
        (Number(program.monthlyFee) || 0) +
        (Number(program.installment) || 0);

      if (program.freeload) {
        updatedProgramPayrolls[programIndex].totalAmount = 0;
      } else {
        const gstRate = 0.18;
        const gstExtra =
          (!program.gstFranchiseFee
            ? (Number(program.franchiseFee) || 0) * gstRate
            : 0) +
          (!program.gstRoyalty ? (Number(program.royalty) || 0) * gstRate : 0) +
          (!program.gstMaterialCost
            ? (Number(program.materialCost) || 0) * gstRate
            : 0);
        updatedProgramPayrolls[programIndex].totalAmount = baseSum + gstExtra;
      }

      return {
        ...prev,
        programPayrolls: updatedProgramPayrolls,
      };
    });
  };

  const handleDateChange = (
    field: "dateOfPayment" | "dateOfJoining",
    value: string,
  ) => {
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
              Configure financial details for each program. All fields are
              required.
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
                      onChange={(e) =>
                        handleDateChange("dateOfJoining", e.target.value)
                      }
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
                      onChange={(e) =>
                        handleDateChange("dateOfPayment", e.target.value)
                      }
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
                      <div className="flex items-center gap-2 mt-3">
                        <input
                          type="checkbox"
                          id={`freeload-${program.programId}`}
                          checked={program.freeload}
                          onChange={(e) =>
                            handleProgramPayrollChange(
                              index,
                              "freeload",
                              e.target.checked,
                            )
                          }
                        />
                        <Label
                          htmlFor={`freeload-${program.programId}`}
                          className="text-sm font-medium text-gray-700 cursor-pointer"
                        >
                          No Payment Required – Franchisee will not be charged
                        </Label>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      {/* Franchise Fee */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm font-medium text-gray-700">
                            Franchise Fee
                          </Label>
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={program.gstFranchiseFee}
                              onChange={(e) =>
                                handleProgramPayrollChange(
                                  index,
                                  "gstFranchiseFee",
                                  e.target.checked,
                                )
                              }
                              disabled={program.freeload}
                            />
                            <span
                              className="text-xs text-gray-600"
                              title="Check if amount includes GST; uncheck to add GST on checkout"
                            >
                              GST Inc.
                            </span>
                          </label>
                        </div>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            type="number"
                            value={
                              program.franchiseFee === 0 ||
                              program.franchiseFee === undefined ||
                              program.franchiseFee === null
                                ? ""
                                : program.franchiseFee
                            }
                            onChange={(e) => {
                              const val = e.target.value;
                              handleProgramPayrollChange(
                                index,
                                "franchiseFee",
                                val === "" ? 0 : Number(val),
                              );
                            }}
                            className="pl-10 h-10"
                            placeholder="0"
                            disabled={program.freeload}
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
                            value={
                              program.kitCost === 0 ||
                              program.kitCost === undefined ||
                              program.kitCost === null
                                ? ""
                                : program.kitCost
                            }
                            onChange={(e) => {
                              const val = e.target.value;
                              handleProgramPayrollChange(
                                index,
                                "kitCost",
                                val === "" ? 0 : Number(val),
                              );
                            }}
                            className="pl-10 h-10"
                            placeholder="0"
                            disabled={program.freeload}
                          />
                        </div>
                      </div>

                      {/* Material Cost */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm font-medium text-gray-700">
                            Material Cost
                          </Label>
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={program.gstMaterialCost}
                              onChange={(e) =>
                                handleProgramPayrollChange(
                                  index,
                                  "gstMaterialCost",
                                  e.target.checked,
                                )
                              }
                              disabled={program.freeload}
                            />
                            <span
                              className="text-xs text-gray-600"
                              title="Check if amount includes GST; uncheck to add GST on checkout"
                            >
                              GST Inc.
                            </span>
                          </label>
                        </div>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            type="number"
                            value={
                              program.materialCost === 0 ||
                              program.materialCost === undefined ||
                              program.materialCost === null
                                ? ""
                                : program.materialCost
                            }
                            onChange={(e) => {
                              const val = e.target.value;
                              handleProgramPayrollChange(
                                index,
                                "materialCost",
                                val === "" ? 0 : Number(val),
                              );
                            }}
                            className="pl-10 h-10"
                            placeholder="0"
                            disabled={program.freeload}
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
                            value={
                              program.monthlyFee === 0 ||
                              program.monthlyFee === undefined ||
                              program.monthlyFee === null
                                ? ""
                                : program.monthlyFee
                            }
                            onChange={(e) => {
                              const val = e.target.value;
                              handleProgramPayrollChange(
                                index,
                                "monthlyFee",
                                val === "" ? 0 : Number(val),
                              );
                            }}
                            className="pl-10 h-10"
                            placeholder="0"
                            disabled={program.freeload}
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
                            value={
                              program.installment === 0 ||
                              program.installment === undefined ||
                              program.installment === null
                                ? ""
                                : program.installment
                            }
                            onChange={(e) => {
                              const val = e.target.value;
                              handleProgramPayrollChange(
                                index,
                                "installment",
                                val === "" ? 0 : Number(val),
                              );
                            }}
                            className="pl-10 h-10"
                            placeholder="0"
                            disabled={program.freeload}
                          />
                        </div>
                      </div>

                      {/* Royalty */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm font-medium text-gray-700">
                            Royalty/Student (per month)
                          </Label>
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={program.gstRoyalty}
                              onChange={(e) =>
                                handleProgramPayrollChange(
                                  index,
                                  "gstRoyalty",
                                  e.target.checked,
                                )
                              }
                              disabled={program.freeload}
                            />
                            <span
                              className="text-xs text-gray-600"
                              title="Check if amount includes GST; uncheck to add GST on checkout"
                            >
                              GST Inc.
                            </span>
                          </label>
                        </div>
                        <div className="relative">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                              program.royalty === 0 ||
                              program.royalty === undefined ||
                              program.royalty === null
                                ? ""
                                : program.royalty
                            }
                            onChange={(e) => {
                              const val = e.target.value;
                              handleProgramPayrollChange(
                                index,
                                "royalty",
                                val === "" ? 0 : Number(val),
                              );
                            }}
                            className="pl-10 h-10"
                            placeholder="0"
                            disabled={program.freeload}
                          />
                          <span className="absolute left-3 top-3 text-sm text-gray-400">
                            ₹
                          </span>
                        </div>
                      </div>

                      {/* CI Share */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">
                          CI Share (per month)
                        </Label>
                        <div className="relative">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                              program.ciShare === 0 ||
                              program.ciShare === undefined ||
                              program.ciShare === null
                                ? ""
                                : program.ciShare
                            }
                            onChange={(e) => {
                              const val = e.target.value;
                              handleProgramPayrollChange(
                                index,
                                "ciShare",
                                val === "" ? 0 : Number(val),
                              );
                            }}
                            className="pl-10 h-10"
                            placeholder="0"
                            disabled={program.freeload}
                          />
                          <span className="absolute left-3 top-3 text-sm text-gray-400">
                            ₹
                          </span>
                        </div>
                      </div>

                      {/* Franchise Share */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">
                          Franchise Share (per month)
                        </Label>
                        <div className="relative">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                              program.franchiseShare === 0 ||
                              program.franchiseShare === undefined ||
                              program.franchiseShare === null
                                ? ""
                                : program.franchiseShare
                            }
                            onChange={(e) => {
                              const val = e.target.value;
                              handleProgramPayrollChange(
                                index,
                                "franchiseShare",
                                val === "" ? 0 : Number(val),
                              );
                            }}
                            className="pl-10 h-10"
                            placeholder="0"
                            disabled={program.freeload}
                          />
                          <span className="absolute left-3 top-3 text-sm text-gray-400">
                            ₹
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Grand Total Summary */}
              <div className="bg-primary/10 border-2 border-primary rounded-lg p-5">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">
                      Grand Total (All Programs)
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      One-time payment (incl. GST where applicable)
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-primary">
                      ₹
                      {payrollDetails.programPayrolls
                        .reduce((sum, p) => {
                          const fee = Number(p.franchiseFee || 0);
                          const feeWithGst = p.gstFranchiseFee
                            ? fee
                            : fee + fee * 0.18;
                          return sum + feeWithGst;
                        }, 0)
                        .toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Monthly Royalty Section - fixed amounts, not percentages */}
                <div className="mt-5 pt-5 border-t-2 border-primary space-y-3">
                  {(() => {
                    const programCount =
                      payrollDetails.programPayrolls.length || 1;
                    const adminRoyaltyPerStudent =
                      payrollDetails.programPayrolls.reduce((sum, p) => {
                        const royalty = Number(p.royalty || 0);
                        const royaltyWithGst = p.gstRoyalty
                          ? royalty
                          : royalty + royalty * 0.18;
                        return sum + royaltyWithGst;
                      }, 0) / programCount;

                    const ciSharePerStudent =
                      payrollDetails.programPayrolls.reduce(
                        (sum, p) => sum + Number(p.ciShare || 0),
                        0,
                      ) / programCount;

                    return (
                      <>
                        <div className="flex justify-between items-center py-2 px-3 bg-white border border-primary rounded">
                          <span className="text-sm font-medium text-gray-700">
                            Franchisor Royalty (per student/month):
                          </span>
                          <span className="text-base font-bold text-primary">
                            ₹{adminRoyaltyPerStudent.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 px-3 bg-white border border-primary rounded">
                          <span className="text-sm font-medium text-gray-700">
                            CI Share (per student/month):
                          </span>
                          <span className="text-base font-bold text-primary">
                            ₹{ciSharePerStudent.toLocaleString()}
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Starting Kit Selection Section */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg text-gray-900 flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Starting Kit Items Selection
                </h3>
                <p className="text-sm text-gray-600">
                  Select kit items for each program using the dropdown below.
                </p>

                {payrollDetails.programPayrolls.map((program) => {
                  const kits = programKits[program.programId] || [];
                  const selected = selectedKits[program.programId] || {};
                  const isDropdownOpen =
                    openDropdowns[program.programId] || false;

                  // Count selected items (with quantity > 0)
                  const selectedCount = kits.filter(
                    (kit) =>
                      selected[kit.inventoryId] &&
                      selected[kit.inventoryId] > 0,
                  ).length;

                  if (kits.length === 0) {
                    return (
                      <div
                        key={program.programId}
                        className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                      >
                        <h4 className="font-semibold text-base text-gray-900 mb-2">
                          {program.programName}
                        </h4>
                        <p className="text-sm text-gray-600">
                          No kit items configured for this program.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={program.programId}
                      className="bg-white border-2 border-primary rounded-lg p-5 shadow-sm"
                    >
                      <div className="mb-4 pb-3 border-b border-primary">
                        <h4 className="font-semibold text-base text-gray-900">
                          {program.programName}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Select kit items for this program
                        </p>
                      </div>

                      {/* Dropdown to Select Items */}
                      <Popover
                        open={isDropdownOpen}
                        onOpenChange={(open) => {
                          setOpenDropdowns((prev) => ({
                            ...prev,
                            [program.programId]: open,
                          }));
                          // Measure trigger width when opening
                          if (open && triggerRefs.current[program.programId]) {
                            const width =
                              triggerRefs.current[program.programId]
                                ?.offsetWidth || 0;
                            setDropdownWidths((prev) => ({
                              ...prev,
                              [program.programId]: width,
                            }));
                          }
                        }}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            ref={(el) => {
                              triggerRefs.current[program.programId] = el;
                            }}
                            variant="outline"
                            className="w-full justify-between border-primary hover:bg-primary/10"
                          >
                            <span className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              {selectedCount > 0
                                ? `${selectedCount} item${selectedCount > 1 ? "s" : ""} selected`
                                : "Select Kit Items"}
                            </span>
                            <ChevronDown className="h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="p-0"
                          align="start"
                          side="top"
                          style={{
                            width: dropdownWidths[program.programId] || "100%",
                            minWidth: "100%",
                          }}
                        >
                          <div className="p-2">
                            <div className="text-sm font-medium text-gray-900 mb-2 px-2">
                              Select kit items
                            </div>
                            <div className="max-h-[300px] overflow-y-auto">
                              {kits.map((kit) => {
                                const isSelected = !!(
                                  selected[kit.inventoryId] &&
                                  selected[kit.inventoryId] > 0
                                );
                                const quantity = selected[kit.inventoryId] || 1;

                                return (
                                  <div
                                    key={kit.id}
                                    className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded"
                                  >
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={(checked) =>
                                        handleKitToggle(
                                          program.programId,
                                          kit.inventoryId,
                                          checked === true,
                                          1,
                                        )
                                      }
                                      className="flex-shrink-0"
                                    />
                                    <div className="flex-1 min-w-0 flex items-center gap-3">
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm text-gray-900 truncate">
                                          {kit.inventory?.name ||
                                            `Item #${kit.inventoryId}`}
                                        </p>
                                        {kit.inventory?.description && (
                                          <p className="text-xs text-gray-600 truncate">
                                            {kit.inventory.description}
                                          </p>
                                        )}
                                      </div>
                                      {kit.inventory?.category && (
                                        <span className="text-xs text-gray-500 whitespace-nowrap">
                                          {kit.inventory.category.name}
                                        </span>
                                      )}
                                      {isSelected && (
                                        <div className="flex items-center gap-2">
                                          <Label className="text-xs text-gray-600 whitespace-nowrap">
                                            Qty:
                                          </Label>
                                          <Input
                                            type="number"
                                            min="1"
                                            value={
                                              quantity === 0 ||
                                              quantity === undefined ||
                                              quantity === null
                                                ? ""
                                                : quantity
                                            }
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              handleQuantityChange(
                                                program.programId,
                                                kit.inventoryId,
                                                val === ""
                                                  ? 1
                                                  : parseInt(val) || 1,
                                              );
                                            }}
                                            className="w-16 h-8 text-sm"
                                            onClick={(e) => e.stopPropagation()}
                                            onFocus={(e) => e.stopPropagation()}
                                          />
                                        </div>
                                      )}
                                      {!isSelected && (
                                        <span className="text-xs text-gray-500 whitespace-nowrap">
                                          Default: 1
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  );
                })}
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
