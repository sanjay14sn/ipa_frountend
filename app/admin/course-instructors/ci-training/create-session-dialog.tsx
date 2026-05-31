"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { createSession } from "@/services/ci-training-admin.service";
import { getAllPrograms, Program } from "@/services/program.service";
import {
  getTrainingLevelsByProgram,
  TrainingLevel,
} from "@/services/training-level.service";
import statesCities from "@/data/indian-states-cities.json";

const stateNames = Object.keys(statesCities).sort();

export function CreateSessionDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [region, setRegion] = useState("");
  const [programId, setProgramId] = useState("");
  const [trainingLevelId, setTrainingLevelId] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [notes, setNotes] = useState("");
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [loadingLevels, setLoadingLevels] = useState(false);
  const [trainingLevels, setTrainingLevels] = useState<TrainingLevel[]>([]);

  const loadPrograms = async () => {
    if (loadingPrograms) return;
    setLoadingPrograms(true);
    try {
      await queryClient.fetchQuery({
        queryKey: ["ci-training-programs"],
        queryFn: () => getAllPrograms(),
        staleTime: Infinity,
        gcTime: Infinity,
      });
    } finally {
      setLoadingPrograms(false);
    }
  };

  const loadLevelsForProgram = async (selectedProgramId: number) => {
    if (!selectedProgramId || loadingLevels) return;
    setLoadingLevels(true);
    try {
      const rows = await queryClient.fetchQuery({
        queryKey: ["ci-training-level-options", selectedProgramId],
        queryFn: () => getTrainingLevelsByProgram(selectedProgramId),
        staleTime: Infinity,
        gcTime: Infinity,
      });
      setTrainingLevels(rows.filter((level) => level.isActive));
    } finally {
      setLoadingLevels(false);
    }
  };

  const programs =
    queryClient.getQueryData<Program[]>(["ci-training-programs"]) ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!programId) {
      toast.error("Select a program.");
      return;
    }
    if (!trainingLevelId) {
      toast.error("Select a training level.");
      return;
    }
    setLoading(true);
    try {
      await createSession({
        programId: Number(programId),
        region: region.trim().toLowerCase(),
        trainingLevelId: Number(trainingLevelId),
        sessionDate,
        notes: notes || undefined,
      });
      toast.success("Session created");
      onSuccess();
      onClose();
      setRegion("");
      setProgramId("");
      setTrainingLevelId("");
      setSessionDate("");
      setNotes("");
      setTrainingLevels([]);
    } catch {
      toast.error("Failed to create session.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !loading) onClose();
      }}
    >
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Create Training Session</DialogTitle>
          <DialogDescription>
            Schedule a new CI training session
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="programId">Program</Label>
              <Select
                value={programId}
                onValueChange={(value) => {
                  setProgramId(value);
                  setTrainingLevelId("");
                  setTrainingLevels([]);
                }}
                onOpenChange={(open) => {
                  if (open) void loadPrograms();
                }}
              >
                <SelectTrigger id="programId">
                  <SelectValue
                    placeholder={
                      loadingPrograms ? "Loading programs..." : "Select program"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {programs.map((program) => (
                    <SelectItem key={program.id} value={String(program.id)}>
                      {program.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="region">Region</Label>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger id="region">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {stateNames.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="levelId">Training Level</Label>
              <Select
                value={trainingLevelId}
                onValueChange={setTrainingLevelId}
                onOpenChange={(open) => {
                  if (open && programId) {
                    void loadLevelsForProgram(Number(programId));
                  }
                }}
              >
                <SelectTrigger id="levelId">
                  <SelectValue
                    placeholder={
                      !programId
                        ? "Select program first"
                        : loadingLevels
                          ? "Loading levels..."
                          : "Select training level"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {trainingLevels.map((level) => (
                    <SelectItem key={level.id} value={String(level.id)}>
                      {level.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sessionDate">Session Date</Label>
            <DateInput
              id="sessionDate"
              value={sessionDate}
              onChange={(v) => setSessionDate(v)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Session notes"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
