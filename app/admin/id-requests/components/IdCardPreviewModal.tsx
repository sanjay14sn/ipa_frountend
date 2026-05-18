"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  User,
  Building2,
  MapPin,
  Phone,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { RequestedIdDetail } from "@/services/student.service";
import { issueIdCardWithRevalidation } from "@/hooks/api/student.hooks";

interface IdCardPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: RequestedIdDetail;
  onSuccess: () => void;
}

export default function IdCardPreviewModal({
  open,
  onOpenChange,
  student,
  onSuccess,
}: IdCardPreviewModalProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);
  const [issued, setIssued] = useState(false);

  // Reset internal state each time the modal opens for a (possibly different) student
  useEffect(() => {
    if (open) {
      setIsFlipped(false);
      setIssued(false);
      setIsIssuing(false);
    }
  }, [open]);

  const handleIssueId = async () => {
    if (!student.id) {
      toast.error("Student ID is missing. Please refresh and try again.");
      return;
    }

    try {
      setIsIssuing(true);
      await issueIdCardWithRevalidation(student.id);
      setIssued(true);
      onSuccess();
    } catch (error) {
      console.error("Error issuing ID:", error);
      toast.error("Failed to issue ID card. Please try again.");
    } finally {
      setIsIssuing(false);
    }
  };

  const handleClose = () => {
    setIsFlipped(false);
    setIssued(false);
    setIsIssuing(false);
    onOpenChange(false);
  };

  if (issued) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md w-full mx-4">
          <DialogHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-12 w-12 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-bold text-gray-900">
              ID Card Issued!
            </DialogTitle>
            <DialogDescription className="text-center">
              The ID card for {student.name} has been successfully issued.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-4">
            <Button className="w-full" onClick={handleClose}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-full mx-4">
        <DialogHeader className="text-center">
          <DialogTitle className="text-xl font-bold text-gray-900">
            ID Card Preview
          </DialogTitle>
          <DialogDescription>
            Review the ID card details before issuing
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-6">
          {/* ID Card with Flip Animation */}
          <div className="relative w-64 h-96 perspective-1000">
            <div
              className={`relative w-full h-full transition-transform duration-700 transform-style-preserve-3d cursor-pointer ${
                isFlipped ? "rotate-y-180" : ""
              }`}
              onClick={() => setIsFlipped(!isFlipped)}
            >
              {/* Front Side */}
              <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-primary to-primary/80 rounded-lg shadow-lg p-4 text-white">
                <div className="h-full flex flex-col">
                  {/* Header */}
                  <div className="text-center border-b border-white/20 pb-2 mb-3">
                    <h3 className="font-bold text-lg">ABACUS ACADEMY</h3>
                    <p className="text-xs opacity-90">STUDENT ID CARD</p>
                  </div>

                  {/* Student Info */}
                  <div className="flex-1 flex items-center gap-4">
                    <div className="w-16 h-16 bg-white/20 rounded-lg flex items-center justify-center">
                      <User className="h-8 w-8 text-white" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <h4 className="font-semibold text-lg">{student.name}</h4>
                      <p className="text-sm opacity-90">
                        Roll No: {student.rollNo}
                      </p>
                      <p className="text-xs opacity-80">
                        DOB:{" "}
                        {student.dateOfBirth
                          ? new Date(student.dateOfBirth).toLocaleDateString()
                          : "N/A"}
                      </p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="text-center border-t border-white/20 pt-2">
                    <p className="text-xs opacity-80">
                      {student.franchiseName}
                    </p>
                  </div>
                </div>
              </div>

              {/* Back Side */}
              <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 bg-gray-100 rounded-lg shadow-lg p-4">
                <div className="h-full flex flex-col">
                  {/* Header */}
                  <div className="text-center border-b border-gray-300 pb-2 mb-3">
                    <h3 className="font-bold text-lg text-gray-800">
                      CONTACT DETAILS
                    </h3>
                  </div>

                  {/* Contact Info */}
                  <div className="flex-1 space-y-3 text-sm">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-600" />
                        <div>
                          <p className="font-medium text-gray-800">Address:</p>
                          <p className="text-gray-600 text-xs leading-relaxed">
                            {student.residentialAddress}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-600" />
                        <div>
                          <p className="font-medium text-gray-800">
                            Father: {student.fatherContactNo}
                          </p>
                          <p className="font-medium text-gray-800">
                            Mother: {student.motherContactNo}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-gray-600" />
                        <div>
                          <p className="font-medium text-gray-800">
                            Franchise:
                          </p>
                          <p className="text-gray-600 text-xs">
                            {student.franchiseeAddress}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="text-center border-t border-gray-300 pt-2">
                    <p className="text-xs text-gray-500">
                      Valid for academic year 2024-25
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Flip Instruction */}
          <p className="text-sm text-muted-foreground text-center">
            Click the card to flip and view contact details
          </p>

          {/* Action Buttons */}
          <div className="flex gap-3 w-full">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isIssuing}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleIssueId}
              disabled={isIssuing}
              className="flex-1"
            >
              {isIssuing ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Issuing...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <CreditCard className="w-4 h-4" />
                  <span>Issue ID Card</span>
                </div>
              )}
            </Button>
          </div>
        </div>

        <style jsx>{`
          .perspective-1000 {
            perspective: 1000px;
          }
          .transform-style-preserve-3d {
            transform-style: preserve-3d;
          }
          .backface-hidden {
            backface-visibility: hidden;
          }
          .rotate-y-180 {
            transform: rotateY(180deg);
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
