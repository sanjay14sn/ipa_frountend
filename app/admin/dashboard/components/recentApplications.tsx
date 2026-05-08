"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, ChevronDown, ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FranchiseData } from "@/services/franchisee.service";
import { usePendingFranchiseApplications } from "@/hooks/api/franchisee.hooks";

export function RecentApplications() {
  const router = useRouter();
  const { data: applications = [], isLoading: loading, error } =
    usePendingFranchiseApplications();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const recentPending = useMemo(() => {
    const sorted = [...applications].sort((a, b) => {
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
    <div className="w-full bg-white rounded-lg p-4 border border-gray-400 max-h-[320px] overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-gray-700">
          Recent Applications
        </h2>
        <button
          type="button"
          onClick={() => router.push("/admin/franchise?tab=applications")}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          See all
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 bg-gray-100 rounded animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-red-600">Failed to load recent applications</p>
      ) : recentPending.length === 0 ? (
        <p className="text-sm text-gray-500">No pending applications</p>
      ) : (
        <div className="space-y-2">
          {recentPending.map((app: FranchiseData) => (
            <Card key={app.id} className="p-3 border border-gray-200">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {app.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {app.city}, {app.state} · {formatDate(app.createdAt)}
                  </p>
                  <Badge variant="outline" className="mt-1 text-xs">
                    {app.status}
                  </Badge>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0 h-8 w-8 p-0"
                  onClick={() => toggleExpand(app.id)}
                  aria-expanded={expandedId === app.id}
                >
                  {expandedId === app.id ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {expandedId === app.id && (
                <div className="mt-3 pt-3 border-t text-xs text-gray-600 space-y-1">
                  <p>
                    <span className="font-medium">Type:</span> {app.type}
                  </p>
                  {app.franchisee?.name && (
                    <p>
                      <span className="font-medium">Franchisee:</span>{" "}
                      {app.franchisee.name}
                    </p>
                  )}
                  {app.franchisee?.mail && (
                    <p>
                      <span className="font-medium">Email:</span>{" "}
                      {app.franchisee.mail}
                    </p>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
        <Clock className="h-3 w-3" />
        <span>Showing up to 5 most recent</span>
      </div>
    </div>
  );
}
