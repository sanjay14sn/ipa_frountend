"use client";

import { ProgramRequestRow } from "@/services/franchise.service";

interface ProgramRequestDetailsProps {
  request: ProgramRequestRow;
}

export default function ProgramRequestDetails({
  request,
}: ProgramRequestDetailsProps) {
  const formatDate = (date: string) => new Date(date).toLocaleDateString();

  return (
    <div className="bg-gray-50 border-t border-black rounded-b-lg">
      <div className="relative">
        <div className="pl-12 pr-6 py-6">
          <div className="bg-white rounded-lg p-4 space-y-4 border border-primary">
            <h3 className="font-semibold text-lg text-gray-900">
              {request.franchise?.name ?? request.franchiseId} —{" "}
              {request.program?.name ?? `Program #${request.programId}`}
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Franchise</span>
                <p className="text-gray-900 mt-1">
                  {request.franchise?.name ?? request.franchiseId}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Program</span>
                <p className="text-gray-900 mt-1">
                  {request.program?.name ?? `#${request.programId}`}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Requested By</span>
                <p className="text-gray-900 mt-1">
                  {request.franchisee?.name ?? `#${request.requestedBy}`}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Email</span>
                <p className="text-gray-900 mt-1">
                  {request.franchisee?.mail ?? "—"}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Phone</span>
                <p className="text-gray-900 mt-1">
                  {request.franchisee?.phone ?? "—"}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Request Date</span>
                <p className="text-gray-900 mt-1">
                  {formatDate(request.createdAt)}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Status</span>
                <p className="text-gray-900 mt-1">{request.status}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
