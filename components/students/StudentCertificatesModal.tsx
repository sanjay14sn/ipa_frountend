"use client";

import React, { useEffect, useState } from "react";
import { DetailDialog } from "@/components/shared/dialog";
import { FilePreviewDialog, StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Award, Eye, Loader2 } from "lucide-react";
import {
  getStudentCertificates,
  getAdminStudentCertificates,
  getFranchiseeCertificatePdfUrl,
  getAdminCertificatePdfUrl,
  StudentCertificate,
} from "@/services/student.service";
import { toast } from "sonner";
import { sendClientLog } from "@/lib/client-telemetry";
import { formatDate } from "@/lib/date-utils";

interface StudentCertificatesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: number;
  studentName?: string;
  certificateId?: number;
  mode?: "franchise" | "admin";
}

export default function StudentCertificatesModal({
  open,
  onOpenChange,
  studentId,
  studentName,
  certificateId,
  mode = "franchise",
}: StudentCertificatesModalProps) {
  const [certificates, setCertificates] = useState<StudentCertificate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!open) setPreviewIndex(null);
  }, [open]);

  useEffect(() => {
    if (!open || !studentId) return;

    let cancelled = false;
    setIsLoading(true);

    const fetchCerts = mode === "admin"
      ? getAdminStudentCertificates(studentId)
      : getStudentCertificates(studentId);

    fetchCerts
      .then((response) => {
        if (cancelled) return;
        const certs = response.result || [];
        const filtered = certificateId
          ? certs.filter((cert) => cert.id === certificateId)
          : certs;
        setCertificates(filtered);
      })
      .catch((error) => {
        if (cancelled) return;
        sendClientLog({ level: "error", event: "certificates-load-error", message: "Error loading student certificates", context: { error } });
        toast.error("Failed to load certificates");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, studentId, certificateId, mode]);

  const getTotalMarks = (certificate: StudentCertificate) =>
    certificate.totalMarks || certificate.levelTotalMarks || 0;

  const issuedCertificates = certificates.filter(
    (certificate) => certificate.status === "Issued",
  );
  const previewFiles = issuedCertificates.map((certificate) => ({
    url:
      mode === "admin"
        ? getAdminCertificatePdfUrl(certificate.id)
        : getFranchiseeCertificatePdfUrl(certificate.id),
    filename: `${studentName || certificate.studentName || "certificate"}-${certificate.certificateLevel}.pdf`,
  }));

  const handleView = (certificate: StudentCertificate) => {
    const index = issuedCertificates.findIndex(
      (issued) => issued.id === certificate.id,
    );
    if (index >= 0) setPreviewIndex(index);
  };

  return (
    <>
    <DetailDialog
      open={open}
      onOpenChange={onOpenChange}
      size="2xl"
      headerIcon={Award}
      title="View Certificates"
      description={
        isLoading
          ? "Loading certificate records"
          : certificates.length === 0
            ? `No certificates found for ${studentName || "this student"}`
            : `${studentName || certificates[0]?.studentName || "Student"} — ${
                certificateId ? "1 certificate" : `${certificates.length} total`
              }`
      }
      footer={{
        secondary: { label: "Close", onClick: () => onOpenChange(false) },
      }}
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : certificates.length === 0 ? null : (
        <div className="space-y-2">
          {certificates.map((certificate) => {
            const hasPdf = certificate.status === "Issued";
            const totalMarks = getTotalMarks(certificate);
            const requestedDate = formatDate(certificate.requestDate);
            const issueDate = formatDate(certificate.issueDate);

            return (
              <div
                key={certificate.id}
                className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-sm font-semibold text-card-foreground">
                      {certificate.certificateLevel}
                    </h3>
                    <StatusBadge
                      label={certificate.status}
                      className="h-5 px-2 text-[10px]"
                    />
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="font-medium text-card-foreground">
                      {certificate.marksObtained}/{totalMarks}
                    </span>
                    <span>{certificate.instructorName}</span>
                    <span>
                      {issueDate || (requestedDate && `Requested ${requestedDate}`)}
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={!hasPdf}
                  onClick={() => handleView(certificate)}
                  title={hasPdf ? "View certificate" : "PDF not yet available"}
                  aria-label={hasPdf ? "View certificate" : "PDF not yet available"}
                  className="h-8 w-8 shrink-0 rounded-md"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </DetailDialog>
    <FilePreviewDialog
      files={previewFiles}
      index={previewIndex}
      onIndexChange={setPreviewIndex}
      onClose={() => setPreviewIndex(null)}
    />
    </>
  );
}
