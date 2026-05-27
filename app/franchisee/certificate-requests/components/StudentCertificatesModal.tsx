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
  getFranchiseeCertificatePdfUrl,
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
}

export default function StudentCertificatesModal({
  open,
  onOpenChange,
  studentId,
  studentName,
  certificateId,
}: StudentCertificatesModalProps) {
  const [certificates, setCertificates] = useState<StudentCertificate[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open || !studentId) return;

    let cancelled = false;
    setIsLoading(true);

    getStudentCertificates(studentId)
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
  }, [open, studentId, certificateId]);

  const getStatusColor = (_status: string) =>
    "bg-primary/10 text-primary border-primary/20";

  const getTotalMarks = (certificate: StudentCertificate) =>
    certificate.totalMarks || certificate.levelTotalMarks || 0;

  const handleDownload = (certificate: StudentCertificate) => {
    const url = getFranchiseeCertificatePdfUrl(certificate.id);
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
