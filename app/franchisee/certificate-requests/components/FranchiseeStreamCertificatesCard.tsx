"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import {
  getFranchiseeStreamCertificates,
  getFranchiseeStreamCertificatePdfUrl,
  type StreamCertificate,
} from "@/services/student.service";
import { queryKeys } from "@/hooks/api/query-keys";

/**
 * Stream completion certificates for the franchise, shown in the
 * Certificate History tab alongside the per-level certificate groups.
 * Renders nothing while loading or when the franchise has none.
 */
export default function FranchiseeStreamCertificatesCard() {
  const { data } = useQuery({
    queryKey: queryKeys.studentAdmin.franchiseeStreamCertificates,
    queryFn: getFranchiseeStreamCertificates,
  });
  const rows = data ?? [];
  if (rows.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h3 className="font-medium text-gray-900">
          Stream Completion Certificates
        </h3>
        <p className="text-sm text-gray-500">
          Awarded when a student completes the last level of a stream.
          Pending entries are issued by the admin team.
        </p>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-gray-500">
            <th className="px-4 py-2 font-medium">Student</th>
            <th className="px-4 py-2 font-medium">Stream</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 font-medium">Issued</th>
            <th className="px-4 py-2 text-right font-medium">Certificate</th>
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
              <td className="px-4 py-2 text-right">
                {cert.certificateStatus === "ISSUED" ? (
                  <a
                    className="text-sm font-medium text-primary hover:underline"
                    href={getFranchiseeStreamCertificatePdfUrl(cert.id)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View PDF
                  </a>
                ) : (
                  <span className="text-xs text-gray-400">
                    Awaiting issue
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
