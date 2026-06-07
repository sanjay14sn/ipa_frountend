"use client";

import { useState, useEffect } from "react";
import { getAllPrograms, Program } from "@/services/program.service";
import {
  getLevelsByStream,
  getEligiblePreviousLevels,
  Level,
  type EligiblePreviousLevel,
} from "@/services/level.service";
import { getStreamsByProgram, Stream } from "@/services/stream.service";
import {
  getAllCourseInstructors,
  type CourseInstructorData,
} from "@/services/course-instructor.service";
import { sendClientLog } from "@/lib/client-telemetry";

export interface CascadingSelectsOptions {
  /** Whether the modal is open — programs are only fetched while open. */
  open: boolean;
  programId: number;
  streamId: number;
  levelId: number;
  onLevelIdChange: (id: number) => void;
  onPreviousLevelIdChange?: (id: number) => void;

  // Extra state needed only for the "existing student" path (Add modal)
  existing?: boolean;
  franchiseId?: string | number;
}

export interface CascadingSelectsResult {
  programs: Program[];
  streams: Stream[];
  levels: Level[];
  previousLevelCandidates: EligiblePreviousLevel[];
  instructors: CourseInstructorData[];
  loadingPrograms: boolean;
  loadingStreams: boolean;
  loadingLevels: boolean;
  loadingInstructors: boolean;
}

/**
 * Manages the three cascading select chains used by both the Add and Edit
 * student modals:
 *
 *   program → streams → levels → (previousLevelCandidates + instructors for
 *   existing-student registrations)
 *
 * The hook is purely data-fetching; it does NOT mutate formData directly — it
 * surfaces the data lists and calls the provided callbacks when auto-selection
 * is required.
 */
export function useCascadingSelects(
  opts: CascadingSelectsOptions,
): CascadingSelectsResult {
  const {
    open,
    programId,
    streamId,
    levelId,
    onLevelIdChange,
    onPreviousLevelIdChange,
    existing = false,
    franchiseId,
  } = opts;

  const [programs, setPrograms] = useState<Program[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [previousLevelCandidates, setPreviousLevelCandidates] = useState<
    EligiblePreviousLevel[]
  >([]);
  const [instructors, setInstructors] = useState<CourseInstructorData[]>([]);

  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [loadingStreams, setLoadingStreams] = useState(false);
  const [loadingLevels, setLoadingLevels] = useState(false);
  const [loadingInstructors, setLoadingInstructors] = useState(false);

  // 1. Fetch programs when modal opens
  useEffect(() => {
    if (!open) return;
    const fetchPrograms = async () => {
      setLoadingPrograms(true);
      try {
        const fetched = await getAllPrograms();
        setPrograms(fetched);
      } catch (error) {
        sendClientLog({
          level: "error",
          event: "programs-load-error",
          message: "Error fetching programs",
          context: { error },
        });
      } finally {
        setLoadingPrograms(false);
      }
    };
    fetchPrograms();
  }, [open]);

  // 2. Fetch streams when program changes
  useEffect(() => {
    const fetchStreams = async () => {
      if (programId && programId > 0) {
        setLoadingStreams(true);
        try {
          const fetched = await getStreamsByProgram(programId);
          setStreams(fetched);
        } catch (error) {
          sendClientLog({
            level: "error",
            event: "streams-load-error",
            message: "Error fetching streams",
            context: { error },
          });
          setStreams([]);
        } finally {
          setLoadingStreams(false);
        }
      } else {
        setStreams([]);
        setLevels([]);
      }
    };
    fetchStreams();
  }, [programId]);

  // 3. Fetch levels when stream changes; optionally auto-select first level
  useEffect(() => {
    const fetchLevels = async () => {
      if (streamId && streamId > 0) {
        setLoadingLevels(true);
        try {
          const fetched = await getLevelsByStream(streamId);
          setLevels(fetched);
          if (fetched.length > 0) {
            // The starting level is freely changeable for every mode — we no
            // longer force new students onto the first level. Just drop a stale
            // pick if it isn't part of the newly-fetched stream so the admin
            // can choose any level.
            const stillValid = fetched.some((l) => l.id === levelId);
            if (!stillValid) {
              onLevelIdChange(0);
              onPreviousLevelIdChange?.(0);
            }
          }
        } catch (error) {
          sendClientLog({
            level: "error",
            event: "levels-load-error",
            message: "Error fetching levels",
            context: { error },
          });
          setLevels([]);
        } finally {
          setLoadingLevels(false);
        }
      } else {
        setLevels([]);
      }
    };
    fetchLevels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamId]);

  // 4. Fetch eligible previous-level candidates (existing-student Add only)
  useEffect(() => {
    if (!existing || !levelId || levelId === 0) {
      setPreviousLevelCandidates([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const candidates = await getEligiblePreviousLevels(levelId);
        if (cancelled) return;
        setPreviousLevelCandidates(candidates);

        // Default-select the same-stream predecessor with highest displayOrder
        const defaultCandidate =
          [...candidates]
            .filter((c) => !c.viaTransition)
            .sort((a, b) => b.displayOrder - a.displayOrder)[0] ??
          candidates[0];

        const nextId = defaultCandidate?.id ?? 0;
        onPreviousLevelIdChange?.(nextId);
      } catch {
        if (!cancelled) setPreviousLevelCandidates([]);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing, levelId]);

  // 5. Fetch instructors (existing-student Add only)
  useEffect(() => {
    if (!existing || !programId || programId === 0 || !franchiseId) {
      setInstructors([]);
      return;
    }
    let cancelled = false;
    const fetchInstructors = async () => {
      setLoadingInstructors(true);
      try {
        const paginated = await getAllCourseInstructors({
          franchiseId: franchiseId != null ? String(franchiseId) : undefined,
          programId,
          limit: 200,
        });
        if (!cancelled) setInstructors(paginated.result ?? []);
      } catch (error) {
        sendClientLog({
          level: "error",
          event: "instructors-load-error",
          message: "Error fetching instructors",
          context: { error },
        });
        if (!cancelled) setInstructors([]);
      } finally {
        if (!cancelled) setLoadingInstructors(false);
      }
    };
    fetchInstructors();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing, programId, franchiseId]);

  return {
    programs,
    streams,
    levels,
    previousLevelCandidates,
    instructors,
    loadingPrograms,
    loadingStreams,
    loadingLevels,
    loadingInstructors,
  };
}
