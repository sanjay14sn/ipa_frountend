"use client";

import React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Level } from "@/services/level.service";
import type { Stream } from "@/services/stream.service";
import type { Program } from "@/services/program.service";

function levelFilterLabel(level: Level, streams: Stream[]) {
  const stream = streams.find((entry) => entry.id === level.streamId);
  const streamLabel = stream?.name?.trim();
  const suffix = streamLabel ? ` (${streamLabel})` : ` (stream ${level.streamId})`;
  return `${level.name}${suffix}`;
}

type Props = {
  programFilter: number | "";
  levelFilter: number | "";
  programs: Program[];
  levels: Level[];
  streams: Stream[];
  onProgramChange: (value: number | "") => void;
  onLevelChange: (value: number | "") => void;
  onAddClick: () => void;
  /** Read-only oversight view: hide the "Add item" action. */
  readOnly?: boolean;
};

export function InventoryTableToolbar({
  programFilter,
  levelFilter,
  programs,
  levels,
  streams,
  onProgramChange,
  onLevelChange,
  onAddClick,
  readOnly,
}: Props) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="w-44 space-y-1">
        <Label className="text-xs text-muted-foreground">Program</Label>
        <Select
          value={programFilter === "" ? "all" : String(programFilter)}
          onValueChange={(value) => {
            onProgramChange(value === "all" ? "" : Number(value));
          }}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="All programs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All programs</SelectItem>
            {programs.map((program) => (
              <SelectItem key={program.id} value={String(program.id)}>
                {program.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="w-44 space-y-1">
        <Label className="text-xs text-muted-foreground">Level</Label>
        <Select
          value={levelFilter === "" ? "all" : String(levelFilter)}
          onValueChange={(value) => {
            onLevelChange(value === "all" ? "" : Number(value));
          }}
          disabled={programFilter === ""}
        >
          <SelectTrigger className="h-9">
            <SelectValue
              placeholder={
                programFilter === "" ? "Select program first" : "All levels"
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All levels</SelectItem>
            {levels.map((level) => (
              <SelectItem key={level.id} value={String(level.id)}>
                {levelFilterLabel(level, streams)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {!readOnly && (
        <Button
          className="h-9"
          onClick={onAddClick}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add item
        </Button>
      )}
    </div>
  );
}
