"use client";

import { useMemo } from "react";
import {
  LastUpdated,
  ModulePill,
  PageHeaderCard,
  QuickAccessCard,
  StatCell,
} from "@/components/shared";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CalendarDays,
  ClipboardList,
  FileText,
  GraduationCap,
  Layers,
  Trophy,
} from "lucide-react";
import { getCIAgreement, getCIProgress, getCIUpcomingSessions, listCIReceivables } from "@/services/ci-training.service";
import { useCIAuth } from "@/context/ci-auth-context";
import { CIDashboardPanel } from "../_components/ci-dashboard-cards";
import { formatDate } from "@/lib/date-utils";

function phaseLabel(phase?: string | null): string {
  if (!phase) return "No agreement";
  if (phase === "PENDING_CI_SIGNATURE") return "Awaiting your signature";
  if (phase === "PENDING_FRANCHISEE_SIGNATURE") return "Awaiting franchisee signature";
  if (phase === "SIGNED") return "Signed";
  if (phase === "EXPIRED") return "Expired";
  return phase;
}

export default function CIDashboardPage() {
  const { user } = useCIAuth();
  const agreementQuery = useQuery({
    queryKey: ["ci-agreement"],
    queryFn: getCIAgreement,
  });
  const progressQuery = useQuery({
    queryKey: ["ci-progress"],
    queryFn: getCIProgress,
  });
  const upcomingQuery = useQuery({
    queryKey: ["ci-upcoming"],
    queryFn: getCIUpcomingSessions,
  });
  const receivablesQuery = useQuery({
    queryKey: ["ci-receivables"],
    queryFn: listCIReceivables,
  });

  const progress = progressQuery.data ?? [];
  const upcoming = upcomingQuery.data ?? [];
  const receivables = receivablesQuery.data ?? [];
  const agreement = agreementQuery.data ?? null;

  const completedLevels = useMemo(
    () => progress.filter((item) => item.status === "COMPLETED"),
    [progress],
  );

  const currentTrainedLevel = useMemo(() => {
    if (completedLevels.length === 0) return null;
    return [...completedLevels].sort(
      (a, b) => (b.trainingLevelId ?? 0) - (a.trainingLevelId ?? 0),
    )[0];
  }, [completedLevels]);

  const nextTraining = useMemo(() => {
    if (upcoming.length === 0) return null;
    const assigned = upcoming.filter((item) => item.assignmentStatus === "ASSIGNED");
    const waiting = upcoming.filter((item) => item.assignmentStatus !== "ASSIGNED");
    const candidate = (assigned.length > 0 ? assigned : waiting).slice().sort((a, b) => {
      const d1 = new Date(a.sessionDate).getTime();
      const d2 = new Date(b.sessionDate).getTime();
      return d1 - d2;
    });
    return candidate[0] ?? null;
  }, [upcoming]);

  const settledReceivableCount = receivables.filter((r) => r.status === "paid" || r.status === "waived").length;
  const pendingReceivableCount = receivables.filter((r) => r.status === "pending").length;
  const loading =
    agreementQuery.isLoading ||
    progressQuery.isLoading ||
    upcomingQuery.isLoading ||
    receivablesQuery.isLoading;

  // CI-06 (R5): freshness + manual refetch across the four dashboard queries.
  const updatedAt = Math.max(
    agreementQuery.dataUpdatedAt,
    progressQuery.dataUpdatedAt,
    upcomingQuery.dataUpdatedAt,
    receivablesQuery.dataUpdatedAt,
  );
  const handleRefresh = () => {
    void agreementQuery.refetch();
    void progressQuery.refetch();
    void upcomingQuery.refetch();
    void receivablesQuery.refetch();
  };

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <PageHeaderCard
          embedded
          className="border-b py-5"
          eyebrow={<ModulePill label="Course Instructor" />}
          title="Course Instructor Dashboard"
          description={`Welcome back${user?.name ? `, ${user.name}` : ""}. Track your current level, next training and receivable status.`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <LastUpdated
                updatedAt={updatedAt || undefined}
                onRefresh={handleRefresh}
                isRefreshing={agreementQuery.isFetching}
              />
              <Badge variant={agreement?.phase === "SIGNED" ? "default" : "secondary"}>
                {phaseLabel(agreement?.phase)}
              </Badge>
              {user?.instructorCode ? <Badge variant="outline">{user.instructorCode}</Badge> : null}
            </div>
          }
        />

        {loading ? (
          <div className="grid divide-y border-b md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-3 px-4 py-4 sm:px-5">
                <div className="h-8 w-24 animate-pulse rounded bg-muted" />
                <div className="h-8 w-16 animate-pulse rounded bg-muted" />
                <div className="h-3 w-28 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid divide-y border-b md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-5">
            {/* CI-06: kit StatCell; navigation rides the chip + quick links
                (R4), not whole-cell anchors. */}
            <StatCell
              label="Current Trained Level"
              value={currentTrainedLevel?.trainingLevelName ?? "—"}
              sub={currentTrainedLevel ? `Completed ${formatDate(currentTrainedLevel.completedAt)}` : "No completed level yet"}
              icon={Trophy}
            />
            <StatCell
              label="Next Training"
              value={nextTraining?.trainingLevelName ?? "—"}
              sub={nextTraining ? `${formatDate(nextTraining.sessionDate)} | ${nextTraining.assignmentStatus}` : "No upcoming session"}
              icon={CalendarDays}
            />
            <StatCell
              label="Completed Levels"
              value={String(completedLevels.length)}
              sub={`${progress.length} total levels`}
              icon={GraduationCap}
            />
            <StatCell
              label="Receivables Settled"
              value={String(settledReceivableCount)}
              sub={`${receivables.length} total receivables`}
              icon={Layers}
              pendingChip={{
                count: pendingReceivableCount,
                href: "/ci/training?tab=receivables",
              }}
            />
            <StatCell
              label="Pending Receivables"
              value={String(pendingReceivableCount)}
              sub="Due for payment"
              icon={ClipboardList}
            />
          </div>
        )}

        {/* CI-06: kit QuickAccessCard; links target the hub tabs directly —
            no redirect hop. */}
        <CIDashboardPanel label="Tools" title="Quick access">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <QuickAccessCard
              title="My Agreement"
              description="Agreement details and status"
              href="/ci/agreement"
              icon={FileText}
            />
            <QuickAccessCard
              title="Training Receivables"
              description="View and pay training fees"
              href="/ci/training?tab=receivables"
              icon={Layers}
            />
            <QuickAccessCard
              title="Progress"
              description="Track completed levels and marks"
              href="/ci/training?tab=progress"
              icon={GraduationCap}
            />
            <QuickAccessCard
              title="Upcoming"
              description="View next assigned sessions"
              href="/ci/training?tab=upcoming"
              icon={CalendarDays}
            />
          </div>
        </CIDashboardPanel>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl border-border bg-card shadow-sm">
          <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
            <CardTitle className="text-xl font-normal text-card-foreground">
              Recent training progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-2 sm:p-5 sm:pt-2">
            {progress.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                No training progress yet.
              </div>
            ) : (
              progress.slice(0, 3).map((item) => (
                <div key={`${item.trainingLevelId}-${item.status}`} className="rounded-xl border bg-background p-3 shadow-sm">
                  <p className="text-sm font-medium text-card-foreground">{item.trainingLevelName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Status: {item.status} | Session: {formatDate(item.sessionDate)}
                  </p>
                  {item.status === "COMPLETED" ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Theory: {item.theoryMarks ?? "-"} | Practical: {item.practicalMarks ?? "-"}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card shadow-sm">
          <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
            <CardTitle className="text-xl font-normal text-card-foreground">
              Next training session
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-2 sm:p-5 sm:pt-2">
            {nextTraining ? (
              <div className="rounded-xl border bg-background p-3 shadow-sm">
                <p className="text-sm font-medium text-card-foreground">
                  {nextTraining.trainingLevelName ?? `Level ${nextTraining.trainingLevelId}`}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Date: {formatDate(nextTraining.sessionDate)}</p>
                <p className="mt-1 text-xs text-muted-foreground">State: {nextTraining.region}</p>
                <p className="mt-1 text-xs text-muted-foreground">Venue: {nextTraining.venue ?? "-"}</p>
                <p className="mt-1 text-xs text-muted-foreground">Status: {nextTraining.assignmentStatus}</p>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                No upcoming session assigned.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
