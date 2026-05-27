"use client";

import { Button } from "@/components/ui/button";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageTabs, TabsContent as PageTabsContent } from "@/components/shared/page-tabs";
import { LevelManagement } from "@/app/admin/profile/components/LevelManagement";
import { CITrainingLevelManagement } from "@/app/admin/profile/components/CITrainingLevelManagement";
import { ProgramKitManagement } from "@/app/admin/profile/components/ProgramKitManagement";
import { StreamManagement } from "@/app/admin/profile/components/StreamManagement";
import { CertificateTemplateSection } from "@/app/admin/profile/components/CertificateTemplateSection";
import { useStreamsByProgram } from "@/hooks/api/stream.hooks";
import { useStreamTransitionsByProgram } from "@/hooks/api/stream-transition.hooks";
import type { Program } from "@/services/program.service";
import type { Stream } from "@/services/stream.service";
import type { StreamTransition } from "@/services/stream-transition.service";

// ── Catalog panels ───────────────────────────────────────────────────────────

interface BasicProgramCatalogPanelProps {
  programId: number;
  programName: string;
  catalogVersion: number;
  onCatalogChange: () => void;
}

function BasicProgramCatalogPanel({
  programId,
  programName,
  catalogVersion,
  onCatalogChange,
}: BasicProgramCatalogPanelProps) {
  const streamsQuery = useStreamsByProgram(programId);
  const transitionsQuery = useStreamTransitionsByProgram(programId);
  const streams = (streamsQuery.data ?? []) as Stream[];
  const transitions = (transitionsQuery.data ?? []) as StreamTransition[];
  const isLoading = streamsQuery.isLoading || transitionsQuery.isLoading;

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="rounded-lg border bg-white p-4 text-sm text-gray-500 shadow-sm">
          Loading streams...
        </div>
      ) : null}
      {!isLoading ? (
        <>
          <LevelManagement
            programId={programId}
            programName={programName}
            initialStreams={streams}
            initialTransitions={transitions}
            skipCatalogLoad
            catalogVersion={catalogVersion}
          />
          <StreamManagement
            programId={programId}
            programName={programName}
            compact
            initialStreams={streams}
            initialTransitions={transitions}
            skipInitialLoad
            onCatalogChange={onCatalogChange}
          />
        </>
      ) : null}
    </div>
  );
}

// ── ProgramList ──────────────────────────────────────────────────────────────

type ProgramTabMode = "basic" | "ci-training" | "kit-items" | "certificate";

interface ProgramListProps {
  programs: Program[];
  isLoading: boolean;
  activeProgramId: string;
  onActiveProgramIdChange: (id: string) => void;
  openLevelModes: Record<number, ProgramTabMode>;
  onLevelModeChange: (programId: number, mode: ProgramTabMode) => void;
  catalogTick: number;
  onCatalogChange: () => void;
  onAddProgram: () => void;
  onEditProgram: (program: Program) => void;
  onDeleteProgram: (program: Program) => void;
  onKitCountChange: (programId: number, count: number) => void;
}

export function ProgramList({
  programs,
  isLoading,
  activeProgramId,
  onActiveProgramIdChange,
  openLevelModes,
  onLevelModeChange,
  catalogTick,
  onCatalogChange,
  onAddProgram,
  onEditProgram,
  onDeleteProgram,
  onKitCountChange,
}: ProgramListProps) {
  if (programs.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border bg-card px-4 py-4 shadow-sm sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl text-card-foreground">Programs</h1>
              <p className="text-sm text-muted-foreground">
                Configure program structure, streams, and kit defaults.
              </p>
            </div>
            <Button onClick={onAddProgram}>
              <Plus className="mr-2 h-4 w-4" />
              Add Program
            </Button>
          </div>
        </div>
        <div className="rounded-2xl border border-dashed bg-card px-6 py-10 text-center text-sm text-muted-foreground">
          {isLoading
            ? "Loading programs…"
            : "No programs yet. Create your first program to get started."}
        </div>
      </div>
    );
  }

  return (
    <PageTabs
      title="Programs"
      description="Configure program structure, streams, and kit defaults."
      action={
        <Button onClick={onAddProgram}>
          <Plus className="mr-2 h-4 w-4" />
          Add Program
        </Button>
      }
      tabs={programs.map((program) => ({
        value: String(program.id),
        label: program.name,
      }))}
      value={activeProgramId || String(programs[0].id)}
      onValueChange={onActiveProgramIdChange}
    >
      {programs.map((program) => (
        <PageTabsContent
          key={program.id}
          value={String(program.id)}
          className="mt-0 space-y-4"
        >
          <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
            <Tabs
              value={openLevelModes[program.id] ?? "basic"}
              onValueChange={(value) =>
                onLevelModeChange(program.id, value as ProgramTabMode)
              }
              className="space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <TabsList className="flex h-auto flex-wrap gap-1">
                  <TabsTrigger value="basic">Basic</TabsTrigger>
                  <TabsTrigger value="ci-training">CI Training</TabsTrigger>
                  <TabsTrigger value="kit-items">Kit Items</TabsTrigger>
                  <TabsTrigger value="certificate">Certificate</TabsTrigger>
                </TabsList>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 rounded-md p-0"
                    onClick={() => onEditProgram(program)}
                    title="Rename program"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 rounded-md p-0"
                    onClick={() => onDeleteProgram(program)}
                    title="Delete program"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <TabsContent value="basic">
                <BasicProgramCatalogPanel
                  programId={program.id}
                  programName={program.name}
                  catalogVersion={catalogTick}
                  onCatalogChange={onCatalogChange}
                />
              </TabsContent>
              <TabsContent value="ci-training">
                <CITrainingLevelManagement
                  programId={program.id}
                  programName={program.name}
                />
              </TabsContent>
              <TabsContent value="kit-items">
                <ProgramKitManagement
                  programId={program.id}
                  programName={program.name}
                  onCountChange={(count) =>
                    onKitCountChange(program.id, count)
                  }
                />
              </TabsContent>
              <TabsContent value="certificate">
                <CertificateTemplateSection
                  program={program}
                  isActive={
                    (openLevelModes[program.id] ?? "basic") === "certificate"
                  }
                />
              </TabsContent>
            </Tabs>
          </div>
        </PageTabsContent>
      ))}
    </PageTabs>
  );
}
