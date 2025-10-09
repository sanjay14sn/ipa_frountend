"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Calendar, Check, X } from "lucide-react";
import { AdminCertificateRequest } from "@/services/student.service";

interface AdminCertificateDetailsProps {
  requests: AdminCertificateRequest[];
  lastRow: boolean;
  expandedRows: Set<string>;
  onToggleRow: (id: string) => void;
  onApprove: (requestId: number) => void;
  onReject: (requestId: number) => void;
}

export default function AdminCertificateDetails({
  requests,
  lastRow,
  expandedRows,
  onToggleRow,
  onApprove,
  onReject,
}: AdminCertificateDetailsProps) {
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

  const getLevelColor = (level: string) => {
    if (level.startsWith("EL"))
      return "bg-gray-100 text-gray-800 border-gray-200";
    if (level.startsWith("RL"))
      return "bg-gray-100 text-gray-800 border-gray-200";
    if (level.startsWith("GML"))
      return "bg-gray-100 text-gray-800 border-gray-200";
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  // Helper function to calculate age
  const calculateAge = (dateOfBirth: string): number => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  };

  return (
    <div
      className={`bg-gray-50 border-t border-gray-200 ${
        lastRow ? "rounded-b-lg" : ""
      }`}
    >
      <div className="p-6">
        <div className="space-y-4">
          {requests.map((request, index) => {
            const studentId = `${request.franchiseName}-${request.studentId}`;
            const isExpanded = expandedRows.has(studentId);
            const percentage =
              (request.marksObtained / request.totalMarks) * 100;

            return (
              <div
                key={request.id}
                className="border border-gray-200 rounded-lg"
              >
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => onToggleRow(studentId)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                      <div className="flex flex-col">
                        <div className="font-medium text-gray-900">
                          {request.studentName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {request.studentRollNo} • Age{" "}
                          {calculateAge(request.studentDateOfBirth)} •{" "}
                          {request.studentSex}
                        </div>
                        <div className="text-xs text-primary font-medium">
                          {request.studentStandard} • {request.studentStream}
                        </div>
                        <Badge
                          className={`${getLevelColor(
                            request.studentLevel
                          )} border text-xs mt-1 w-fit`}
                        >
                          {request.studentLevel}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {request.marksObtained}/{request.totalMarks}
                        </div>
                        <div className="text-xs text-gray-500">
                          {percentage.toFixed(1)}%
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {request.instructorName}
                        </div>
                        <div className="text-xs text-gray-500">
                          ID: {request.instructorId}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span className="text-xs">
                            {new Date(request.requestDate).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(request.requestDate).toLocaleTimeString()}
                        </div>
                      </div>
                      <Badge
                        className={`${getStatusColor(request.status)} border`}
                      >
                        {request.status}
                      </Badge>
                      {request.status === "Pending" && (
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            onClick={() => onApprove(request.id)}
                            className="bg-green-600 hover:bg-green-700 h-8 w-8 p-0"
                            title="Approve"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => onReject(request.id)}
                            className="h-8 w-8 p-0"
                            title="Reject"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <h4 className="font-medium text-gray-900">
                            Student Information
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Name:</span>
                              <span className="font-medium">
                                {request.studentName}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Roll No:</span>
                              <span className="font-medium">
                                {request.studentRollNo}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">
                                Date of Birth:
                              </span>
                              <span className="font-medium">
                                {new Date(
                                  request.studentDateOfBirth
                                ).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Sex:</span>
                              <span className="font-medium">
                                {request.studentSex}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Standard:</span>
                              <span className="font-medium">
                                {request.studentStandard}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Stream:</span>
                              <span className="font-medium">
                                {request.studentStream}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Level:</span>
                              <Badge
                                className={`${getLevelColor(
                                  request.studentLevel
                                )} border`}
                              >
                                {request.studentLevel}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h4 className="font-medium text-gray-900">
                            Certificate Request Details
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">
                                Marks Obtained:
                              </span>
                              <span className="font-medium">
                                {request.marksObtained}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">
                                Total Marks:
                              </span>
                              <span className="font-medium">
                                {request.totalMarks}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Percentage:</span>
                              <span className="font-medium">
                                {percentage.toFixed(1)}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">
                                Request Date:
                              </span>
                              <span className="font-medium">
                                {new Date(
                                  request.requestDate
                                ).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">
                                Request Time:
                              </span>
                              <span className="font-medium">
                                {new Date(
                                  request.requestDate
                                ).toLocaleTimeString()}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Status:</span>
                              <Badge
                                className={`${getStatusColor(
                                  request.status
                                )} border`}
                              >
                                {request.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-gray-200">
                        <h4 className="font-medium text-gray-900 mb-3">
                          Course Instructor
                        </h4>
                        <div className="text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">
                              Instructor Name:
                            </span>
                            <span className="font-medium">
                              {request.instructorName}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">
                              Instructor ID:
                            </span>
                            <span className="font-medium">
                              {request.instructorId}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
