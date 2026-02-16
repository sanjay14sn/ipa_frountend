"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";
import {
  requestAdditionalTraining,
  RequestAdditionalTrainingRequest,
  getAvailableTrainingLevelsForCI,
} from "@/services/course-instructor.service";
import { useToast } from "@/hooks/use-toast";

interface RequestTrainingModalProps {
  isOpen: boolean;
  onClose: () => void;
  instructorId: number;
  instructorName: string;
  onSuccess?: () => void;
}

export function RequestTrainingModal({
  isOpen,
  onClose,
  instructorId,
  instructorName,
  onSuccess,
}: RequestTrainingModalProps) {
  const [trainingLevels, setTrainingLevels] = useState<
    Array<{ id: number; name: string; description?: string; amount: number }>
  >([]);
  const [selectedLevelIds, setSelectedLevelIds] = useState<number[]>([]);
  const [additionalDetails, setAdditionalDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingLevels, setLoadingLevels] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadData();
    } else {
      setSelectedLevelIds([]);
      setAdditionalDetails("");
      setError(null);
    }
  }, [isOpen, instructorId]);

  const loadData = async () => {
    try {
      setLoadingLevels(true);
      setError(null);

      const levels = await getAvailableTrainingLevelsForCI(instructorId);
      setTrainingLevels(levels || []);
    } catch (err: any) {
      setError(err.message || "Failed to load training levels");
    } finally {
      setLoadingLevels(false);
    }
  };

  const handleLevelToggle = (levelId: number) => {
    setSelectedLevelIds((prev) =>
      prev.includes(levelId)
        ? prev.filter((id) => id !== levelId)
        : [...prev, levelId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedLevelIds.length === 0) {
      setError("Please select at least one training level");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const requestData: RequestAdditionalTrainingRequest = {
        trainingLevelIds: selectedLevelIds,
        additionalDetails: additionalDetails.trim() || undefined,
      };

      await requestAdditionalTraining(instructorId, requestData);

      toast({
        title: "Success",
        description: "Training request submitted successfully",
      });

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to submit training request"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request Additional Training</DialogTitle>
          <DialogDescription>
            Request training for {instructorName}. Select levels that are not
            yet completed, paid, or currently active.
          </DialogDescription>
        </DialogHeader>

        {loadingLevels ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error && !loadingLevels ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Training Levels Selection */}
            <div className="space-y-3">
              <Label>Select Training Levels *</Label>
              {trainingLevels.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    No training levels available to request. All levels may be
                    active, paid, or completed.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
                  {trainingLevels.map((level) => {
                    const isSelected = selectedLevelIds.includes(level.id);

                    return (
                      <div
                        key={level.id}
                        className="flex items-start space-x-3 p-2 rounded-lg hover:bg-gray-50"
                      >
                        <Checkbox
                          id={`level-${level.id}`}
                          checked={isSelected}
                          onCheckedChange={() => handleLevelToggle(level.id)}
                        />
                        <div className="flex-1">
                          <Label
                            htmlFor={`level-${level.id}`}
                            className="font-medium cursor-pointer"
                          >
                            {level.name}
                          </Label>
                          <div className="text-sm text-gray-500 mt-0.5">
                            ₹{level.amount.toLocaleString()}
                          </div>
                          {level.description && (
                            <p className="text-xs text-gray-400 mt-1">
                              {level.description}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Additional Details */}
            <div className="space-y-2">
              <Label htmlFor="additionalDetails">Additional Details (Optional)</Label>
              <Textarea
                id="additionalDetails"
                value={additionalDetails}
                onChange={(e) => setAdditionalDetails(e.target.value)}
                placeholder="Any additional information about the training request..."
                rows={3}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading || selectedLevelIds.length === 0}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Request
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

