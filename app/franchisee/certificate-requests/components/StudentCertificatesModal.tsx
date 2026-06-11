"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Award, Download, Loader2 } from "lucide-react";
import {
  getStudentCertificates,
  getAdminStudentCertificates,
  getFranchiseeCertificatePdfUrl,
  getAdminCertificatePdfUrl,
  StudentCertificate,
  getStudentStreamCertificates,
  getFranchiseeStreamCertificatePdfUrl,
  getAdminStreamCertificates,
  getAdminStreamCertificatePdfUrl,
  type StreamCertificate,
} from "@/services/student.service";
import { toast } from "sonner";
import { sendClientLog } from "@/lib/client-telemetry";
import { formatDate } from "@/lib/date-utils";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/api/query-keys";

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

  const { data: streamCertsRaw } = useQuery({
    queryKey: queryKeys.studentAdmin.studentStreamCertificates(studentId),
    queryFn: async (): Promise<StreamCertificate[]> =>
      mode === "admin"
        ? (await getAdminStreamCertificates({ studentId, limit: 50 })).rows
        : await getStudentStreamCertificates(studentId),
    enabled: open && studentId > 0,
  });
  const streamCerts = streamCertsRaw ?? [];

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

  const getStatusColor = (_status: string) =>
    "bg-primary/10 text-primary border-primary/20";

  const getTotalMarks = (certificate: StudentCertificate) =>
    certificate.totalMarks || certificate.levelTotalMarks || 0;

  const handleDownload = (certificate: StudentCertificate) => {
    const url = mode === "admin"
      ? getAdminCertificatePdfUrl(certificate.id)
      : getFranchiseeCertificatePdfUrl(certificate.id);
    window.open(url, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-2xl max-h-[85vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            View Certificates
          </DialogTitle>
          <DialogDescription>
            {isLoading
              ? "Loading certificate records"
              : certificates.length === 0
              ? `No certificates found for ${studentName || "this student"}`
              : `${studentName || certificates[0]?.studentName || "Student"} — ${
                  certificateId ? "1 certificate" : `${certificates.length} total`
                }`}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : certificates.length === 0 ? (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        ) : (
          <>
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
                        <Badge
                          className={`${getStatusColor(
                            certificate.status,
                          )} h-5 rounded-full border px-2 text-[10px] font-medium`}
                        >
                          {certificate.status}
                        </Badge>
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
                      onClick={() => handleDownload(certificate)}
                      title={hasPdf ? "Download PDF" : "PDF not yet available"}
                      aria-label={hasPdf ? "Download PDF" : "PDF not yet available"}
                      className="h-8 w-8 shrink-0 rounded-md"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>

            {streamCerts.length > 0 && (
              <div className="mt-4">
                <h4 className="mb-2 text-sm font-medium text-gray-900">
                  Stream Completion Certificates
                </h4>
                <div className="space-y-2">
                  {streamCerts.map((cert) => (
                    <div
                      key={cert.id}
                      className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                    >
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {cert.stream?.name ?? `Stream #${cert.streamId}`}
                        </div>
                        <div className="text-xs text-gray-500">
                          {cert.certificateStatus === "ISSUED"
                            ? `Issued ${cert.certificateIssuedAt ? new Date(cert.certificateIssuedAt).toLocaleDateString() : ""}`
                            : "Pending issuance"}
                        </div>
                      </div>
                      {cert.certificateStatus === "ISSUED" && (
                        <a
                          className="text-sm font-medium text-primary hover:underline"
                          href={
                            mode === "admin"
                              ? getAdminStreamCertificatePdfUrl(cert.id)
                              : getFranchiseeStreamCertificatePdfUrl(cert.id)
                          }
                          target="_blank"
                          rel="noreferrer"
                        >
                          View PDF
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
