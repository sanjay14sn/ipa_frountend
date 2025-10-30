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
  payrollDetails?: FranchisePayrollResponse | FranchisePayrollResponse[];
  clientId: string;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  onPayrollUpdate?: (updatedPayroll: FranchisePayrollResponse) => void;
}

export const payrollDotRef = React.createRef<HTMLDivElement>();

export default function PayrollSection({
  payrollDetails,
  clientId,
  isExpanded,
  onToggle,
  onPayrollUpdate,
}: PayrollSectionProps) {
  const sectionId = `${clientId}-payroll`;
  const containerRef = useRef<HTMLDivElement>(null);
  const payrollInternalDotRef = useRef<HTMLDivElement>(null);
  const [lineHeight, setLineHeight] = useState(0);
  const [isEditing, setIsEditing] = useState(false);

  // Convert to array format for consistent handling
  const payrollArray = Array.isArray(payrollDetails)
    ? payrollDetails
    : payrollDetails
    ? [payrollDetails]
    : [];

  // Calculate total amount across all programs
  const totalAmount = payrollArray.reduce(
    (sum, payroll) => sum + (payroll.totalAmount || 0),
    0
  );

  const [editedDataArray, setEditedDataArray] =
    useState<FranchisePayrollResponse[]>(payrollArray);
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
    if (isExpanded && payrollArray.length > 1) {
      // Small delay to ensure DOM has rendered
      const timer = setTimeout(() => {
        if (containerRef.current && payrollInternalDotRef.current) {
          const containerTop = containerRef.current.getBoundingClientRect().top;
          const dotCenter =
            payrollInternalDotRef.current.getBoundingClientRect().top +
            payrollInternalDotRef.current.offsetHeight / 2;
          setLineHeight(dotCenter - containerTop);
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isExpanded, payrollArray, isEditing]);

  useEffect(() => {
    setEditedDataArray(payrollArray);
  }, [payrollDetails]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditedDataArray(payrollArray);
    setIsEditing(false);
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);

      // Update all payroll entries
      await Promise.all(
        editedDataArray.map((payroll) =>
          updatePayrollDetails(payroll.id, {
            franchiseFee: payroll.franchiseFee,
            monthlyFee: payroll.monthlyFee,
            ciShare: payroll.ciShare,
            franchiseShare: payroll.franchiseShare,
            royalty: payroll.royalty,
            kitCost: payroll.kitCost,
            materialCost: payroll.materialCost,
            installment: payroll.installment,
            totalAmount: payroll.totalAmount,
            dateOfPayment: payroll.dateOfPayment,
            dateOfJoining: payroll.dateOfJoining,
          })
        )
      );

      if (onPayrollUpdate && editedDataArray[0]) {
        onPayrollUpdate(editedDataArray[0]);
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
    index: number,
    field: keyof FranchisePayrollResponse,
    value: string | number | Date
  ) => {
    setEditedDataArray((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
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
        updated[index].totalAmount =
          (updated[index].franchiseFee || 0) +
          (updated[index].monthlyFee || 0) +
          (updated[index].kitCost || 0) +
          (updated[index].materialCost || 0) +
          (updated[index].installment || 0);
      }

      return updated;
    });
  };

  const renderEditableField = (
    index: number,
    label: string,
    field: keyof FranchisePayrollResponse,
    value: number | string | Date,
    type: "currency" | "percentage" | "date" | "number" = "number"
  ) => {
    const currentValue = isEditing ? editedDataArray[index][field] : value;

    if (!isEditing) {
      let displayValue: string;
      switch (type) {
        case "currency":
          displayValue = formatCurrency((currentValue as number) ?? 0);
          break;
        case "percentage":
          displayValue = `${currentValue ?? 0}%`;
          break;
        case "date":
          displayValue = formatDate(currentValue as Date);
          break;
        default:
          displayValue = currentValue?.toString() ?? "N/A";
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
              : currentValue?.toString() ?? ""
          }
          onChange={(e) => {
            let newValue: string | number | Date = e.target.value;
            if (type === "date") {
              newValue = new Date(e.target.value);
            } else {
              newValue = parseFloat(e.target.value) || 0;
            }
            handleInputChange(index, field, newValue);
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

  // Show message if no payroll data
  if (payrollArray.length === 0) {
    return (
      <div className="relative">
        <div className="absolute -left-6 top-1 w-6 h-4">
          <div className="absolute top-0 left-0 w-6 h-4 border-l-2 border-b-2 border-primary rounded-bl-lg"></div>
          <div className="absolute top-4 left-6 w-2 h-2 bg-primary rounded-full -translate-x-1 -translate-y-1"></div>
        </div>

        <div className="bg-white rounded-lg border border-primary p-4">
          <h4 className="font-medium text-gray-900">Payroll Details</h4>
          <p className="text-sm text-gray-500 mt-2">
            No payroll information available
          </p>
        </div>
      </div>
    );
  }

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
            <h4 className="font-medium text-gray-900">
              Payroll Details{" "}
              {payrollArray.length > 1 && `(${payrollArray.length} Programs)`}
            </h4>
            <Badge variant="outline" className="ml-2">
              Total: {formatCurrency(totalAmount)}
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
          <div className="relative border-t border-primary" ref={containerRef}>
            {payrollArray.length > 1 && (
              <div
                className="absolute left-6 border-primary border bg-primary"
                style={{ top: 0, height: `${lineHeight - 6}px` }}
              ></div>
            )}
            <div className="pl-12 pr-4 py-4 space-y-4">
              {payrollArray.map((payroll, index) => (
                <div key={payroll.id || index} className="relative">
                  <div
                    ref={
                      index === payrollArray.length - 1
                        ? payrollInternalDotRef
                        : undefined
                    }
                    className="absolute -left-6 top-4 w-6 h-4"
                  >
                    <div className="absolute top-0 left-0 w-6 h-4 border-l-2 border-b-2 border-primary rounded-bl-lg"></div>
                    <div className="absolute top-4 left-6 w-2 h-2 bg-primary rounded-full -translate-x-1 -translate-y-1"></div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-4 border border-primary">
                    <div className="flex items-center justify-between">
                      <h5 className="font-semibold text-gray-900">
                        {payroll.program?.name || `Program ${index + 1}`}
                      </h5>
                      <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                        {formatCurrency(
                          isEditing
                            ? editedDataArray[index].totalAmount
                            : payroll.totalAmount
                        )}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {renderEditableField(
                        index,
                        "Franchise Fee",
                        "franchiseFee",
                        payroll.franchiseFee,
                        "currency"
                      )}
                      {renderEditableField(
                        index,
                        "Monthly Fee",
                        "monthlyFee",
                        payroll.monthlyFee,
                        "currency"
                      )}
                      {renderEditableField(
                        index,
                        "Kit Cost",
                        "kitCost",
                        payroll.kitCost,
                        "currency"
                      )}
                      {renderEditableField(
                        index,
                        "Material Cost",
                        "materialCost",
                        payroll.materialCost,
                        "currency"
                      )}
                      {renderEditableField(
                        index,
                        "Installment",
                        "installment",
                        payroll.installment,
                        "currency"
                      )}
                    </div>

                    <div className="pt-4 border-t">
                      <h6 className="font-medium text-gray-900 mb-3">
                        Share Distribution & Dates
                      </h6>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {renderEditableField(
                          index,
                          "CI Share",
                          "ciShare",
                          payroll.ciShare,
                          "percentage"
                        )}
                        {renderEditableField(
                          index,
                          "Franchise Share",
                          "franchiseShare",
                          payroll.franchiseShare,
                          "percentage"
                        )}
                        {renderEditableField(
                          index,
                          "Royalty",
                          "royalty",
                          payroll.royalty,
                          "percentage"
                        )}
                        {renderEditableField(
                          index,
                          "Date of Joining",
                          "dateOfJoining",
                          payroll.dateOfJoining,
                          "date"
                        )}
                        <div className="col-span-2">
                          {renderEditableField(
                            index,
                            "Last Payment Date",
                            "dateOfPayment",
                            payroll.dateOfPayment,
                            "date"
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
