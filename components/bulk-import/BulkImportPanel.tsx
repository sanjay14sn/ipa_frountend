"use client";

import { useCallback, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { extractErrorMessage } from "@/lib/error-utils";
import {
  commitBulkUpload,
  previewBulkUpload,
  type BulkPreviewResponse,
  type PreviewRow,
} from "@/services/bulk-import.service";
import { CsvUploadZone } from "./CsvUploadZone";
import {
  ImportPreviewGrid,
  type PreviewColumn,
} from "./ImportPreviewGrid";

export interface BulkImportEntityConfig {
  /** Human-readable entity label, e.g. "students" or "course instructors". */
  entityLabel: string;
  /** Backend endpoint that accepts the file upload (POST multipart). */
  previewUrl: string;
  /** Backend endpoint that accepts the JSON rows for committal (POST JSON). */
  commitUrl: string;
  /** Backend endpoint that returns the CSV template (GET). */
  templateUrl: string;
  /** Filename suggested when the browser saves the template download. */
  templateFilename: string;
  /** Columns rendered in the preview grid (and the order). */
  columns: PreviewColumn[];
  /** Extra helper text on the upload screen. */
  uploadHelperText?: string;
  /**
   * Optional cascade hook. Runs after any cell edit with the row's NEW data
   * and the field that changed. Return a partial patch to merge into the
   * row (e.g. auto-derive `previousLevel` from the level the admin just
   * picked, mirroring the single-create modal's behaviour). Return null to
   * leave the row unchanged.
   *
   * May be sync or async — the panel awaits the result so derive can fetch
   * dependent data (e.g. eligibility for a new level) before producing the
   * final patch.
   */
  derive?: (
    row: Record<string, unknown>,
    changedField: string,
  ) =>
    | Record<string, unknown>
    | null
    | Promise<Record<string, unknown> | null>;
}

type Step = "upload" | "preview" | "done";

/**
 * End-to-end bulk-import flow:
 *   1. Upload a CSV   → backend parses + resolves names→IDs (no DB writes)
 *   2. Preview/edit   → admin fixes bad cells inline
 *   3. Commit         → backend creates each row independently; failures listed
 */
export function BulkImportPanel({ config }: { config: BulkImportEntityConfig }) {
  const [step, setStep] = useState<Step>("upload");
  const [previewData, setPreviewData] =
    useState<BulkPreviewResponse<unknown> | null>(null);
  const [commitResult, setCommitResult] = useState<{
    created: number;
    failed: Array<{ rowIndex: number; error: string }>;
  } | null>(null);

  const previewMutation = useMutation({
    mutationFn: (file: File) =>
      previewBulkUpload<unknown>(config.previewUrl, file),
    onSuccess: async (data) => {
      // Run the page's `derive` hook once per row so auto-fields (e.g.
      // previousLevel from level) get populated on initial preview load,
      // not just on subsequent cell edits. Sentinel `"__initial"` lets the
      // page distinguish initial-load from a real user edit (matters for
      // caches that should only be seeded from server-embedded data when
      // it still matches the row's current shape). Awaited because derive
      // may need to fetch dependent data first.
      const seededRows = config.derive
        ? await Promise.all(
            data.rows.map(async (r) => {
              const baseData = r.data as Record<string, unknown>;
              const extra = await config.derive!(baseData, "__initial");
              if (!extra) return r;
              const clearedFields = new Set(Object.keys(extra));
              return {
                ...r,
                data: { ...baseData, ...extra },
                errors: r.errors.filter((e) => !clearedFields.has(e.field)),
              };
            }),
          )
        : data.rows;
      // Recompute summary because derive may have fixed errors.
      const valid = seededRows.filter((r) => r.errors.length === 0).length;
      const finalData = {
        ...data,
        rows: seededRows,
        summary: {
          total: seededRows.length,
          valid,
          invalid: seededRows.length - valid,
        },
      };
      setPreviewData(finalData);
      setStep("preview");
      toast.success(
        `Parsed ${finalData.summary.total} rows — ${finalData.summary.valid} valid, ${finalData.summary.invalid} need attention.`,
      );
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, "Failed to parse the CSV file."));
    },
  });

  const commitMutation = useMutation({
    mutationFn: () => {
      if (!previewData) throw new Error("No preview data");
      const rowsToCommit = previewData.rows
        .filter((r) => r.errors.length === 0)
        .map((r) => ({ rowIndex: r.rowIndex, data: r.data }));
      return commitBulkUpload<unknown, { id: number | string }>(
        config.commitUrl,
        rowsToCommit,
      );
    },
    onSuccess: (result) => {
      setCommitResult({
        created: result.created.length,
        failed: result.failed,
      });
      setStep("done");
      if (result.failed.length === 0) {
        toast.success(`Imported ${result.created.length} ${config.entityLabel}.`);
      } else {
        toast.warning(
          `Imported ${result.created.length} ${config.entityLabel}; ${result.failed.length} failed.`,
        );
      }
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, "Failed to commit the import."));
    },
  });

  const handleRowEdit = useCallback(
    async (rowIndex: number, field: string, value: unknown) => {
      // Apply the user's edit immediately so the UI feels responsive even
      // if derive needs to fetch async data afterwards.
      let baseData: Record<string, unknown> | null = null;
      setPreviewData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          rows: prev.rows.map((r) => {
            if (r.rowIndex !== rowIndex) return r;
            const newData = {
              ...(r.data as Record<string, unknown>),
              [field]: value,
            };
            baseData = newData;
            return {
              ...r,
              data: newData,
              errors: r.errors.filter((e) => e.field !== field),
            } as PreviewRow<unknown>;
          }),
        };
      });

      // Now run derive — may be async (e.g. fetches eligibility for the
      // newly picked level). Once it resolves, apply the extra patch.
      if (!config.derive || !baseData) return;
      const extra = await config.derive(baseData, field);
      if (!extra) return;

      setPreviewData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          rows: prev.rows.map((r) => {
            if (r.rowIndex !== rowIndex) return r;
            const merged = {
              ...(r.data as Record<string, unknown>),
              ...extra,
            };
            const clearedFields = new Set(Object.keys(extra));
            return {
              ...r,
              data: merged,
              errors: r.errors.filter((e) => !clearedFields.has(e.field)),
            } as PreviewRow<unknown>;
          }),
        };
      });
    },
    [config],
  );

  const handleRowDelete = useCallback((rowIndex: number) => {
    setPreviewData((prev) => {
      if (!prev) return prev;
      const newRows = prev.rows.filter((r) => r.rowIndex !== rowIndex);
      const valid = newRows.filter((r) => r.errors.length === 0).length;
      return {
        ...prev,
        rows: newRows,
        summary: {
          total: newRows.length,
          valid,
          invalid: newRows.length - valid,
        },
      };
    });
  }, []);

  const resetFlow = () => {
    setStep("upload");
    setPreviewData(null);
    setCommitResult(null);
  };

  const validCount = useMemo(() => {
    if (!previewData) return 0;
    return previewData.rows.filter((r) => r.errors.length === 0).length;
  }, [previewData]);

  if (step === "upload") {
    return (
      <CsvUploadZone
        templateUrl={config.templateUrl}
        templateFilename={config.templateFilename}
        onFileSelected={(file) => previewMutation.mutate(file)}
        isUploading={previewMutation.isPending}
        helperText={config.uploadHelperText}
      />
    );
  }

  if (step === "preview" && previewData) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-medium">
              Review {previewData.summary.total} parsed rows
            </h3>
            <p className="text-sm text-muted-foreground">
              <span className="text-emerald-600">
                {previewData.summary.valid} valid
              </span>
              {previewData.summary.invalid > 0 && (
                <>
                  {" · "}
                  <span className="text-red-600">
                    {previewData.summary.invalid} need attention
                  </span>
                </>
              )}
              . Fix red cells inline, then confirm.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={resetFlow}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Upload a different file
            </Button>
            <Button
              disabled={validCount === 0 || commitMutation.isPending}
              onClick={() => commitMutation.mutate()}
            >
              {commitMutation.isPending
                ? "Importing…"
                : `Import ${validCount} valid rows`}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
        <ImportPreviewGrid
          rows={previewData.rows}
          columns={config.columns}
          onRowEdit={handleRowEdit}
          onRowDelete={handleRowDelete}
        />
      </div>
    );
  }

  if (step === "done" && commitResult) {
    return (
      <div className="space-y-4 rounded-md border border-border bg-card p-6">
        <h3 className="text-lg font-medium">Import complete</h3>
        <p className="text-sm">
          <strong className="text-emerald-700">
            {commitResult.created} {config.entityLabel}
          </strong>{" "}
          created successfully.
          {commitResult.failed.length > 0 && (
            <>
              {" "}
              <strong className="text-red-700">
                {commitResult.failed.length} row(s) failed.
              </strong>
            </>
          )}
        </p>
        {commitResult.failed.length > 0 && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3">
            <p className="mb-2 text-sm font-medium text-red-900">
              Failed rows:
            </p>
            <ul className="space-y-1 text-sm text-red-800">
              {commitResult.failed.map((f) => (
                <li key={f.rowIndex}>
                  <span className="font-mono">Row {f.rowIndex}:</span>{" "}
                  {f.error}
                </li>
              ))}
            </ul>
          </div>
        )}
        <Button variant="outline" onClick={resetFlow}>
          Import another file
        </Button>
      </div>
    );
  }

  return null;
}
