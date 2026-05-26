"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { TablePageShell } from "@/components/shared";
import { BulkImportPanel } from "@/components/bulk-import/BulkImportPanel";
import type {
  PreviewColumn,
  PreviewSelectOption,
} from "@/components/bulk-import/ImportPreviewGrid";
import { getAllFranchise } from "@/services/franchisee.service";
import { getAllPrograms } from "@/services/program.service";
import { getAgreementsAdmin } from "@/services/agreement.service";

const BOOL_OPTIONS: PreviewSelectOption[] = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

const EXISTING_OPTIONS: PreviewSelectOption[] = [
  { value: "true", label: "Yes (back-filled / existing)" },
  { value: "false", label: "No (fresh CI)" },
];

export default function CourseInstructorBulkImportPage() {
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
  const agreementsQ = useQuery({
    queryKey: ["bulk-import", "agreements"],
    queryFn: () => getAgreementsAdmin(),
    staleTime: 5 * 60 * 1000,
  });

  const franchiseOptions = useMemo<PreviewSelectOption[]>(() => {
    return (franchisesQ.data?.result ?? [])
      .filter((f) => f.status !== "Rejected" && f.status !== "Inactive")
      .map((f) => ({
        value: String(f.id),
        label: f.status === "Active" ? f.name : `${f.name} (${f.status})`,
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

  const programsByFranchise = useMemo(() => {
    const m = new Map<string, Set<number>>();
    (agreementsQ.data ?? []).forEach((a) => {
      if (!a.franchiseId || a.programId == null) return;
      if (a.status === "Void") return;
      const s = m.get(a.franchiseId) ?? new Set<number>();
      s.add(a.programId);
      m.set(a.franchiseId, s);
    });
    return m;
  }, [agreementsQ.data]);

  const lookupsLoading =
    franchisesQ.isLoading || programsQ.isLoading || agreementsQ.isLoading;

  const lookupErrors = [
    franchisesQ.error && `franchises: ${(franchisesQ.error as Error).message}`,
    programsQ.error && `programs: ${(programsQ.error as Error).message}`,
    agreementsQ.error && `agreements: ${(agreementsQ.error as Error).message}`,
  ].filter(Boolean) as string[];

  const columns: PreviewColumn[] = useMemo(
    () => [
      { key: "franchise", label: "Franchise", options: franchiseOptions, placeholder: "Pick a franchise" },
      {
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
      { key: "name", label: "Name" },
      { key: "dob", label: "DOB (YYYY-MM-DD)" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "address", label: "Address" },
      { key: "city", label: "City" },
      { key: "bloodGroup", label: "Blood group" },
      { key: "education", label: "Education" },
      { key: "occupation", label: "Occupation" },
      { key: "reference", label: "Reference" },
      { key: "existing", label: "Existing / back-filled CI?", options: EXISTING_OPTIONS },
      { key: "state", label: "State" },
      { key: "validFrom", label: "Valid from" },
      { key: "validUntil", label: "Valid until" },
      { key: "agreementSignedAt", label: "Agreement signed at" },
      { key: "completedThrough", label: "Completed through (level order)" },
      { key: "packageName", label: "Package name" },
      { key: "packageCode", label: "Package code" },
      { key: "packageDescription", label: "Package description" },
      { key: "packageOrder", label: "Package order" },
      { key: "packageFee", label: "Package fee" },
      {
        key: "packagePaid",
        label: "Package paid?",
        options: BOOL_OPTIONS,
        placeholder: "Yes / No",
      },
      {
        key: "trainingLevels",
        label: "Training levels (read-only summary)",
      },
    ],
    [franchiseOptions, programOptions, programsByFranchise],
  );

  return (
    <TablePageShell
      title="Bulk import course instructors"
      description="Upload a CSV. Names are resolved into {id, name} objects against the database. Lookup dropdowns are populated from /franchise, /program, and /admin/agreement."
    >
      {lookupsLoading && (
        <div className="mb-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
          Loading dropdown data (franchises, programs, agreements)…
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
          {agreementsQ.data?.length ?? 0} agreements.
        </div>
      )}
      <BulkImportPanel
        config={{
          entityLabel: "course instructors",
          previewUrl: "/admin/course-instructor/bulk-import/preview",
          commitUrl: "/admin/course-instructor/bulk-import/commit",
          templateUrl: "/admin/course-instructor/bulk-import/template",
          templateFilename: "course-instructors-bulk-import-template.csv",
          columns,
          uploadHelperText:
            'CSV columns: franchiseName, programCode, name, dob, phone, email, address, city, bloodGroup, education, occupation, reference. For an existing CI also set existing=true plus validFrom, validUntil, agreementSignedAt, the package* fields, and pipe-separated trainingLevelCodes.',
        }}
      />
    </TablePageShell>
  );
}
