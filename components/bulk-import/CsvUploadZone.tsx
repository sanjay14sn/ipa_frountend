"use client";

import { useRef, useState } from "react";
import { Download, Upload, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { downloadBulkImportTemplate } from "@/services/bulk-import.service";

interface CsvUploadZoneProps {
  templateUrl: string;
  templateFilename: string;
  onFileSelected: (file: File) => void;
  isUploading: boolean;
  /** Optional helper text rendered below the headline. */
  helperText?: string;
}

export function CsvUploadZone({
  templateUrl,
  templateFilename,
  onFileSelected,
  isUploading,
  helperText,
}: CsvUploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  const handleFile = (file: File) => {
    setSelectedFile(file);
  };

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      await downloadBulkImportTemplate(templateUrl, templateFilename);
    } catch {
      toast.error("Could not download the template.");
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleSubmit = () => {
    if (selectedFile) onFileSelected(selectedFile);
  };

  return (
    <div className="rounded-lg border border-dashed border-border bg-card p-8">
      <div className="flex flex-col items-center gap-4 text-center">
        <Upload className="h-10 w-10 text-muted-foreground" />
        <div>
          <h3 className="text-lg font-medium">Upload a CSV file</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {helperText ??
              "We'll parse it, resolve names to IDs, and let you fix any issues before importing."}
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />

        {selectedFile ? (
          <div className="flex w-full max-w-md flex-col items-center gap-3 rounded-md border border-border bg-background p-4">
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{selectedFile.name}</span>
              <span className="text-muted-foreground">
                ({(selectedFile.size / 1024).toFixed(1)} KB)
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                disabled={isUploading}
              >
                Choose a different file
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={isUploading}
              >
                {isUploading ? "Parsing…" : "Parse and preview"}
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={() => fileInputRef.current?.click()}>
            Choose a CSV file
          </Button>
        )}

        <div className="mt-2 text-sm text-muted-foreground">
          Don&apos;t have one yet?{" "}
          <button
            type="button"
            onClick={handleDownloadTemplate}
            disabled={downloadingTemplate}
            className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            {downloadingTemplate ? "Downloading…" : "Download the template"}
          </button>
        </div>
      </div>
    </div>
  );
}
