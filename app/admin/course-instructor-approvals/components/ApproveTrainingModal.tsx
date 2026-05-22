import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { selectInputValueOnFocus } from "@/lib/select-input-on-focus";
import {
  approveTraining,
  ApproveTrainingRequest,
} from "@/services/course-instructor.service";
import { toast } from "sonner";
import {
  DialogFormField,
  FormDialog,
} from "@/components/shared/dialog";

interface ApproveTrainingModalProps {
  isOpen: boolean;
  onClose: () => void;
  instructorId: string;
  instructorName: string;
  onSuccess?: () => void;
}

export default function ApproveTrainingModal({
  isOpen,
  onClose,
  instructorId,
  instructorName,
  onSuccess,
}: ApproveTrainingModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    dateOfTraining: new Date(),
    amount: "15000",
    useEMI: false,
    installmentCount: "",
    installmentAmount: "",
  });

  const calculateInstallmentAmount = (totalAmount: string, count: string) => {
    if (!totalAmount || !count) return "";
    const amount = parseFloat(totalAmount);
    const installments = parseInt(count);
    if (amount > 0 && installments > 0) {
      return (amount / installments).toFixed(2);
    }
    return "";
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => {
      const newData = {
        ...prev,
        [field]: value,
      };

      if (field === "amount" || field === "installmentCount") {
        const installmentAmount = calculateInstallmentAmount(
          field === "amount" ? value : newData.amount,
          field === "installmentCount" ? value : newData.installmentCount
        );
        newData.installmentAmount = installmentAmount;
      }

      return newData;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const trainingData: ApproveTrainingRequest = {
        dateOfTraining:
          formData.dateOfTraining instanceof Date
            ? formData.dateOfTraining.toISOString().slice(0, 10)
            : String(formData.dateOfTraining),
        amount: parseFloat(formData.amount),
        ...(formData.useEMI && {
          installmentCount: parseInt(formData.installmentCount),
          installmentAmount: parseFloat(formData.installmentAmount),
        }),
      };

      await approveTraining(Number(instructorId), trainingData);

      toast.success(
        `Training has been successfully approved for ${instructorName}`
      );

      onSuccess?.();
      onClose();

      setFormData({
        dateOfTraining: new Date(),
        amount: "15000",
        useEMI: false,
        installmentCount: "",
        installmentAmount: "",
      });
    } catch (error) {
      console.error("Error approving training:", error);
      toast.error("Failed to approve training. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) onClose();
  };

  return (
    <FormDialog
      open={isOpen}
      onOpenChange={(o) => (o ? null : handleClose())}
      size="sm"
      title="Approve Training"
      description={`Add training details for ${instructorName}`}
      onSubmit={handleSubmit}
      isSubmitting={isLoading}
      submitLabel={isLoading ? "Approving..." : "Approve Training"}
    >
      <DialogFormField id="dateOfTraining" label="Training Date">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !formData.dateOfTraining && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formData.dateOfTraining ? (
                format(formData.dateOfTraining, "PPP")
              ) : (
                <span>Pick a date</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={formData.dateOfTraining}
              onSelect={(date) =>
                date && handleInputChange("dateOfTraining", date)
              }
            />
          </PopoverContent>
        </Popover>
      </DialogFormField>

      <DialogFormField id="amount" label="Training Amount (₹)" required>
        <Input
          id="amount"
          type="number"
          step="0.01"
          min="0"
          placeholder="Enter training amount"
          value={formData.amount}
          onChange={(e) => handleInputChange("amount", e.target.value)}
          onFocus={selectInputValueOnFocus}
          required
        />
      </DialogFormField>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="useEMI"
          checked={formData.useEMI}
          onCheckedChange={(checked) => handleInputChange("useEMI", checked)}
        />
        <Label htmlFor="useEMI">Use EMI (Installment)</Label>
      </div>

      {formData.useEMI && (
        <div className="space-y-4 pl-6 border-l-2 border-border">
          <DialogFormField id="installmentCount" label="Installment Period">
            <Select
              value={formData.installmentCount}
              onValueChange={(value) =>
                handleInputChange("installmentCount", value)
              }
            >
              <SelectTrigger id="installmentCount">
                <SelectValue placeholder="Select installment period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 months</SelectItem>
                <SelectItem value="6">6 months</SelectItem>
              </SelectContent>
            </Select>
          </DialogFormField>

          <DialogFormField
            id="installmentAmount"
            label="Installment Amount (₹)"
            hint={
              formData.installmentAmount
                ? `${formData.installmentCount} installments of ₹${formData.installmentAmount} each`
                : undefined
            }
          >
            <Input
              id="installmentAmount"
              type="text"
              value={
                formData.installmentAmount
                  ? `₹${formData.installmentAmount}`
                  : ""
              }
              readOnly
              className="bg-muted/40"
              placeholder="Auto-calculated"
            />
          </DialogFormField>
        </div>
      )}
    </FormDialog>
  );
}
