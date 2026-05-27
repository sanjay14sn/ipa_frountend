"use client";

import { useMemo } from "react";
import Link from "next/link";
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
import { getCIAgreement, getCIProgress, getCIUpcomingSessions, listCIPackages } from "@/services/ci-training.service";
import { useCIAuth } from "@/context/ci-auth-context";
import { CIDashboardPanel, CIStatCard, ModulePill } from "../components/ci-dashboard-cards";
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
  const packagesQuery = useQuery({
    queryKey: ["ci-packages"],
    queryFn: listCIPackages,
  });

  const progress = progressQuery.data ?? [];
  const upcoming = upcomingQuery.data ?? [];
  const packages = packagesQuery.data ?? [];
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

  const purchasedPackageCount = packages.filter((item) => item.isPurchased).length;
  const pendingPackageCount = packages.filter((item) => !item.isPurchased).length;
  const loading =
    agreementQuery.isLoading ||
    progressQuery.isLoading ||
    upcomingQuery.isLoading ||
    packagesQuery.isLoading;

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b px-4 py-5 sm:px-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-2">
              <ModulePill label="Course Instructor" />
            </div>
            <h1 className="text-2xl text-card-foreground">Course Instructor Dashboard</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Welcome back{user?.name ? `, ${user.name}` : ""}. Track your current level, next training and package status.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={agreement?.phase === "SIGNED" ? "default" : "secondary"}>
              {phaseLabel(agreement?.phase)}
            </Badge>
            {user?.instructorCode ? <Badge variant="outline">{user.instructorCode}</Badge> : null}
          </div>
        </div>

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
            <CIStatCard
              label="Current Trained Level"
              value={currentTrainedLevel?.trainingLevelName ?? "-"}
              sub={currentTrainedLevel ? `Completed ${formatDate(currentTrainedLevel.completedAt)}` : "No completed level yet"}
              icon={Trophy}
              href="/ci/training/progress"
            />
            <CIStatCard
              label="Next Training"
              value={nextTraining?.trainingLevelName ?? "-"}
              sub={nextTraining ? `${formatDate(nextTraining.sessionDate)} | ${nextTraining.assignmentStatus}` : "No upcoming session"}
              icon={CalendarDays}
              href="/ci/training/upcoming"
            />
            <CIStatCard
              label="Completed Levels"
              value={String(completedLevels.length)}
              sub={`${progress.length} total levels`}
              icon={GraduationCap}
              href="/ci/training/progress"
            />
            <CIStatCard
              label="Packages Purchased"
              value={String(purchasedPackageCount)}
              sub={`${packages.length} total packages`}
              icon={Layers}
              href="/ci/training/packages"
            />
            <CIStatCard
              label="Pending Packages"
              value={String(pendingPackageCount)}
              sub="Available to purchase"
              icon={ClipboardList}
              href="/ci/training/packages"
            />
          </div>
        )}

        <CIDashboardPanel label="Tools" title="Quick access">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Link href="/ci/agreement" className="rounded-xl border bg-background p-3 text-sm font-medium text-card-foreground shadow-sm transition-colors hover:bg-accent">
              <div className="mb-1 flex items-center gap-2 text-primary">
                <FileText className="h-4 w-4" />
                My Agreement
              </div>
              <p className="text-xs text-muted-foreground">Agreement details and status</p>
            </Link>
            <Link href="/ci/training/packages" className="rounded-xl border bg-background p-3 text-sm font-medium text-card-foreground shadow-sm transition-colors hover:bg-accent">
              <div className="mb-1 flex items-center gap-2 text-primary">
                <Layers className="h-4 w-4" />
                Training Packages
              </div>
              <p className="text-xs text-muted-foreground">Purchase available packages</p>
            </Link>
            <Link href="/ci/training/progress" className="rounded-xl border bg-background p-3 text-sm font-medium text-card-foreground shadow-sm transition-colors hover:bg-accent">
              <div className="mb-1 flex items-center gap-2 text-primary">
                <GraduationCap className="h-4 w-4" />
                Progress
              </div>
              <p className="text-xs text-muted-foreground">Track completed levels and marks</p>
            </Link>
            <Link href="/ci/training/upcoming" className="rounded-xl border bg-background p-3 text-sm font-medium text-card-foreground shadow-sm transition-colors hover:bg-accent">
              <div className="mb-1 flex items-center gap-2 text-primary">
                <CalendarDays className="h-4 w-4" />
                Upcoming
              </div>
              <p className="text-xs text-muted-foreground">View next assigned sessions</p>
            </Link>
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
