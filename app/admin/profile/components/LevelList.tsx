"use client";

import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  Plus,
  Trash2,
  Edit2,
  Clock,
  Check,
  Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Level, UpdateLevelDto } from "@/services/level.service";
import type { Stream } from "@/services/stream.service";
import type { StreamTransition } from "@/services/stream-transition.service";
import { LevelMaterialsPicker } from "@/app/admin/profile/components/LevelMaterialsPicker";
import { LevelCertificatesPicker } from "@/app/admin/profile/components/LevelCertificatesPicker";
import { StatusBadge } from "@/components/shared/status-badge";

export function sortLevelsByDisplayOrder(list: Level[]) {
  return [...list].sort((a, b) => {
    if (a.displayOrder !== b.displayOrder) {
      return a.displayOrder - b.displayOrder;
    }
    return a.id - b.id;
  });
}

function formatAgeRange(stream: Stream) {
  if (stream.minAge == null && stream.maxAge == null) return "Any age";
  return `Ages ${stream.minAge ?? "—"}–${stream.maxAge ?? "—"}`;
}

interface LevelListProps {
  streams: Stream[];
  transitions: StreamTransition[];
  streamLevels: Record<number, Level[]>;
  loadingStreamLevels: Record<number, boolean>;
  collapsedStreams: Record<number, boolean>;
  isLoading: boolean;
  onToggleStreamCollapse: (streamId: number) => void;
  onAddLevel: (streamId: number) => void;
  onEditLevel: (level: Level, formData: UpdateLevelDto) => void;
  onDeleteLevel: (level: Level) => void;
  programId: number;
  /** Render the legend + keyboard tip footer below the stream rows */
  showLegend?: boolean;
}

export function LevelList({
  streams,
  transitions,
  streamLevels,
  loadingStreamLevels,
  collapsedStreams,
  isLoading,
  onToggleStreamCollapse,
  onAddLevel,
  onEditLevel,
  onDeleteLevel,
  programId,
  showLegend = false,
}: LevelListProps) {
  if (isLoading) {
    return (
      <div className="py-6 text-sm text-muted-foreground">Loading ladder…</div>
    );
  }

  if (streams.length === 0) {
    return (
      <div className="rounded-lg border border-dashed px-3 py-6 text-sm text-muted-foreground">
        No streams yet. Add a stream first to start building levels.
      </div>
    );
  }

  return (
    <>
    <div className="space-y-3">
      {streams.map((stream) => {
        const levelsForStream = sortLevelsByDisplayOrder(
          streamLevels[stream.id] ?? [],
        );
        const hasOutgoingTransition = transitions.some(
          (transition) => transition.fromStreamId === stream.id,
        );
        const maxInStream =
          levelsForStream.length === 0
            ? 0
            : Math.max(...levelsForStream.map((level) => level.displayOrder));
        const levelCount = stream.levelCount ?? levelsForStream.length;
        const totalMonths = levelsForStream.reduce(
          (sum, level) => sum + (level.durationInMonths ?? 3),
          0,
        );
        const isCollapsed = collapsedStreams[stream.id];

        return (
          <div
            key={stream.id}
            className="overflow-hidden rounded-lg border border-border bg-card"
          >
            <div className="flex items-center justify-between gap-3 bg-muted/40 px-3 py-2">
              <button
                type="button"
                onClick={() => onToggleStreamCollapse(stream.id)}
                aria-expanded={!isCollapsed}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                <ChevronRight
                  className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                    isCollapsed ? "" : "rotate-90"
                  }`}
                />
                <span className="font-semibold text-card-foreground">
                  {stream.name}
                </span>
                <Badge
                  variant="outline"
                  className="rounded-full border-border bg-card font-normal text-muted-foreground"
                >
                  {levelCount} levels
                </Badge>
                <span className="text-xs text-muted-foreground">
                  · {formatAgeRange(stream)}
                </span>
              </button>
              <div className="flex shrink-0 items-center gap-3">
                {!isCollapsed && totalMonths > 0 ? (
                  <span className="text-xs text-muted-foreground">
                    Total{" "}
                    <span className="font-semibold text-card-foreground">
                      {totalMonths} mo
                    </span>
                  </span>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 rounded-md text-primary hover:bg-primary/10"
                  onClick={() => onAddLevel(stream.id)}
                  disabled={isLoading}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add level
                </Button>
              </div>
            </div>
            {isCollapsed ? null : loadingStreamLevels[stream.id] ? (
              <p className="p-3 text-sm text-muted-foreground">
                Loading levels…
              </p>
            ) : levelsForStream.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">
                No levels in this stream yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-fixed text-sm">
                  <colgroup>
                    <col className="w-[24%]" />
                    <col className="w-[18%]" />
                    <col className="w-[16%]" />
                    <col className="w-[16%]" />
                    <col className="w-[14%]" />
                    <col className="w-[12%]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Level
                      </th>
                      <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Details
                      </th>
                      <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Materials
                      </th>
                      <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Certificates
                      </th>
                      <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Status
                      </th>
                      <th className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {levelsForStream.map((level) => {
                      const showStar =
                        hasOutgoingTransition &&
                        maxInStream > 0 &&
                        level.displayOrder === maxInStream;

                      return (
                        <tr
                          key={level.id}
                          className="border-b border-border last:border-b-0 align-middle hover:bg-muted/10"
                        >
                          <td className="px-3 py-2 align-middle">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex h-6 min-w-[2rem] items-center justify-center rounded-md bg-muted/60 px-1.5 text-[11px] font-medium text-muted-foreground">
                                #{level.displayOrder}
                              </span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1 font-medium text-card-foreground">
                                  <span className="truncate">{level.name}</span>
                                  {showStar ? (
                                    <Star
                                      className="h-3.5 w-3.5 text-amber-500"
                                      fill="currentColor"
                                      aria-label="Optional / bridge level"
                                    />
                                  ) : null}
                                </div>
                                <div className="truncate text-xs text-muted-foreground">
                                  {level.code}
                                  {showStar
                                    ? ` · bridges to ${
                                        streams.find(
                                          (s) =>
                                            s.id ===
                                            transitions.find(
                                              (t) =>
                                                t.fromStreamId === stream.id,
                                            )?.toStreamId,
                                        )?.name ?? ""
                                      }`
                                    : ""}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2 align-middle">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Badge
                                variant="outline"
                                className="gap-1 rounded-full border-border bg-card font-normal text-card-foreground"
                              >
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                {level.durationInMonths ?? 3} mo
                              </Badge>
                              <Badge
                                variant="outline"
                                className="gap-1 rounded-full border-border bg-card font-normal text-card-foreground"
                              >
                                <Check className="h-3 w-3 text-primary" />
                                Pass {level.passMark} / {level.totalMarks}
                              </Badge>
                            </div>
                          </td>
                          <td className="px-3 py-2 align-middle">
                            <LevelMaterialsPicker
                              levelId={level.id}
                              disabled={isLoading}
                            />
                          </td>
                          <td className="px-3 py-2 align-middle">
                            <LevelCertificatesPicker
                              levelId={level.id}
                              programId={programId}
                              disabled={isLoading}
                            />
                          </td>
                          <td className="px-3 py-2 align-middle">
                            <StatusBadge
                              label={level.isActive ? "Active" : "Inactive"}
                            />
                          </td>
                          <td className="px-3 py-2 align-middle">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 rounded-md p-0"
                                onClick={() =>
                                  onEditLevel(level, {
                                    name: level.name,
                                    code: level.code,
                                    streamId: level.streamId,
                                    programId,
                                    totalMarks: level.totalMarks,
                                    passMark: level.passMark,
                                    displayOrder: level.displayOrder,
                                    durationInMonths: level.durationInMonths,
                                    isActive: level.isActive,
                                  })
                                }
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 rounded-md p-0 text-destructive"
                                onClick={() => onDeleteLevel(level)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
    {showLegend && streams.length > 0 ? (
      <div className="flex flex-col gap-2 border-t border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-sm bg-primary" />
            Materials loaded
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-sm bg-muted-foreground/40" />
            Not yet loaded
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Star className="h-3 w-3 text-amber-500" fill="currentColor" />
            Optional / bridge level
          </span>
        </div>
        <span className="text-muted-foreground">
          Tip: hold{" "}
          <kbd className="rounded border border-border bg-card px-1 py-0.5 text-[10px]">
            ⌥
          </kbd>{" "}
          while dragging to copy a level across streams.
        </span>
      </div>
    ) : null}
  </>
  );
}
