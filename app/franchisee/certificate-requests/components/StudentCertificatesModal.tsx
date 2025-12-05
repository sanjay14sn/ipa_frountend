"use client";

import React, { useState, useEffect } from "react";
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
import {
  FileText,
  Calendar,
  Award,
  User,
  Download,
  Loader2,
} from "lucide-react";
import {
  getStudentCertificates,
  getCertificatePdfUrl,
  StudentCertificate,
} from "@/services/student.service";
import { useToast } from "@/hooks/use-toast";

interface StudentCertificatesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: number;
  studentName?: string;
  certificateId?: number; // Optional: if provided, only show this specific certificate
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
  const [selectedTab, setSelectedTab] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    if (open && studentId) {
      loadCertificates();
    }
  }, [open, studentId, certificateId]);

  const loadCertificates = async () => {
    setIsLoading(true);
    try {
      const response = await getStudentCertificates(studentId);
      const certs = response.result || [];

      // If certificateId is provided, filter to show only that specific certificate
      const filteredCerts = certificateId
        ? certs.filter((cert) => cert.id === certificateId)
        : certs;

      setCertificates(filteredCerts);
      if (filteredCerts.length > 0) {
        setSelectedTab(filteredCerts[0].id.toString());
      }
    } catch (error) {
      console.error("Error loading certificates:", error);
      toast({
        title: "Error",
        description: "Failed to load certificates",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Approved":
        return "bg-green-100 text-green-800 border-green-200";
      case "Rejected":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const handleDownload = (certificate: StudentCertificate) => {
    if (!certificate.certificatePdfPath) {
      toast({
        title: "Error",
        description: "Certificate PDF not available",
        variant: "destructive",
      });
      return;
    }
    const url = getCertificatePdfUrl(certificate.certificatePdfPath);
    window.open(url, "_blank");
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogTitle className="sr-only">Loading certificates</DialogTitle>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (certificates.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Certificates - {studentName || "Student"}
            </DialogTitle>
            <DialogDescription>
              No certificates found for this student
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            Certificates -{" "}
            {studentName || certificates[0]?.studentName || "Student"}
          </DialogTitle>
          <DialogDescription>
            {certificateId
              ? "View certificate details."
              : "View all certificates for this student. Use tabs to switch between certificates."}
          </DialogDescription>
        </DialogHeader>

        <div className="w-full space-y-4">
          {/* Custom Tab Navigation - Only show if multiple certificates */}
          {!certificateId && certificates.length > 1 && (
            <div className="border-b border-gray-200">
              <div className="flex gap-0 overflow-x-auto scrollbar-hide">
                {certificates.map((cert, index) => {
                  const isActive = selectedTab === cert.id.toString();
                  return (
                    <button
                      key={cert.id}
                      onClick={() => setSelectedTab(cert.id.toString())}
                      className={`
                        relative flex flex-col items-center justify-center gap-1.5
                        min-w-[120px] px-4 py-3
                        transition-all duration-200 ease-in-out
                        border-b-2 border-transparent
                        ${
                          isActive
                            ? "bg-gray-50 text-gray-900 border-b-green-600"
                            : "bg-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                        }
                      `}
                    >
                      <span
                        className={`text-sm font-semibold ${
                          isActive ? "text-gray-900" : "text-gray-600"
                        }`}
                      >
                        {cert.certificateLevel || `Level ${index + 1}`}
                      </span>
                      <Badge
                        className={`${getStatusColor(
                          cert.status
                        )} border text-xs px-2 py-0.5`}
                      >
                        {cert.status}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab Content */}
          {certificates.map((certificate) => {
            if (selectedTab !== certificate.id.toString()) return null;
            return (
              <div
                key={certificate.id}
                className="space-y-4 animate-in fade-in-50"
              >
                <div className="border rounded-lg p-6 space-y-4">
                  {/* Certificate Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-500">Level</div>
                      <div className="font-medium">
                        {certificate.certificateLevel}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Status</div>
                      <Badge
                        className={`${getStatusColor(
                          certificate.status
                        )} border`}
                      >
                        {certificate.status}
                      </Badge>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Marks</div>
                      <div className="font-medium">
                        {certificate.marksObtained}/{certificate.totalMarks} (
                        {(
                          (certificate.marksObtained / certificate.totalMarks) *
                          100
                        ).toFixed(1)}
                        %)
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Request Date</div>
                      <div className="font-medium flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(certificate.requestDate).toLocaleDateString()}
                      </div>
                    </div>
                    {certificate.issueDate && (
                      <div>
                        <div className="text-sm text-gray-500">Issue Date</div>
                        <div className="font-medium flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(certificate.issueDate).toLocaleDateString()}
                        </div>
                      </div>
                    )}
                    <div>
                      <div className="text-sm text-gray-500">Instructor</div>
                      <div className="font-medium">
                        {certificate.instructorName} (
                        {certificate.instructorInstructorId})
                      </div>
                    </div>
                  </div>

                  {/* Certificate PDF Viewer */}
                  {certificate.status === "Approved" &&
                    certificate.certificatePdfPath && (
                      <div className="border-t pt-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Certificate PDF
                          </h4>
                          <Button
                            size="sm"
                            onClick={() => handleDownload(certificate)}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        </div>
                        <div className="border rounded-lg overflow-hidden">
                          <iframe
                            src={getCertificatePdfUrl(
                              certificate.certificatePdfPath
                            )}
                            className="w-full h-96"
                            title={`Certificate ${certificate.id}`}
                          />
                        </div>
                      </div>
                    )}

                  {certificate.status === "Pending" && (
                    <div className="border-t pt-4">
                      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <div className="text-sm text-yellow-800">
                          This certificate request is pending approval. You will
                          be notified once it is approved.
                        </div>
                      </div>
                    </div>
                  )}

                  {certificate.status === "Rejected" && (
                    <div className="border-t pt-4">
                      <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                        <div className="text-sm text-red-800">
                          This certificate request has been rejected.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
