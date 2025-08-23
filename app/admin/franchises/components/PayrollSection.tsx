import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronRight, Edit2, Save, X } from "lucide-react";
import {
  FranchisePayrollResponse,
  updatePayrollDetails,
} from "@/services/franchisee.service";
import React, { useEffect, useState, useRef } from "react";

interface PayrollSectionProps {
  payrollDetails?: FranchisePayrollResponse;
  clientId: string;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  onPayrollUpdate?: (updatedPayroll: FranchisePayrollResponse) => void;
}

export const payrollDotRef = React.createRef<HTMLDivElement>();
export const payrollInternalDotRef = React.createRef<HTMLDivElement>();

export default function PayrollSection({
  payrollDetails,
  clientId,
  isExpanded,
  onToggle,
  onPayrollUpdate,
}: PayrollSectionProps) {
  const sectionId = `${clientId}-payroll`;
  const containerRef = useRef<HTMLDivElement>(null);
  const [lineHeight, setLineHeight] = useState(0);
  const [isEditing, setIsEditing] = useState(false);

  // Default payroll details if none provided
  const defaultPayrollDetails: FranchisePayrollResponse = {
    id: 0,
    franchiseFee: 0,
    dateOfPayment: new Date(),
    dateOfJoining: new Date(),
    monthlyFee: 0,
    ciShare: 0,
    franchiseShare: 0,
    royalty: 0,
    kitCost: 0,
    materialCost: 0,
    installment: 0,
    totalAmount: 0,
  };

  const safePayrollDetails = payrollDetails || defaultPayrollDetails;
  const [editedData, setEditedData] =
    useState<FranchisePayrollResponse>(safePayrollDetails);
  const [isLoading, setIsLoading] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  useEffect(() => {
    if (containerRef.current && payrollInternalDotRef.current && isExpanded) {
      const containerTop = containerRef.current.getBoundingClientRect().top;
      const dotCenter =
        payrollInternalDotRef.current.getBoundingClientRect().top +
        payrollInternalDotRef.current.offsetHeight / 2;
      setLineHeight(dotCenter - containerTop);
    }
  }, [isExpanded, safePayrollDetails]);

  useEffect(() => {
    setEditedData(safePayrollDetails);
  }, []);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditedData(safePayrollDetails);
    setIsEditing(false);
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      const updatedPayroll = await updatePayrollDetails(safePayrollDetails.id, {
        franchiseFee: editedData.franchiseFee,
        monthlyFee: editedData.monthlyFee,
        ciShare: editedData.ciShare,
        franchiseShare: editedData.franchiseShare,
        royalty: editedData.royalty,
        kitCost: editedData.kitCost,
        materialCost: editedData.materialCost,
        installment: editedData.installment,
        totalAmount: editedData.totalAmount,
        dateOfPayment: editedData.dateOfPayment,
        dateOfJoining: editedData.dateOfJoining,
      });

      if (onPayrollUpdate) {
        onPayrollUpdate(editedData);
      }
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating payroll details:", error);
      alert("Failed to update payroll details. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (
    field: keyof FranchisePayrollResponse,
    value: string | number | Date
  ) => {
    setEditedData((prev) => {
      const updated = {
        ...prev,
        [field]: value,
      };

      // Auto-calculate total amount when relevant fields change
      if (
        [
          "franchiseFee",
          "monthlyFee",
          "kitCost",
          "materialCost",
          "installment",
        ].includes(field)
      ) {
        updated.totalAmount =
          (updated.franchiseFee || 0) +
          (updated.monthlyFee || 0) +
          (updated.kitCost || 0) +
          (updated.materialCost || 0) +
          (updated.installment || 0);
      }

      return updated;
    });
  };

  const renderEditableField = (
    label: string,
    field: keyof FranchisePayrollResponse,
    value: number | string | Date,
    type: "currency" | "percentage" | "date" | "number" = "number"
  ) => {
    const currentValue = isEditing ? editedData[field] : value;

    if (!isEditing) {
      let displayValue: string;
      switch (type) {
        case "currency":
          displayValue = formatCurrency(currentValue as number);
          break;
        case "percentage":
          displayValue = `${currentValue}%`;
          break;
        case "date":
          displayValue = formatDate(currentValue as Date);
          break;
        default:
          displayValue = currentValue.toString();
      }

      return (
        <div>
          <span className="text-gray-500">{label}</span>
          <p className="text-gray-900 mt-1 font-medium">{displayValue}</p>
        </div>
      );
    }

    return (
      <div>
        <span className="text-gray-500 text-sm">{label}</span>
        <Input
          type={type === "date" ? "date" : "number"}
          value={
            type === "date"
              ? (currentValue as Date)?.toISOString?.()?.split("T")[0] || ""
              : currentValue.toString()
          }
          onChange={(e) => {
            let newValue: string | number | Date = e.target.value;
            if (type === "date") {
              newValue = new Date(e.target.value);
            } else {
              newValue = parseFloat(e.target.value) || 0;
            }
            handleInputChange(field, newValue);
          }}
          className="mt-1 h-8 text-sm"
          step={
            type === "percentage" ? "0.1" : type === "currency" ? "0.01" : "1"
          }
          min="0"
        />
      </div>
    );
  };

  return (
    <div className="relative">
      <div ref={payrollDotRef} className="absolute -left-6 top-1 w-6 h-4">
        <div className="absolute top-0 left-0 w-6 h-4 border-l-2 border-b-2 border-primary rounded-bl-lg"></div>
        <div className="absolute top-4 left-6 w-2 h-2 bg-primary rounded-full -translate-x-1 -translate-y-1"></div>
      </div>

      <div className="bg-white rounded-lg border border-primary">
        <div className="p-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggle(sectionId)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
            <h4 className="font-medium text-gray-900">Payroll Details</h4>
            <Badge variant="outline" className="ml-2">
              {formatCurrency(
                isEditing
                  ? editedData.totalAmount
                  : safePayrollDetails.totalAmount
              )}
            </Badge>
          </div>

          {isExpanded && (
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button
                    onClick={handleSave}
                    disabled={isLoading}
                    size="sm"
                    className="h-7 px-2"
                  >
                    <Save className="w-3 h-3 mr-1" />
                    Save
                  </Button>
                  <Button
                    onClick={handleCancel}
                    disabled={isLoading}
                    variant="outline"
                    size="sm"
                    className="h-7 px-2"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  onClick={handleEdit}
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                >
                  <Edit2 className="w-3 h-3 mr-1" />
                  Edit
                </Button>
              )}
            </div>
          )}
        </div>

        {isExpanded && (
          <div className="relative border-t border-black" ref={containerRef}>
            <div
              className="absolute left-6 border-primary border bg-primary"
              style={{ top: 0, height: `${lineHeight - 6}px` }}
            ></div>
            <div className="pl-12 pr-4 py-4">
              <div className="relative">
                <div
                  ref={payrollInternalDotRef}
                  className="absolute -left-6 top-4 w-6 h-4"
                >
                  <div className="absolute top-0 left-0 w-6 h-4 border-l-2 border-b-2 border-primary rounded-bl-lg"></div>
                  <div className="absolute top-4 left-6 w-2 h-2 bg-primary rounded-full -translate-x-1 -translate-y-1"></div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 space-y-4 border border-primary">
                  <h5 className="font-semibold text-gray-900">
                    Financial Overview
                  </h5>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {renderEditableField(
                      "Franchise Fee",
                      "franchiseFee",
                      safePayrollDetails.franchiseFee,
                      "currency"
                    )}
                    {renderEditableField(
                      "Monthly Fee",
                      "monthlyFee",
                      safePayrollDetails.monthlyFee,
                      "currency"
                    )}
                    {renderEditableField(
                      "Kit Cost",
                      "kitCost",
                      safePayrollDetails.kitCost,
                      "currency"
                    )}
                    {renderEditableField(
                      "Material Cost",
                      "materialCost",
                      safePayrollDetails.materialCost,
                      "currency"
                    )}
                    {renderEditableField(
                      "Installment",
                      "installment",
                      safePayrollDetails.installment,
                      "currency"
                    )}
                    <div>
                      <span className="text-gray-500">Total Amount</span>
                      <p
                        className={`text-gray-900 mt-1 font-semibold ${
                          isEditing ? "text-sm" : ""
                        }`}
                      >
                        {formatCurrency(
                          isEditing
                            ? editedData.totalAmount
                            : safePayrollDetails.totalAmount
                        )}
                      </p>
                      {isEditing && (
                        <p className="text-xs text-gray-400 mt-1">
                          Auto-calculated
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <h6 className="font-medium text-gray-900 mb-3">
                      Share Distribution & Dates
                    </h6>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {renderEditableField(
                        "CI Share",
                        "ciShare",
                        safePayrollDetails.ciShare,
                        "percentage"
                      )}
                      {renderEditableField(
                        "Franchise Share",
                        "franchiseShare",
                        safePayrollDetails.franchiseShare,
                        "percentage"
                      )}
                      {renderEditableField(
                        "Royalty",
                        "royalty",
                        safePayrollDetails.royalty,
                        "percentage"
                      )}
                      {renderEditableField(
                        "Date of Joining",
                        "dateOfJoining",
                        safePayrollDetails.dateOfJoining,
                        "date"
                      )}
                      <div className="col-span-2">
                        {renderEditableField(
                          "Last Payment Date",
                          "dateOfPayment",
                          safePayrollDetails.dateOfPayment,
                          "date"
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
