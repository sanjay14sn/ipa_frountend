"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
  Users,
  ChevronDown,
} from "lucide-react";
import {
  ProgramRequestRow,
  ApproveProgramRequestPayload,
  approveProgramRequest,
} from "@/services/franchise.service";
import { getErrorMessage } from "@/lib/error-utils";
import { TablePageShell } from "@/components/shared";
import ProgramRequestsTable from "@/app/admin/program-requests/components/ProgramRequestsTable";

type ProgramKit = {
  id: number;
  name: string;
  quantity?: number;
  inventoryId?: number;
  inventory?: {
    id: number;
    name: string;
    description?: string;
    category?: { name?: string };
  };
};
import { toast } from "sonner";

interface ProgramPayrollState {
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
  gstFranchiseFee: boolean;
  gstRoyalty: boolean;
  gstMaterialCost: boolean;
  freeload: boolean;
}

const defaultPayroll = (programId: number, programName: string): ProgramPayrollState => ({
  programId,
  programName,
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
});

export function ProgramRequestsSection() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedRequest, setSelectedRequest] = useState<ProgramRequestRow | null>(null);
  const [showPayrollDialog, setShowPayrollDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [dateOfJoining, setDateOfJoining] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [dateOfPayment, setDateOfPayment] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [payroll, setPayroll] = useState<ProgramPayrollState | null>(null);

  const [kits, setKits] = useState<ProgramKit[]>([]);
  const [selectedKits, setSelectedKits] = useState<Record<number, number>>({});
  const [kitsDropdownOpen, setKitsDropdownOpen] = useState(false);
  const [kitsDropdownWidth, setKitsDropdownWidth] = useState(0);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const triggerRefresh = () => setRefreshTrigger((p) => p + 1);

  const handleApprove = async (request: ProgramRequestRow) => {
    setSelectedRequest(request);
    setDateOfJoining(new Date().toISOString().split("T")[0]);
    setDateOfPayment(new Date().toISOString().split("T")[0]);
    setPayroll(
      defaultPayroll(
        request.programId,
        request.program?.name ?? `Program #${request.programId}`
      )
    );
    setSelectedKits({});
    setKitsDropdownOpen(false);

    setKits([]);

    setShowPayrollDialog(true);
  };

  const handlePayrollChange = (
    field: keyof ProgramPayrollState,
    value: string | number | boolean
  ) => {
    setPayroll((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, [field]: value };

      if (field === "freeload" && value === true) {
        updated.franchiseFee = 0;
        updated.kitCost = 0;
        updated.materialCost = 0;
        updated.monthlyFee = 0;
        updated.installment = 0;
      }

      if (updated.freeload) {
        updated.totalAmount = 0;
      } else {
        const base =
          (Number(updated.franchiseFee) || 0) +
          (Number(updated.kitCost) || 0) +
          (Number(updated.materialCost) || 0) +
          (Number(updated.monthlyFee) || 0) +
          (Number(updated.installment) || 0);
        const gst =
          (!updated.gstFranchiseFee
            ? (Number(updated.franchiseFee) || 0) * 0.18
            : 0) +
          (!updated.gstRoyalty ? (Number(updated.royalty) || 0) * 0.18 : 0) +
          (!updated.gstMaterialCost
            ? (Number(updated.materialCost) || 0) * 0.18
            : 0);
        updated.totalAmount = base + gst;
      }
      return updated;
    });
  };

  const handleKitToggle = (
    inventoryId: number,
    checked: boolean,
    defaultQty = 1
  ) => {
    setSelectedKits((prev) => {
      if (checked) return { ...prev, [inventoryId]: defaultQty };
      const next = { ...prev };
      delete next[inventoryId];
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!selectedRequest || !payroll) return;
    setSubmitting(true);
    try {
      const kitItems = Object.entries(selectedKits)
        .filter(([, qty]) => qty > 0)
        .map(([id, qty]) => ({ inventoryId: Number(id), quantity: qty }));

      const payload: ApproveProgramRequestPayload = {
        payroll: {
          programId: payroll.programId,
          franchiseFee: Number(payroll.franchiseFee) || 0,
          kitCost: Number(payroll.kitCost) || 0,
          materialCost: Number(payroll.materialCost) || 0,
          monthlyFee: Number(payroll.monthlyFee) || 0,
          ciShare: Number(payroll.ciShare) || 0,
          franchiseShare: Number(payroll.franchiseShare) || 0,
          royalty: Number(payroll.royalty) || 0,
          installment: Number(payroll.installment) || 0,
          totalAmount: Number(payroll.totalAmount) || 0,
          gstFranchiseFee: payroll.gstFranchiseFee,
          gstRoyalty: payroll.gstRoyalty,
          gstMaterialCost: payroll.gstMaterialCost,
          freeload: payroll.freeload,
        },
        dateOfPayment,
        dateOfJoining,
        ...(kitItems.length > 0 && { kitItems }),
      };

      await approveProgramRequest(selectedRequest.id, payload);
      toast.success("Program request approved and payroll configured");
      setShowPayrollDialog(false);
      setSelectedRequest(null);
      triggerRefresh();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to approve"));
    } finally {
      setSubmitting(false);
    }
  };

  const selectedKitsCount = kits.filter((k) => {
    const invId = k.inventoryId ?? k.id;
    return selectedKits[invId] && selectedKits[invId] > 0;
  }).length;

  return (
    <TablePageShell
      title="Program Requests"
      description="Review and manage program requests from franchisees with filtering and search capabilities"
      actions={
        <Button
          variant="outline"
          className="border-gray-300 text-gray-700 hover:bg-gray-50"
          onClick={triggerRefresh}
        >
          Refresh
        </Button>
      }
    >
      <div className="w-full">
        <ProgramRequestsTable
          onApprove={handleApprove}
          refreshTrigger={refreshTrigger}
        />
      </div>

      {/* Payroll Dialog */}
      <Dialog open={showPayrollDialog} onOpenChange={setShowPayrollDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4 border-b border-primary">
            <DialogTitle className="flex items-center gap-2 text-xl font-semibold text-gray-900">
              <Settings className="h-5 w-5 text-primary" />
              Setup Payroll for {selectedRequest?.franchise?.name} –{" "}
              {selectedRequest?.program?.name}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 mt-2">
              Configure financial details for this program. All fields are
              required.
            </DialogDescription>
          </DialogHeader>

          {payroll && (
            <div className="py-6 space-y-6">
              {/* Dates */}
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
                      value={dateOfJoining}
                      onChange={(e) => setDateOfJoining(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Payment Date
                    </Label>
                    <Input
                      type="date"
                      value={dateOfPayment}
                      onChange={(e) => setDateOfPayment(e.target.value)}
                      className="h-10"
                    />
                  </div>
                </div>
              </div>

              {/* Payroll fields */}
              <div className="bg-white border-2 border-primary rounded-lg p-5 shadow-sm">
                <div className="mb-4 pb-3 border-b border-primary">
                  <h4 className="font-semibold text-base text-gray-900">
                    {payroll.programName}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Configure financial details for this program
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <input
                      type="checkbox"
                      id="freeload"
                      checked={payroll.freeload}
                      onChange={(e) =>
                        handlePayrollChange("freeload", e.target.checked)
                      }
                    />
                    <Label
                      htmlFor="freeload"
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
                          checked={payroll.gstFranchiseFee}
                          onChange={(e) =>
                            handlePayrollChange("gstFranchiseFee", e.target.checked)
                          }
                          disabled={payroll.freeload}
                        />
                        <span className="text-xs text-gray-600">GST Inc.</span>
                      </label>
                    </div>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        type="number"
                        value={payroll.franchiseFee || ""}
                        onChange={(e) =>
                          handlePayrollChange(
                            "franchiseFee",
                            e.target.value === "" ? 0 : Number(e.target.value)
                          )
                        }
                        className="pl-10 h-10"
                        placeholder="0"
                        disabled={payroll.freeload}
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
                        value={payroll.kitCost || ""}
                        onChange={(e) =>
                          handlePayrollChange(
                            "kitCost",
                            e.target.value === "" ? 0 : Number(e.target.value)
                          )
                        }
                        className="pl-10 h-10"
                        placeholder="0"
                        disabled={payroll.freeload}
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
                          checked={payroll.gstMaterialCost}
                          onChange={(e) =>
                            handlePayrollChange(
                              "gstMaterialCost",
                              e.target.checked
                            )
                          }
                          disabled={payroll.freeload}
                        />
                        <span className="text-xs text-gray-600">GST Inc.</span>
                      </label>
                    </div>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        type="number"
                        value={payroll.materialCost || ""}
                        onChange={(e) =>
                          handlePayrollChange(
                            "materialCost",
                            e.target.value === "" ? 0 : Number(e.target.value)
                          )
                        }
                        className="pl-10 h-10"
                        placeholder="0"
                        disabled={payroll.freeload}
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
                        value={payroll.monthlyFee || ""}
                        onChange={(e) =>
                          handlePayrollChange(
                            "monthlyFee",
                            e.target.value === "" ? 0 : Number(e.target.value)
                          )
                        }
                        className="pl-10 h-10"
                        placeholder="0"
                        disabled={payroll.freeload}
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
                        value={payroll.installment || ""}
                        onChange={(e) =>
                          handlePayrollChange(
                            "installment",
                            e.target.value === "" ? 0 : Number(e.target.value)
                          )
                        }
                        className="pl-10 h-10"
                        placeholder="0"
                        disabled={payroll.freeload}
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
                          checked={payroll.gstRoyalty}
                          onChange={(e) =>
                            handlePayrollChange("gstRoyalty", e.target.checked)
                          }
                          disabled={payroll.freeload}
                        />
                        <span className="text-xs text-gray-600">GST Inc.</span>
                      </label>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-sm text-gray-400">
                        ₹
                      </span>
                      <Input
                        type="number"
                        value={payroll.royalty || ""}
                        onChange={(e) =>
                          handlePayrollChange(
                            "royalty",
                            e.target.value === "" ? 0 : Number(e.target.value)
                          )
                        }
                        className="pl-10 h-10"
                        placeholder="0"
                        disabled={payroll.freeload}
                      />
                    </div>
                  </div>

                  {/* CI Share */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      CI Share (per month)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-sm text-gray-400">
                        ₹
                      </span>
                      <Input
                        type="number"
                        value={payroll.ciShare || ""}
                        onChange={(e) =>
                          handlePayrollChange(
                            "ciShare",
                            e.target.value === "" ? 0 : Number(e.target.value)
                          )
                        }
                        className="pl-10 h-10"
                        placeholder="0"
                        disabled={payroll.freeload}
                      />
                    </div>
                  </div>

                  {/* Franchise Share */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Franchise Share (per month)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-sm text-gray-400">
                        ₹
                      </span>
                      <Input
                        type="number"
                        value={payroll.franchiseShare || ""}
                        onChange={(e) =>
                          handlePayrollChange(
                            "franchiseShare",
                            e.target.value === "" ? 0 : Number(e.target.value)
                          )
                        }
                        className="pl-10 h-10"
                        placeholder="0"
                        disabled={payroll.freeload}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Grand Total */}
              <div className="bg-primary/10 border-2 border-primary rounded-lg p-5">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">
                      Total (One-time)
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Incl. GST where applicable
                    </p>
                  </div>
                  <p className="text-3xl font-bold text-primary">
                    ₹
                    {(() => {
                      const fee = Number(payroll.franchiseFee || 0);
                      return (
                        payroll.gstFranchiseFee ? fee : fee + fee * 0.18
                      ).toLocaleString();
                    })()}
                  </p>
                </div>
                <div className="mt-5 pt-5 border-t-2 border-primary space-y-3">
                  <div className="flex justify-between items-center py-2 px-3 bg-white border border-primary rounded">
                    <span className="text-sm font-medium text-gray-700">
                      Franchisor Royalty (per student/month):
                    </span>
                    <span className="text-base font-bold text-primary">
                      ₹
                      {(() => {
                        const r = Number(payroll.royalty || 0);
                        return (
                          payroll.gstRoyalty ? r : r + r * 0.18
                        ).toLocaleString();
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 px-3 bg-white border border-primary rounded">
                    <span className="text-sm font-medium text-gray-700">
                      CI Share (per student/month):
                    </span>
                    <span className="text-base font-bold text-primary">
                      ₹{Number(payroll.ciShare || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Starting Kit Selection */}
              {kits.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg text-gray-900 flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Starting Kit Items
                  </h3>
                  <div className="bg-white border-2 border-primary rounded-lg p-5 shadow-sm">
                    <Popover
                      open={kitsDropdownOpen}
                      onOpenChange={(open) => {
                        setKitsDropdownOpen(open);
                        if (open && triggerRef.current) {
                          setKitsDropdownWidth(
                            triggerRef.current.offsetWidth || 0
                          );
                        }
                      }}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          ref={triggerRef}
                          variant="outline"
                          className="w-full justify-between border-primary hover:bg-primary/10"
                        >
                          <span className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            {selectedKitsCount > 0
                              ? `${selectedKitsCount} item${selectedKitsCount > 1 ? "s" : ""} selected`
                              : "Select Kit Items"}
                          </span>
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="p-0"
                        align="start"
                        side="top"
                        style={{ width: kitsDropdownWidth || "100%" }}
                      >
                        <div className="p-2">
                          <div className="text-sm font-medium text-gray-900 mb-2 px-2">
                            Select kit items
                          </div>
                          <div className="max-h-[300px] overflow-y-auto">
                            {kits.map((kit) => {
                              const invId = kit.inventoryId ?? kit.id;
                              const isSelected = !!(
                                selectedKits[invId] && selectedKits[invId] > 0
                              );
                              const qty = selectedKits[invId] || 1;
                              return (
                                <div
                                  key={kit.id}
                                  className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded"
                                >
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={(checked) =>
                                      handleKitToggle(
                                        invId,
                                        checked === true,
                                        1
                                      )
                                    }
                                    className="flex-shrink-0"
                                  />
                                  <div className="flex-1 min-w-0 flex items-center gap-3">
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-sm text-gray-900 truncate">
                                        {kit.inventory?.name ??
                                          `Item #${invId}`}
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
                                          value={qty || ""}
                                          onChange={(e) => {
                                            const v = e.target.value;
                                            setSelectedKits((prev) => ({
                                              ...prev,
                                              [invId]:
                                                v === ""
                                                  ? 1
                                                  : Math.max(
                                                      1,
                                                      parseInt(v) || 1
                                                    ),
                                            }));
                                          }}
                                          className="w-16 h-8 text-sm"
                                          onClick={(e) => e.stopPropagation()}
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
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t-2 border-primary">
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="bg-primary hover:bg-primary/90 text-white h-11 text-base flex-1 font-semibold"
                >
                  <CheckCircle className="h-5 w-5 mr-2" />
                  {submitting ? "Approving..." : "Approve & Setup Payroll"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowPayrollDialog(false)}
                  className="h-11 text-base px-8 border-2 border-primary hover:bg-primary/10"
                  disabled={submitting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </TablePageShell>
  );
}
