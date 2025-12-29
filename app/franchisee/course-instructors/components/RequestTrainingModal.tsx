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
  getActiveTrainingLevels,
  TrainingLevel,
} from "@/services/training-level.service";
import {
  requestAdditionalTraining,
  RequestAdditionalTrainingRequest,
  getCITrainingProgress,
  CITrainingProgress,
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
  const [trainingLevels, setTrainingLevels] = useState<TrainingLevel[]>([]);
  const [selectedLevelIds, setSelectedLevelIds] = useState<number[]>([]);
  const [additionalDetails, setAdditionalDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingLevels, setLoadingLevels] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTrainings, setCurrentTrainings] = useState<CITrainingProgress | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadData();
    } else {
      // Reset form when modal closes
      setSelectedLevelIds([]);
      setAdditionalDetails("");
      setError(null);
    }
  }, [isOpen, instructorId]);

  const loadData = async () => {
    try {
      setLoadingLevels(true);
      setError(null);

      // Load available training levels and current training progress
      const [levels, progress] = await Promise.all([
        getActiveTrainingLevels().catch(() => []), // Fallback to empty array if fails
        getCITrainingProgress(instructorId),
      ]);

      setTrainingLevels(levels || []);
      setCurrentTrainings(progress);
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

  // Get active training level ID to exclude
  const activeTrainingLevelId =
    currentTrainings?.activeTraining?.trainingLevelId;

  // Filter out active training level from available options
  const availableLevels = trainingLevels.filter(
    (level) => level.id !== activeTrainingLevelId
  );

  // Mark levels that are already completed (for redo)
  const completedLevelIds = new Set(
    currentTrainings?.trainings
      .filter((t) => t.isCompleted)
      .map((t) => t.trainingLevelId) || []
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request Additional Training</DialogTitle>
          <DialogDescription>
            Request training for {instructorName}. You can select any level
            except the currently active one. Completed levels can be redone.
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
                    No training levels are currently available in the system.
                  </AlertDescription>
                </Alert>
              ) : availableLevels.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    No training levels available. All levels are currently active or already requested.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
                  {availableLevels.map((level) => {
                    const isCompleted = completedLevelIds.has(level.id);
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
                            {isCompleted && (
                              <span className="ml-2 text-green-600">
                                (Completed - can redo)
                              </span>
                            )}
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

