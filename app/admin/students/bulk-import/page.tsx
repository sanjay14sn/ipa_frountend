"use client";

import { useCallback, useMemo, useReducer, useRef } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { TablePageShell } from "@/components/shared";

const BulkImportPanel = dynamic(
  () =>
    import("@/components/bulk-import/BulkImportPanel").then((m) => ({
      default: m.BulkImportPanel,
    })),
  { ssr: false, loading: () => null },
);
import type {
  PreviewColumn,
  PreviewSelectOption,
} from "@/components/bulk-import/ImportPreviewGrid";
import { getAllFranchise } from "@/services/franchisee.service";
import { getAllPrograms } from "@/services/program.service";
import {
  getEligiblePreviousLevels,
  getLevelsByProgram,
  type EligiblePreviousLevel,
  type Level,
} from "@/services/level.service";
import { getAllStreams } from "@/services/stream.service";
import { getAllAdminCourseInstructors } from "@/services/course-instructor.service";
import { getAgreementsAdmin } from "@/services/agreement.service";
import { STANDARDS } from "@/lib/constants/education";
import { normalizeStudentBulkImportRow } from "@/lib/student-bulk-import-normalization";

const SEX_OPTIONS: PreviewSelectOption[] = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
];

const YES_NO_OPTIONS: PreviewSelectOption[] = [
  { value: "true", label: "Yes", payload: true },
  { value: "false", label: "No", payload: false },
];

const STANDARD_OPTIONS: PreviewSelectOption[] = STANDARDS.map((standard) => ({
  value: standard,
  label: standard,
}));

export default function StudentBulkImportPage() {
  // Admin-scoped queries. Visible in TanStack devtools / network panel.
  const franchisesQ = useQuery({
    queryKey: ["bulk-import", "admin-franchises"],
    queryFn: () => getAllFranchise(),
    staleTime: 5 * 60 * 1000,
  });
  const programsQ = useQuery({
    queryKey: ["bulk-import", "programs"],
    queryFn: getAllPrograms,
    staleTime: 5 * 60 * 1000,
  });
  const cisQ = useQuery({
    queryKey: ["bulk-import", "admin-course-instructors"],
    queryFn: () => getAllAdminCourseInstructors(),
    staleTime: 5 * 60 * 1000,
  });
  const streamsQ = useQuery({
    queryKey: ["bulk-import", "streams"],
    queryFn: getAllStreams,
    staleTime: 5 * 60 * 1000,
  });
  const agreementsQ = useQuery({
    queryKey: ["bulk-import", "admin-agreements"],
    queryFn: () => getAgreementsAdmin(),
    staleTime: 5 * 60 * 1000,
  });
  // Levels must be fetched per program (no bulk endpoint). One query that
  // fans out once programs land.
  const levelsByProgramQ = useQuery({
    queryKey: [
      "bulk-import",
      "levels-by-program",
      (programsQ.data ?? []).map((p) => p.id).sort(),
    ],
    enabled: !!programsQ.data && programsQ.data.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const programs = programsQ.data ?? [];
      const map = new Map<number, Level[]>();
      await Promise.all(
        programs.map(async (p) => {
          try {
            const lvls = await getLevelsByProgram(p.id);
            map.set(p.id, lvls);
          } catch {
            map.set(p.id, []);
          }
        }),
      );
      return map;
    },
  });

  const franchiseOptions = useMemo<PreviewSelectOption[]>(() => {
    const list = franchisesQ.data?.result ?? [];
    return list
      .filter((f) => f.status !== "Rejected" && f.status !== "Inactive")
      .map((f) => ({
        value: String(f.id),
        label: f.status === "Approved" ? f.name : `${f.name} (${f.status})`,
        payload: { id: f.id, name: f.name },
      }));
  }, [franchisesQ.data]);

  const programOptions = useMemo<PreviewSelectOption[]>(() => {
    return (programsQ.data ?? []).map((p) => ({
      value: String(p.id),
      label: p.name,
      payload: { id: p.id, name: p.name },
    }));
  }, [programsQ.data]);

  /**
   * Map `franchiseId → Set<programId>` of programs with an ACTIVE agreement.
   * Commit stamps `enrolledAgreementId` from the current ACTIVE agreement and
   * rejects rows without one (INVALID_STATE), so the picker mirrors that rule.
   */
  const programsByFranchise = useMemo(() => {
    const m = new Map<string, Set<number>>();
    (agreementsQ.data ?? []).forEach((a) => {
      if (!a.franchiseId || a.programId == null) return;
      if (a.status !== "ACTIVE") return;
      const s = m.get(a.franchiseId) ?? new Set<number>();
      s.add(a.programId);
      m.set(a.franchiseId, s);
    });
    return m;
  }, [agreementsQ.data]);

  /** Map `programId (string) → streams (value=streamId, payload={id,name}). */
  const streamOptionsByProgram = useMemo(() => {
    const m = new Map<string, PreviewSelectOption[]>();
    (streamsQ.data ?? []).forEach((s) => {
      if (s.programId == null) return;
      const k = String(s.programId);
      const arr = m.get(k) ?? [];
      arr.push({
        value: String(s.id),
        label: s.name,
        payload: { id: s.id, name: s.name },
      });
      m.set(k, arr);
    });
    return m;
  }, [streamsQ.data]);

  /** Map `streamId (string) → levels (value=levelId, payload={id,code,name,streamId}). */
  const levelOptionsByStream = useMemo(() => {
    const m = new Map<string, PreviewSelectOption[]>();
    levelsByProgramQ.data?.forEach((levels) => {
      levels.forEach((l) => {
        const k = String(l.streamId);
        const arr = m.get(k) ?? [];
        const label = l.code ? `${l.code} — ${l.name}` : l.name;
        arr.push({
          value: String(l.id),
          label,
          payload: {
            id: l.id,
            code: l.code ?? "",
            name: l.name,
            streamId: l.streamId,
          },
        });
        m.set(k, arr);
      });
    });
    return m;
  }, [levelsByProgramQ.data]);

  /** Map `franchiseId (string) → CIs`. The CI mapper in services/course-instructor.service.ts
   *  has a quirk: it stores the real `franchiseId` in `franchise.name` and
   *  hard-codes `franchise.id = 0`. We bypass it by reading the raw row. */
  const ciOptionsByFranchise = useMemo(() => {
    const m = new Map<string, PreviewSelectOption[]>();
    (cisQ.data?.result ?? []).forEach((ci) => {
      // Real franchiseId lives in `franchise.name` per the mapper quirk —
      // fall back to it if a clean `franchiseId` field isn't surfaced.
      const fid = String(
        (ci as unknown as { franchiseId?: unknown }).franchiseId ??
          ci.franchise?.name ??
          "",
      );
      if (!fid) return;
      const arr = m.get(fid) ?? [];
      arr.push({
        value: String(ci.id),
        label: `${ci.instructorId} — ${ci.name}`,
        payload: { id: ci.id, instructorCode: ci.instructorId, name: ci.name },
      });
      m.set(fid, arr);
    });
    return m;
  }, [cisQ.data]);

  const lookupsLoading =
    franchisesQ.isLoading ||
    programsQ.isLoading ||
    streamsQ.isLoading ||
    cisQ.isLoading ||
    agreementsQ.isLoading ||
    levelsByProgramQ.isLoading;

  const lookupErrors = [
    franchisesQ.error && `franchises: ${(franchisesQ.error as Error).message}`,
    programsQ.error && `programs: ${(programsQ.error as Error).message}`,
    streamsQ.error && `streams: ${(streamsQ.error as Error).message}`,
    cisQ.error && `course instructors: ${(cisQ.error as Error).message}`,
    agreementsQ.error && `agreements: ${(agreementsQ.error as Error).message}`,
    levelsByProgramQ.error &&
      `levels: ${(levelsByProgramQ.error as Error).message}`,
  ].filter(Boolean) as string[];

  const totalLevels = useMemo(() => {
    let n = 0;
    levelsByProgramQ.data?.forEach((arr) => (n += arr.length));
    return n;
  }, [levelsByProgramQ.data]);

  /**
   * Per-level eligibility cache. Populated lazily — when the admin picks a
   * level (or the preview lands with a level already filled), we fire off
   * `getEligiblePreviousLevels(levelId)` once and remember the result. The
   * options builder reads from this cache so dropdowns reflect the LATEST
   * picked level, not the CSV's original one.
   * Implemented via ref + force-rerender to avoid a React state-update
   * inside derive/options (both run during render).
   */
  const eligibilityCacheRef = useRef<Map<number, EligiblePreviousLevel[]>>(
    new Map(),
  );
  const inflightRef = useRef<Set<number>>(new Set());
  const [, forceRerender] = useReducer((x: number) => x + 1, 0);

  const fetchEligibilityFor = useCallback(async (levelId: number) => {
    if (
      eligibilityCacheRef.current.has(levelId) ||
      inflightRef.current.has(levelId)
    ) {
      return;
    }
    inflightRef.current.add(levelId);
    try {
      const data = await getEligiblePreviousLevels(levelId);
      eligibilityCacheRef.current.set(levelId, data);
      forceRerender();
    } catch {
      // Leave the entry missing; UI shows an empty dropdown rather than crash.
    } finally {
      inflightRef.current.delete(levelId);
    }
  }, []);

  /**
   * Cascade rules — bulk import is existing-only:
   *  - program changes → clear stream, level, previousLevel
   *  - stream changes  → clear level, previousLevel
   *  - level changes   → AWAIT eligibility fetch for the new level, then
   *    default previousLevel to the first same-stream candidate (or first
   *    overall). Brief async delay on cache miss, but the default always
   *    populates so the admin doesn't have to manually pick.
   */
  const derive = useMemo(() => {
    return async (
      row: Record<string, unknown>,
      changedField: string,
    ): Promise<Record<string, unknown> | null> => {
      const normalized = normalizeStudentBulkImportRow(row);
      const mergeNormalized = (
        patch: Record<string, unknown> | null,
      ): Record<string, unknown> | null => {
        if (!normalized) return patch;
        if (!patch) return normalized;
        return { ...normalized, ...patch };
      };

      if (changedField === "program") {
        return mergeNormalized({
          stream: null,
          level: null,
          previousLevel: null,
        });
      }
      if (changedField === "stream") {
        return mergeNormalized({ level: null, previousLevel: null });
      }
      // Both initial preview load (sentinel "__initial") and real level
      // edits run through the same default-fill logic; the ONE difference
      // is cache seeding (see below).
      if (changedField !== "level" && changedField !== "__initial") {
        return normalized;
      }

      const level = row.level as { id?: number; streamId?: number } | null;
      if (!level?.id) return mergeNormalized({ previousLevel: null });

      // Cache seeding — only on initial preview load. On real edits the
      // `row.previousLevelOptions` is STALE (computed by the server for the
      // row's PREVIOUS level, not the one the admin just picked), so
      // seeding from it would poison the cache for the new level id.
      if (changedField === "__initial") {
        const serverOptions = row.previousLevelOptions as
          | EligiblePreviousLevel[]
          | undefined;
        if (
          serverOptions &&
          serverOptions.length > 0 &&
          !eligibilityCacheRef.current.has(level.id)
        ) {
          eligibilityCacheRef.current.set(level.id, serverOptions);
        }
      }

      // Await the fetch (no-op if cached) so the default-fill is always
      // computed against the SAME level the row currently holds — no stale
      // data, no leftover-null cell.
      if (!eligibilityCacheRef.current.has(level.id)) {
        await fetchEligibilityFor(level.id);
      }

      const candidates = eligibilityCacheRef.current.get(level.id);
      if (!candidates || candidates.length === 0) {
        return mergeNormalized({ previousLevel: null });
      }

      const sameStream = candidates.find((c) => !c.viaTransition);
      const pick = sameStream ?? candidates[0];

      // `totalMarks` is intrinsic to the Level — no longer stored per
      // progression, so nothing else to pre-fill alongside previousLevel.
      const patch: Record<string, unknown> = {
        previousLevel: {
          id: pick.id,
          code: pick.code,
          name: pick.name,
          streamId: pick.streamId,
        },
      };
      return mergeNormalized(patch);
    };
  }, [fetchEligibilityFor]);

  const columns: PreviewColumn[] = useMemo(
    () => [
      // ── Franchise / Program / Stream / Level ─────────────────────────────
      {
        section: "Franchise & program",
        key: "franchise",
        label: "Franchise",
        options: franchiseOptions,
        placeholder: "Pick a franchise",
      },
      {
        section: "Franchise & program",
        key: "program",
        label: "Program",
        options: (row) => {
          const fid = (row.franchise as { id?: string } | null)?.id;
          if (!fid) return programOptions;
          const allowed = programsByFranchise.get(fid);
          if (!allowed) return [];
          return programOptions.filter((o) => allowed.has(Number(o.value)));
        },
        placeholder: "Pick a program (franchise first)",
      },
      {
        section: "Franchise & program",
        key: "stream",
        label: "Stream",
        options: (row) => {
          const pid = (row.program as { id?: number } | null)?.id;
          return pid != null
            ? (streamOptionsByProgram.get(String(pid)) ?? [])
            : [];
        },
        placeholder: "Pick a stream (program first)",
      },
      {
        section: "Franchise & program",
        key: "level",
        label: "Level",
        options: (row) => {
          const sid = (row.stream as { id?: number } | null)?.id;
          return sid != null
            ? (levelOptionsByStream.get(String(sid)) ?? [])
            : [];
        },
        placeholder: "Pick a level (stream first)",
      },
      // ── Student basic info ───────────────────────────────────────────────
      { section: "Student info", key: "name", label: "Name" },
      {
        section: "Student info",
        key: "sex",
        label: "Sex",
        options: SEX_OPTIONS,
        placeholder: "Male / Female",
      },
      {
        section: "Student info",
        key: "dateOfBirth",
        label: "Date of birth",
        type: "date",
        placeholder: "DD / MM / YYYY",
      },
      {
        section: "Student info",
        key: "dateOfJoining",
        label: "Date of joining",
        type: "date",
        placeholder: "DD / MM / YYYY",
      },
      {
        section: "Student info",
        key: "standard",
        label: "Standard",
        options: STANDARD_OPTIONS,
        placeholder: "Select standard",
      },
      {
        section: "Student info",
        key: "idCardIssued",
        label: "ID card issued",
        options: YES_NO_OPTIONS,
        placeholder: "Yes / No",
      },
      // ── Parents ──────────────────────────────────────────────────────────
      { section: "Father's info", key: "fatherName", label: "Father's name" },
      {
        section: "Father's info",
        key: "fatherContactNo",
        label: "Father's contact no",
      },
      {
        section: "Father's info",
        key: "fatherOccupation",
        label: "Father's occupation",
      },
      {
        section: "Father's info",
        key: "fatherQualification",
        label: "Father's qualification",
      },
      { section: "Mother's info", key: "motherName", label: "Mother's name" },
      {
        section: "Mother's info",
        key: "motherContactNo",
        label: "Mother's contact no",
      },
      {
        section: "Mother's info",
        key: "motherOccupation",
        label: "Mother's occupation",
      },
      {
        section: "Mother's info",
        key: "motherQualification",
        label: "Mother's qualification",
      },
      // ── Contact ──────────────────────────────────────────────────────────
      { section: "Contact", key: "email", label: "Email" },
      {
        section: "Contact",
        key: "residentialAddress",
        label: "Residential address",
      },
      // ── Previous level (transfer-in) ─────────────────────────────────────
      {
        // Live dropdown — reads from the page's eligibility cache keyed by
        // the row's CURRENT picked level. If the cache is empty for this
        // level, kick off the fetch and return [] (the dropdown will
        // refresh once the data lands).
        section: "Previous level",
        key: "previousLevel",
        label: "Prev. level",
        placeholder: "Pick a previous level",
        options: (row) => {
          const levelId = (row.level as { id?: number } | null)?.id;
          if (!levelId) return [];
          const cached = eligibilityCacheRef.current.get(levelId);
          if (!cached) {
            void fetchEligibilityFor(levelId);
            return [];
          }
          return cached.map((l) => ({
            value: String(l.id),
            label: l.viaTransition
              ? `${l.code} — ${l.name}  (via ${l.streamName})`
              : `${l.code} — ${l.name}`,
            payload: {
              id: l.id,
              code: l.code,
              name: l.name,
              streamId: l.streamId,
            },
          }));
        },
      },
      {
        section: "Previous level",
        key: "materialsOrdered",
        label: "Materials ordered",
        options: YES_NO_OPTIONS,
        placeholder: "Yes / No",
      },
      {
        section: "Previous level",
        key: "previousCertificateDispatched",
        label: "Prev. certificate dispatched",
        options: YES_NO_OPTIONS,
        placeholder: "Yes / No",
      },
      {
        section: "Previous level",
        key: "previousMarks",
        label: "Prev. marks obtained",
      },
      {
        section: "Previous level",
        key: "previousCompletedAt",
        label: "Prev. completed at",
        type: "date",
        placeholder: "DD / MM / YYYY",
      },
      {
        section: "Previous level",
        key: "previousInstructor",
        label: "Prev. course instructor",
        options: (row) => {
          const fid = (row.franchise as { id?: string } | null)?.id;
          return fid ? (ciOptionsByFranchise.get(fid) ?? []) : [];
        },
        placeholder: "Pick a CI (franchise first)",
      },
    ],
    [
      franchiseOptions,
      programOptions,
      programsByFranchise,
      streamOptionsByProgram,
      levelOptionsByStream,
      ciOptionsByFranchise,
      fetchEligibilityFor,
    ],
  );

  return (
    <TablePageShell
      title="Bulk import students (existing / transfer)"
      description="Upload a CSV of EXISTING / transfer students. New enrollments must go through the single-create modal. Previous level is auto-derived from the level you pick (one step below, within the same stream). Lookup dropdowns are populated from /admin/franchise/all, /catalog/program, /catalog/stream, /catalog/level/by-program/:id, /admin/course-instructor, and /admin/agreement."
    >
      {lookupsLoading && (
        <div className="mb-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
          Loading dropdown data (franchises, programs, levels, instructors, agreements)…
        </div>
      )}
      {lookupErrors.length > 0 && (
        <div className="mb-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800">
          <p className="mb-1 font-medium">Failed to load some dropdown data:</p>
          <ul className="list-inside list-disc">
            {lookupErrors.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </div>
      )}
      {!lookupsLoading && lookupErrors.length === 0 && (
        <div className="mb-3 text-xs text-muted-foreground">
          Loaded {franchiseOptions.length} franchises ·{" "}
          {programOptions.length} programs ·{" "}
          {streamsQ.data?.length ?? 0} streams · {totalLevels} levels ·{" "}
          {cisQ.data?.result.length ?? 0} course instructors ·{" "}
          {agreementsQ.data?.length ?? 0} agreements.
        </div>
      )}
      <BulkImportPanel
        config={{
          entityLabel: "students",
          previewUrl: "/admin/student/bulk-import/preview",
          commitUrl: "/admin/student/bulk-import/commit",
          templateUrl: "/admin/student/bulk-import/template",
          templateFilename: "students-bulk-import-template.csv",
          columns,
          derive,
          uploadHelperText:
            'Existing / transfer students only. Required columns: franchiseName, programCode, streamName, levelCode, name, sex, dateOfBirth, dateOfJoining, standard, idCardIssued, fatherName, fatherContactNo, fatherOccupation, fatherQualification, motherName, motherContactNo, motherOccupation, motherQualification, email, residentialAddress, previousMarks, previousCompletedAt, previousInstructorCode, materialsOrdered, previousCertificateDispatched. Boolean columns (idCardIssued, materialsOrdered, previousCertificateDispatched) accept true/false or yes/no. Previous level is auto-derived from the picked level; total marks come from the level itself. IMPORTANT: any field containing a comma (e.g. an address like "123 Main St, Chennai") MUST be wrapped in double quotes — otherwise the comma will split it into separate cells.',
        }}
      />
    </TablePageShell>
  );
}
