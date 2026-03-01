"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, ChevronDown, ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  getPendingFranchise,
  type FranchiseData,
} from "@/services/franchisee.service";

export function RecentApplications() {
  const router = useRouter();
  const [applications, setApplications] = useState<FranchiseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getPendingFranchise();
        const data = response.result || [];
        setApplications(data);
      } catch (e) {
        setError("Failed to load recent applications");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const recentPending = useMemo(() => {
    //  const pendingOnly = applications.filter(
    //    (app) => app.status?.toLowerCase() === "pending"
    //  );
    const sorted = applications.sort((a, b) => {
      const ad = new Date(a.createdAt).getTime();
      const bd = new Date(b.createdAt).getTime();
      return bd - ad;
    });
    return sorted.slice(0, 5);
  }, [applications]);

  const formatDate = (date: string) => {
    try {
      return new Date(date).toLocaleDateString();
    } catch {
      return date;
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-md p-6 border border-primary max-h-[300px] overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Recent Applications
        </h2>
        <button
          onClick={() => router.push("/admin/pending-approvals")}
          className="text-gray-600 hover:text-gray-900 hover:bg-secondary rounded-md px-4 py-2"
        >
          See all Applications
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 bg-gray-100 rounded-md animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <div className="text-sm text-red-600">{error}</div>
      ) : recentPending.length === 0 ? (
        <div className="text-sm text-gray-600">No pending applications.</div>
      ) : (
        <div className="space-y-3">
          {recentPending.map((app) => (
            <Card
              key={app.id}
              className="p-4 bg-white border border-gray-200 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-gray-900 truncate border-r pr-2">
                      {app.name}
                    </h3>
                    <Badge
                      variant="secondary"
                      className="bg-orange-100 text-orange-800 "
                    >
                      {app.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
                    <span className="truncate">
                      Programs:{" "}
                      {app.franchisePrograms
                        ?.map((fp) => fp.program.name)
                        .join(", ") || "N/A"}
                    </span>
                    <span className="truncate">Type: {app.type}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formatDate(app.createdAt)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpand(app.id.toString())}
                    className="p-1 h-8 w-8 text-gray-500 hover:text-gray-700"
                    aria-label={
                      expandedId === app.id.toString() ? "Collapse" : "Expand"
                    }
                  >
                    {expandedId === app.id.toString() ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
              {expandedId === app.id.toString() && (
                <div className="mt-3 border-t pt-3 text-sm text-gray-700">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <div className="text-xs text-gray-500">
                        Franchisee Name
                      </div>
                      <div className="font-medium">
                        {app.franchisee?.name || "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Reference</div>
                      <div className="font-medium">
                        {app.franchisee?.reference || "-"}
                      </div>
                    </div>
                    <div className="md:col-span-1">
                      <div className="text-xs text-gray-500">Address</div>
                      <div className="font-medium truncate">
                        {(app as any).address || (app as any).franchise?.address
                          ? `${(app as any).address || (app as any).franchise?.address}${
                              ((app as any).city ??
                              (app as any).franchise?.city)
                                ? ", " +
                                  ((app as any).city ??
                                    (app as any).franchise?.city)
                                : ""
                            }`
                          : "-"}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
