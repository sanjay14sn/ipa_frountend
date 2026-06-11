"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getAdminStreamCertificates,
  approveStreamCertificate,
  getAdminStreamCertificatePdfUrl,
  type StreamCertificate,
} from "@/services/student.service";
import { queryKeys } from "@/hooks/api/query-keys";

interface AdminStreamCertificatesTableProps {
  scopedFranchiseId?: string;
}

export default function AdminStreamCertificatesTable({
  scopedFranchiseId,
}: AdminStreamCertificatesTableProps) {
  const [page, setPage] = useState(1);
  const params: Record<string, unknown> = {
    page,
    limit: 10,
    ...(scopedFranchiseId ? { franchiseId: scopedFranchiseId } : {}),
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: queryKeys.studentAdmin.streamCertificates(params),
    queryFn: () => getAdminStreamCertificates(params),
  });

  const handleApprove = async (id: number) => {
    try {
      await approveStreamCertificate(id);
      toast.success("Stream certificate issued");
      refetch();
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Failed to issue stream certificate";
      toast.error(message);
    }
  };

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 10));

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h3 className="font-medium text-gray-900">
          Stream Completion Certificates
        </h3>
        <p className="text-sm text-gray-500">
          Issued automatically when a student completes the last level of a
          stream. Pending entries are waiting for a stream template.
        </p>
      </div>
      {isLoading ? (
        <div className="px-4 py-8 text-center text-sm text-gray-500">
          Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-gray-500">
          No stream certificates yet.
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-gray-500">
              <th className="px-4 py-2 font-medium">Student</th>
              <th className="px-4 py-2 font-medium">Stream</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Issued</th>
              <th className="px-4 py-2 font-medium">Dispatch</th>
              <th className="px-4 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((cert: StreamCertificate) => (
              <tr
                key={cert.id}
                className="border-b border-border last:border-0 hover:bg-accent/30"
              >
                <td className="px-4 py-2">
                  <div className="font-medium text-gray-900">
                    {cert.student?.name ?? `Student #${cert.studentId}`}
                  </div>
                  <div className="text-xs text-gray-500">
                    {cert.student?.rollNo}
                  </div>
                </td>
                <td className="px-4 py-2">
                  <Badge variant="outline">
                    {cert.stream?.name ?? `Stream #${cert.streamId}`}
                  </Badge>
                </td>
                <td className="px-4 py-2">
                  <Badge
                    variant={
                      cert.certificateStatus === "ISSUED"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {cert.certificateStatus === "ISSUED" ? "Issued" : "Pending"}
                  </Badge>
                </td>
                <td className="px-4 py-2 text-gray-600">
                  {cert.certificateIssuedAt
                    ? new Date(cert.certificateIssuedAt).toLocaleDateString()
                    : "—"}
                </td>
                <td className="px-4 py-2 text-gray-600">
                  {cert.certificateDispatchStatus === "DISPATCHED"
                    ? "Dispatched"
                    : "Not dispatched"}
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center justify-end gap-1">
                    {cert.certificateStatus === "PENDING" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Issue certificate"
                        onClick={() => handleApprove(cert.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    {cert.certificateStatus === "ISSUED" && (
                      <Button size="sm" variant="ghost" asChild title="View PDF">
                        <a
                          href={getAdminStreamCertificatePdfUrl(cert.id)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <FileText className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 px-4 py-2 text-sm">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-gray-500">
            {page} / {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
