"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SummaryStatCard } from "@/components/shared";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTabFromUrl } from "@/hooks/use-tab-from-url";
import { getFranchiseApplicationDetail } from "@/services/franchisee.service";
import AdminOrdersTable from "@/app/admin/orders/components/AdminOrdersTable";
import { FranchiseStudentsTable } from "./components/FranchiseStudentsTable";
import { FranchiseCiListTable } from "./components/FranchiseCiListTable";
import { FranchiseCiSummary } from "./components/FranchiseCiSummary";
import { FranchiseStudentsSummary } from "./components/FranchiseStudentsSummary";
import { FranchiseOrdersSummary } from "./components/FranchiseOrdersSummary";
import { FranchisePaymentsTab } from "./components/FranchisePaymentsTab";
import { FranchiseAgreementsWorkspace } from "@/app/admin/franchise/components/FranchiseAgreementsWorkspace";
import { formatDate } from "@/lib/date-utils";

const TABS = ["students", "ci", "orders", "payments", "agreements"] as const;

function compactText(value: unknown) {
  if (value == null || value === "") return "-";
  return String(value);
}

function uniqueValues(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => value?.trim()).filter(Boolean))] as string[];
}

function FranchiseDetailInner() {
  const params = useParams();
  const franchiseId = String(params.franchiseId ?? "").trim();
  const [tab, setTab] = useTabFromUrl("students", TABS);

  const { data: detail, isLoading, isError } = useQuery({
    queryKey: ["admin-franchise-detail", franchiseId],
    queryFn: () => getFranchiseApplicationDetail(franchiseId),
    enabled: franchiseId.length > 0,
  });

  if (!franchiseId) {
    return (
      <p className="rounded-2xl border bg-card p-4 text-sm text-muted-foreground shadow-sm">
        Missing franchise id in the URL.
      </p>
    );
  }

  const franchise = detail?.franchise;
  const franchisee = detail?.franchisee;
  const title = franchise?.name ?? "Franchise";
  const subtitle = [franchise?.city, franchise?.state].filter(Boolean).join(", ");
  const programNames = uniqueValues([
    detail?.selectedProgram?.name,
    ...(franchise?.agreements ?? []).map((a) => a.programName ?? a.program?.name),
    ...(detail?.programRequests ?? []).map((entry) => entry.program?.name),
  ]);
  const agreementsCount =
    detail?.agreements?.length ?? franchise?.agreements?.length ?? 0;

  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-4">
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="border-b bg-accent/30 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <Button variant="ghost" size="sm" className="-ml-2 w-fit" asChild>
                <Link href="/admin/franchise?tab=franchises">
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  All franchises
                </Link>
              </Button>
              {isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading franchise...
                </div>
              ) : isError ? (
                <p className="text-sm text-destructive">
                  Could not load this franchise. Check the id or try again.
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl text-card-foreground">{title}</h1>
                    {franchise?.status ? (
                      <Badge variant="secondary">{franchise.status}</Badge>
                    ) : null}
                    {franchise?.type ? (
                      <Badge variant="outline">{franchise.type}</Badge>
                    ) : null}
                  </div>
                  <p className="max-w-3xl text-sm text-muted-foreground">
                    {subtitle || "Franchise hub"} | {franchiseId}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {!isLoading && !isError ? (
          <div className="grid divide-y md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-4">
            <SummaryStatCard
              label="Franchisee"
              value={compactText(franchisee?.name)}
              description={
                uniqueValues([franchisee?.mail, franchisee?.phone]).join(" | ") ||
                "Owner contact"
              }
              valueClassName="text-lg font-semibold leading-snug"
            />
            <SummaryStatCard
              label="Location"
              value={subtitle || compactText(franchise?.city)}
              description={compactText(franchise?.address)}
              valueClassName="text-lg font-semibold leading-snug"
              descriptionClassName="max-w-none line-clamp-2"
            />
            <SummaryStatCard
              label="Programs"
              value={programNames.length > 0 ? programNames.join(", ") : "-"}
              description={`${programNames.length || 0} assigned`}
              valueClassName="text-lg font-semibold leading-snug"
            />
            <SummaryStatCard
              label="Agreements"
              value={String(agreementsCount)}
              description={`Created ${formatDate(franchise?.createdAt)}`}
              valueClassName="text-lg font-semibold leading-snug"
            />
          </div>
        ) : null}

        <div className="border-t px-4 py-3 sm:px-5">
          <TabsList className="flex h-auto flex-wrap justify-start gap-1">
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="ci">CI</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="agreements">Agreements</TabsTrigger>
          </TabsList>
        </div>
      </div>

      <TabsContent value="students" className="mt-0">
        <div className="space-y-4">
          <FranchiseStudentsSummary franchiseId={franchiseId} />
          <FranchiseStudentsTable franchiseId={franchiseId} />
        </div>
      </TabsContent>

      <TabsContent value="ci" className="mt-0">
        <div className="space-y-4">
          <FranchiseCiSummary franchiseId={franchiseId} />
          <FranchiseCiListTable franchiseId={franchiseId} />
        </div>
      </TabsContent>

      <TabsContent value="orders" className="mt-0">
        <div className="space-y-4">
          <FranchiseOrdersSummary franchiseId={franchiseId} />
          <AdminOrdersTable franchiseId={franchiseId} />
        </div>
      </TabsContent>

      <TabsContent value="payments" className="mt-0">
        <FranchisePaymentsTab
          franchiseId={franchiseId}
          franchiseName={franchise?.name ?? "Franchise"}
        />
      </TabsContent>

      <TabsContent value="agreements" className="mt-0">
        <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
          <FranchiseAgreementsWorkspace agreements={detail?.agreements ?? []} />
        </div>
      </TabsContent>
    </Tabs>
  );
}

export default function AdminFranchiseDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground shadow-sm">
          Loading...
        </div>
      }
    >
      <FranchiseDetailInner />
    </Suspense>
  );
}
