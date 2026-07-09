"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/date-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Award, ChevronDown, ChevronUp } from "lucide-react";
import { StatusBadge } from "@/components/shared";
import { FranchiseeCertificate } from "@/services/student.service";
import StudentCertificatesModal from "@/components/students/StudentCertificatesModal";

interface FranchiseeCertificatesGroupCardProps {
  stream: string;
  levelName: string;
  certificates: FranchiseeCertificate[];
}

export default function FranchiseeCertificatesGroupCard({
  stream,
  levelName,
  certificates,
}: FranchiseeCertificatesGroupCardProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [selectedCertificateId, setSelectedCertificateId] = useState<number | undefined>(undefined);
  const [isCertificatesModalOpen, setIsCertificatesModalOpen] = useState(false);

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="p-4">
          <div className="flex items-center justify-between gap-3">
            {/* Left: group label + count badge */}
            <div className="flex items-center gap-3 min-w-0">
              <span className="font-semibold text-sm text-foreground truncate">
                {stream} &middot; {levelName}
              </span>
              <Badge variant="secondary" className="shrink-0 text-xs">
                {certificates.length}{" "}
                {certificates.length === 1 ? "certificate" : "certificates"}
              </Badge>
            </div>
            {/* Right: chevron toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => setIsOpen((prev) => !prev)}
              aria-label={isOpen ? "Collapse group" : "Expand group"}
            >
              {isOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>

        {isOpen && (
          <CardContent className="p-0">
            <div className="border-t divide-y">
              {certificates.map((certificate) => {
                const denom =
                  certificate.totalMarks || certificate.levelTotalMarks || 1;
                const pct = `${((certificate.marksObtained / denom) * 100).toFixed(1)}%`;

                return (
                  <div
                    key={certificate.id}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-accent/40 transition-colors"
                  >
                    {/* Left: name + roll + template + percentage */}
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-sm font-medium text-foreground truncate">
                        {certificate.studentName}
                        <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                          &middot; {certificate.studentRollNo}
                        </span>
                      </span>
                      {certificate.templateName ? (
                        <Badge variant="outline" className="shrink-0 text-[10px]">
                          {certificate.templateName}
                        </Badge>
                      ) : null}
                      <span className="text-xs text-muted-foreground shrink-0">
                        {pct}
                      </span>
                    </div>

                    {/* Right: status badge + dispatch badge + action */}
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge label={certificate.status} />
                      {certificate.dispatchStatus === "Dispatched" ? (
                        <StatusBadge
                          tone="success"
                          label={`Dispatched${certificate.dispatchedAt ? ` ${formatDate(certificate.dispatchedAt)}` : ""}`}
                        />
                      ) : (
                        <StatusBadge tone="neutral" label="Not dispatched" />
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        title="View certificate"
                        aria-label={`View certificate for ${certificate.studentName}`}
                        onClick={() => {
                          setSelectedStudentId(certificate.studentId);
                          setSelectedCertificateId(certificate.id);
                          setIsCertificatesModalOpen(true);
                        }}
                      >
                        <Award className="h-4 w-4 text-primary" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        )}
      </Card>

      {selectedStudentId && (
        <StudentCertificatesModal
          open={isCertificatesModalOpen}
          onOpenChange={(open) => {
            setIsCertificatesModalOpen(open);
            if (!open) {
              setSelectedStudentId(null);
              setSelectedCertificateId(undefined);
            }
          }}
          studentId={selectedStudentId}
          certificateId={selectedCertificateId}
        />
      )}
    </>
  );
}
