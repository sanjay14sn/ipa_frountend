"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit2, ArrowRight } from "lucide-react";
import type { Stream, UpdateStreamDto } from "@/services/stream.service";
import type { StreamTransition } from "@/services/stream-transition.service";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatAgeRange(
  minAge?: number | null,
  maxAge?: number | null,
): string {
  if (minAge == null && maxAge == null) return "Ages: any";
  if (minAge != null && maxAge != null) return `Ages ${minAge}–${maxAge}`;
  if (minAge != null) return `Ages ${minAge}+`;
  return `Ages up to ${maxAge}`;
}

// ── StreamList ────────────────────────────────────────────────────────────────

interface StreamListProps {
  streams: Stream[];
  isLoading: boolean;
  programId: number;
  onEditStream: (stream: Stream, editFormData: UpdateStreamDto) => void;
  onDeleteStream: (stream: Stream) => void;
}

export function StreamList({
  streams,
  isLoading,
  programId,
  onEditStream,
  onDeleteStream,
}: StreamListProps) {
  const sortedStreams = [...streams].sort(
    (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
  );

  if (isLoading) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
        Loading streams…
      </div>
    );
  }

  if (sortedStreams.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
        No streams yet. Add one to start mapping levels.
      </div>
    );
  }

  return (
    <>
      {sortedStreams.map((stream, index) => {
        const levelCount = stream.levelCount ?? 0;
        return (
          <div
            key={stream.id}
            className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2.5 transition-colors hover:border-primary/30 hover:bg-accent/30"
          >
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 inline-flex h-6 min-w-[26px] items-center justify-center rounded-md bg-muted px-1.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 truncate text-sm font-medium text-card-foreground">
                  <span className="truncate">{stream.name}</span>
                  {stream.hasStartingKit ? (
                    <Badge
                      variant="outline"
                      className="shrink-0 border-primary/30 bg-primary/10 px-1.5 py-0 text-[10px] font-medium text-primary"
                    >
                      Starting kit
                    </Badge>
                  ) : null}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {formatAgeRange(stream.minAge, stream.maxAge)}
                  {" · "}
                  {levelCount} {levelCount === 1 ? "level" : "levels"}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 rounded-md p-0 text-muted-foreground hover:bg-accent hover:text-primary"
                onClick={() => {
                  onEditStream(stream, {
                    name: stream.name,
                    isActive: stream.isActive ?? true,
                    hasStartingKit: stream.hasStartingKit ?? true,
                    minAge: stream.minAge ?? null,
                    maxAge: stream.maxAge ?? null,
                    displayOrder: stream.displayOrder ?? 0,
                    programId,
                  });
                }}
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 rounded-md p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                onClick={() => onDeleteStream(stream)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        );
      })}
    </>
  );
}

// ── TransitionList ────────────────────────────────────────────────────────────

interface TransitionListProps {
  transitions: StreamTransition[];
  streams: Stream[];
  isLoading: boolean;
  onEditTransition: (t: StreamTransition) => void;
  onDeleteTransition: (t: StreamTransition) => void;
  onAddTransition: () => void;
}

export function TransitionList({
  transitions,
  streams,
  isLoading,
  onEditTransition,
  onDeleteTransition,
  onAddTransition,
}: TransitionListProps) {
  const streamName = (id: number) =>
    streams.find((s) => s.id === id)?.name ?? "Unknown stream";

  return (
    <section className="flex flex-col">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Completion transitions
        </h4>
        <Badge
          variant="outline"
          className="border-primary/30 bg-primary/10 text-[10px] font-medium text-primary"
        >
          {transitions.length} active
        </Badge>
      </div>
      <div className="flex flex-col gap-2">
        {transitions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-xs text-muted-foreground">
            No transitions yet. Map how students continue across streams.
          </div>
        ) : (
          transitions.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2"
            >
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                <Badge
                  variant="outline"
                  className="border-border bg-muted/50 text-xs font-normal text-card-foreground"
                >
                  {streamName(t.fromStreamId)}
                </Badge>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                <Badge
                  variant="outline"
                  className="border-border bg-muted/50 text-xs font-normal text-card-foreground"
                >
                  {streamName(t.toStreamId)}
                </Badge>
                <span className="text-[11px] text-muted-foreground">
                  @ order {t.toLevelDisplayOrder}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 rounded-md p-0 text-muted-foreground hover:bg-accent hover:text-primary"
                  onClick={() => onEditTransition(t)}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 rounded-md p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => onDeleteTransition(t)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onAddTransition}
          disabled={isLoading || streams.length < 1}
          className="mt-1 w-full justify-center border-dashed text-muted-foreground hover:text-primary"
        >
          <Plus className="mr-1 h-4 w-4" />
          Add transition
        </Button>
      </div>
    </section>
  );
}
