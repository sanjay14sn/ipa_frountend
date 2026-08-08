"use client";

import { Suspense, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { PencilLine, UserPen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SummaryStatCard } from "@/components/shared";
import { PageTabs, TabsContent } from "@/components/shared/page-tabs";
import { useTabFromUrl } from "@/hooks/use-tab-from-url";
import { getFranchiseApplicationDetail } from "@/services/franchisee.service";
import AdminOrdersTable from "@/components/orders/AdminOrdersTable";
import { AgreementSummaryCards } from "@/components/agreements/agreement-summary-cards";
import { FranchiseStudentsTable } from "./_components/FranchiseStudentsTable";
import { FranchiseCiListTable } from "./_components/FranchiseCiListTable";
import { FranchiseCiSummary } from "./_components/FranchiseCiSummary";
import { FranchiseStudentsSummary } from "./_components/FranchiseStudentsSummary";
import { FranchiseOrdersSummary } from "./_components/FranchiseOrdersSummary";
import { FranchisePaymentsTab } from "./_components/FranchisePaymentsTab";
import { AdminAgreementsSection } from "../_components/admin-agreements-section";
import { EditFranchiseDialog } from "../_components/edit-franchise-dialog";
import { EditFranchiseeDialog } from "../_components/edit-franchisee-dialog";
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

  const [editFranchiseOpen, setEditFranchiseOpen] = useState(false);
  const [editFranchiseeOpen, setEditFranchiseeOpen] = useState(false);

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

  // Respec (doc 05 open question, resolved 2026-07-10): the composite header
  // now rides the standard PageTabs shape — badges live in the title node,
  // the stat band in the headerExtras slot, and the old back-link is gone
  // (the shell breadcrumbs already provide Admin / Franchise navigation).
  return (
    <PageTabs
      title={
        isLoading ? (
          "Loading franchise…"
        ) : isError ? (
          "Franchise"
        ) : (
          <span className="flex flex-wrap items-center gap-2">
            {title}
            {franchise?.status ? (
              <Badge variant="secondary">{franchise.status}</Badge>
            ) : null}
            {typeof franchise?.validAgreementsCount === "number" ? (
              <Badge
                variant={
                  franchise.validAgreementsCount > 0 ? "default" : "outline"
                }
              >
                {franchise.validAgreementsCount} valid agreement
                {franchise.validAgreementsCount === 1 ? "" : "s"}
              </Badge>
            ) : null}
            {franchise?.type ? (
              <Badge variant="outline">{franchise.type}</Badge>
            ) : null}
          </span>
        )
      }
      description={
        isError ? (
          <span className="text-destructive">
            Could not load this franchise. Check the id or try again.
          </span>
        ) : isLoading ? (
          "Fetching franchise details…"
        ) : (
          `${subtitle || "Franchise hub"}${franchise?.code ? ` | ${franchise.code}` : ""}`
        )
      }
      action={
        !isLoading && !isError && franchise ? (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditFranchiseOpen(true)}
            >
              <PencilLine className="h-4 w-4" />
              Edit franchise
            </Button>
            {franchisee?.id ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditFranchiseeOpen(true)}
              >
                <UserPen className="h-4 w-4" />
                Edit franchisee
              </Button>
            ) : null}
          </div>
        ) : null
      }
      headerExtras={
        !isLoading && !isError ? (
          <div className="grid divide-y rounded-xl border md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-4">
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
        ) : null
      }
      tabs={[
        { value: "students", label: "Students" },
        { value: "ci", label: "CI" },
        { value: "orders", label: "Orders" },
        { value: "payments", label: "Payments" },
        { value: "agreements", label: "Agreements" },
      ]}
      value={tab}
      onValueChange={setTab}
    >
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
        <div className="space-y-4">
          <AgreementSummaryCards
            agreements={detail?.agreements ?? franchise?.agreements}
          />
          <AdminAgreementsSection fixedFranchiseId={franchiseId} embed />
        </div>
      </TabsContent>

      <EditFranchiseDialog
        franchise={franchise ?? null}
        agreements={detail?.agreements ?? franchise?.agreements ?? null}
        open={editFranchiseOpen}
        onOpenChange={setEditFranchiseOpen}
      />
      <EditFranchiseeDialog
        franchisee={franchisee ?? null}
        open={editFranchiseeOpen}
        onOpenChange={setEditFranchiseeOpen}
      />
    </PageTabs>
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
