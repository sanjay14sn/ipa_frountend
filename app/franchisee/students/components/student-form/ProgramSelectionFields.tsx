"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle } from "lucide-react";
import type { Program } from "@/services/program.service";
import type { Stream } from "@/services/stream.service";
import type { Level } from "@/services/level.service";

export interface ProgramSelectionFieldsData {
  programId: number;
  streamId: number;
  levelId: number;
}

export interface ProgramSelectionFieldsProps {
  formData: ProgramSelectionFieldsData;
  errors: Record<string, string>;
  onFieldChange: (field: string, value: string) => void;
  /** Callback fired when programId changes so parent can reset stream/level. */
  onProgramChange: (newProgramId: string) => void;
  /** Callback fired when streamId changes so parent can reset level. */
  onStreamChange: (newStreamId: string) => void;
  programs: Program[];
  streams: Stream[];
  levels: Level[];
  loadingPrograms: boolean;
  loadingStreams: boolean;
  loadingLevels: boolean;
  /**
   * When false the level select is read-only (franchise edit mode).
   * Defaults to true.
   */
  levelEditable?: boolean;
  /**
   * When false the program and stream selects are read-only (franchise edit
   * mode — a student's program/stream cannot be reassigned by a franchisee).
   * Defaults to true.
   */
  programStreamEditable?: boolean;
  /**
   * When true the level placeholder says "Auto-set to first level" instead of
   * "Select level". Used by AddStudentModal for non-existing (new) students.
   */
  levelAutoSet?: boolean;
}

export function ProgramSelectionFields({
  formData,
  errors,
  onFieldChange,
  onProgramChange,
  onStreamChange,
  programs,
  streams,
  levels,
  loadingPrograms,
  loadingStreams,
  loadingLevels,
  levelEditable = true,
  levelAutoSet = false,
  programStreamEditable = true,
}: ProgramSelectionFieldsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Program */}
      <div className="space-y-2">
        <Label htmlFor="programId">Program *</Label>
        <Select
          value={formData.programId.toString()}
          onValueChange={(value) => {
            onProgramChange(value);
          }}
          disabled={!programStreamEditable || loadingPrograms}
        >
          <SelectTrigger className={errors.programId ? "border-red-500" : ""}>
            <SelectValue
              placeholder={
                loadingPrograms ? "Loading programs..." : "Select program"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {programs.map((program) => (
              <SelectItem key={program.id} value={program.id.toString()}>
                {program.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!programStreamEditable && (
          <p className="text-muted-foreground text-xs mt-1">
            Locked after enrollment — contact admin to change
          </p>
        )}
        {errors.programId && (
          <p className="text-red-500 text-sm flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {errors.programId}
          </p>
        )}
      </div>

      {/* Stream */}
      <div className="space-y-2">
        <Label htmlFor="streamId">Stream *</Label>
        <Select
          value={formData.streamId.toString()}
          onValueChange={(value) => {
            onStreamChange(value);
          }}
          disabled={
            !programStreamEditable ||
            !formData.programId ||
            formData.programId === 0 ||
            loadingStreams
          }
        >
          <SelectTrigger className={errors.streamId ? "border-red-500" : ""}>
            <SelectValue
              placeholder={
                loadingStreams
                  ? "Loading streams..."
                  : formData.programId === 0
                  ? "Select program first"
                  : "Select stream"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {streams.map((stream) => (
              <SelectItem key={stream.id} value={stream.id.toString()}>
                {stream.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!programStreamEditable && (
          <p className="text-muted-foreground text-xs mt-1">
            Locked after enrollment — contact admin to change
          </p>
        )}
        {errors.streamId && (
          <p className="text-red-500 text-sm flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {errors.streamId}
          </p>
        )}
      </div>

      {/* Level */}
      <div className="space-y-2">
        <Label htmlFor="levelId">Level *</Label>
        <Select
          value={formData.levelId.toString()}
          onValueChange={(value) => onFieldChange("levelId", value)}
          disabled={
            !levelEditable ||
            !formData.streamId ||
            formData.streamId === 0 ||
            loadingLevels
          }
        >
          <SelectTrigger className={errors.levelId ? "border-red-500" : ""}>
            <SelectValue
              placeholder={
                loadingLevels
                  ? "Loading levels..."
                  : formData.streamId === 0
                  ? "Select stream first"
                  : levelAutoSet
                  ? "Auto-set to first level"
                  : "Select level"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {levels.map((level) => (
              <SelectItem key={level.id} value={level.id.toString()}>
                {level.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.levelId && (
          <p className="text-red-500 text-sm flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {errors.levelId}
          </p>
        )}
        {!levelEditable && (
          <p className="text-muted-foreground text-xs mt-1">
            Locked after enrollment — contact admin to change
          </p>
        )}
      </div>
    </div>
  );
}
