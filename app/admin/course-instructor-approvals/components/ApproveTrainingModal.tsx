import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    dateOfTraining: new Date(),
    amount: "15000",
    useEMI: false,
    installmentCount: "",
    installmentAmount: "",
  });

  // Calculate installment amount when amount or installment count changes
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

      // Auto-calculate installment amount when amount or installment count changes
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

      toast({
        title: "Training Approved",
        description: `Training has been successfully approved for ${instructorName}`,
      });

      onSuccess?.();
      onClose();

      // Reset form
      setFormData({
        dateOfTraining: new Date(),
        amount: "15000",
        useEMI: false,
        installmentCount: "",
        installmentAmount: "",
      });
    } catch (error) {
      console.error("Error approving training:", error);
      toast({
        title: "Error",
        description: "Failed to approve training. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Approve Training</DialogTitle>
          <DialogDescription>
            Add training details for {instructorName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dateOfTraining">Training Date</Label>
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Training Amount (₹)</Label>
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
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="useEMI"
              checked={formData.useEMI}
              onCheckedChange={(checked) =>
                handleInputChange("useEMI", checked)
              }
            />
            <Label htmlFor="useEMI">Use EMI (Installment)</Label>
          </div>

          {formData.useEMI && (
            <div className="space-y-4 pl-6 border-l-2 border-gray-200">
              <div className="space-y-2">
                <Label htmlFor="installmentCount">Installment Period</Label>
                <Select
                  value={formData.installmentCount}
                  onValueChange={(value) =>
                    handleInputChange("installmentCount", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select installment period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 months</SelectItem>
                    <SelectItem value="6">6 months</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="installmentAmount">
                  Installment Amount (₹)
                </Label>
                <Input
                  id="installmentAmount"
                  type="text"
                  value={
                    formData.installmentAmount
                      ? `₹${formData.installmentAmount}`
                      : ""
                  }
                  readOnly
                  className="bg-gray-50"
                  placeholder="Auto-calculated"
                />
                {formData.installmentAmount && (
                  <p className="text-xs text-gray-500">
                    {formData.installmentCount} installments of ₹
                    {formData.installmentAmount} each
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Approving..." : "Approve Training"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
