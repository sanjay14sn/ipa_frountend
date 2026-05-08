"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, X, FileText, ExternalLink } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  DetailField,
  DetailFieldsGrid,
  ExpandedDetailSection,
  ExpandedDetailSurface,
  RawTableSurface,
} from "@/components/shared";
import {
  AdminCertificateRequest,
  getAdminCertificatePdfUrl,
} from "@/services/student.service";

interface FranchiseCertificateDetailsProps {
  franchiseName: string;
  requests: AdminCertificateRequest[];
  statusFilter: string;
  onApprove: (id: number) => Promise<void>;
  onReject: (id: number) => Promise<void>;
}

export default function FranchiseCertificateDetails({
  franchiseName,
  requests,
  statusFilter,
  onApprove,
  onReject,
}: FranchiseCertificateDetailsProps) {
  const [selectedCertificate, setSelectedCertificate] =
    useState<AdminCertificateRequest | null>(null);

  const certificatePreviewUrl = selectedCertificate
    ? getAdminCertificatePdfUrl(selectedCertificate.id)
    : "";

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Issued":
        return "bg-green-100 text-green-800 border-green-200";
      case "Rejected":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const sectionTitle =
    statusFilter === "Pending"
      ? "Awaiting approval"
      : statusFilter === "Issued"
      ? "Issued certificates"
      : "Rejected requests";

  return (
    <>
      <ExpandedDetailSurface className="border-t border-border/60">
        <ExpandedDetailSection title="Certificate request summary">
          <DetailFieldsGrid columns={3}>
            <DetailField label="Franchise" value={franchiseName} />
            <DetailField label="Students" value={requests.length} />
            <DetailField label="Status" value={statusFilter} />
          </DetailFieldsGrid>
        </ExpandedDetailSection>

        <Separator />

        <ExpandedDetailSection title={sectionTitle}>
          <RawTableSurface className="shadow-none">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary hover:bg-secondary">
                  <TableHead>Student</TableHead>
                  <TableHead className="text-center">Level</TableHead>
                  <TableHead className="text-center">Instructor</TableHead>
                  <TableHead className="text-center">Marks</TableHead>
                  <TableHead className="text-center">Request Date</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => {
                  const denominator =
                    req.totalMarks || req.levelTotalMarks || 1;
                  const percentage =
                    denominator > 0
                      ? ((req.marksObtained / denominator) * 100).toFixed(1)
                      : "N/A";

                  return (
                    <TableRow key={req.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="font-medium text-gray-900">
                          {req.studentName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {req.studentRollNo}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-xs">
                          {req.studentLevel}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-sm text-gray-600">
                        {req.instructorName}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        <div className="font-medium">
                          {req.marksObtained}/{denominator}
                        </div>
                        <div className="text-xs text-gray-500">
                          {percentage}%
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-sm text-gray-600">
                        {new Date(req.requestDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-center">
                        {req.status === "Pending" ? (
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="sm"
                              onClick={() => onApprove(req.id)}
                              className="bg-green-600 hover:bg-green-700 h-8 w-8 p-0"
                              title="Issue Certificate"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => onReject(req.id)}
                              className="h-8 w-8 p-0"
                              title="Reject"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : req.status === "Issued" ? (
                          <Button
                            size="sm"
                            onClick={() => setSelectedCertificate(req)}
                            className="bg-blue-600 hover:bg-blue-700 h-8 w-8 p-0"
                            title="View Certificate"
                            aria-label="View Certificate"
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Badge
                            className={`${getStatusColor(req.status)} border`}
                          >
                            {req.status}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </RawTableSurface>
        </ExpandedDetailSection>
      </ExpandedDetailSurface>

      <Dialog
        open={Boolean(selectedCertificate)}
        onOpenChange={(open) => {
          if (!open) setSelectedCertificate(null);
        }}
      >
        <DialogContent className="max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="border-b border-gray-200 pb-4 flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
              <FileText className="h-5 w-5 text-primary" />
              View Certificate
            </DialogTitle>
            <DialogDescription>
              {selectedCertificate
                ? `${selectedCertificate.studentName} - ${selectedCertificate.studentLevel}`
                : "Certificate preview"}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-[65vh] flex-1 overflow-hidden rounded-lg border bg-muted">
            {certificatePreviewUrl ? (
              <iframe
                src={certificatePreviewUrl}
                title={
                  selectedCertificate
                    ? `${selectedCertificate.studentName} certificate`
                    : "Certificate preview"
                }
                className="h-full min-h-[65vh] w-full bg-white"
              />
            ) : (
              <div className="flex h-full min-h-[65vh] items-center justify-center p-6 text-sm text-muted-foreground">
                Certificate PDF is not available.
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-gray-200 pt-4 flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => setSelectedCertificate(null)}
            >
              Close
            </Button>
            <Button
              onClick={() => window.open(certificatePreviewUrl, "_blank")}
              disabled={!certificatePreviewUrl}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Open in New Tab
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
