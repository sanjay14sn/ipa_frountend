"use client";

import { Suspense, type ElementType } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BadgeCheck,
  FileText,
  Loader2,
  MapPin,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTabFromUrl } from "@/hooks/use-tab-from-url";
import { getFranchiseApplicationDetail } from "@/services/franchisee.service";
import AdminOrdersTable from "@/app/admin/orders/components/AdminOrdersTable";
import { FranchiseStudentsTable } from "./components/FranchiseStudentsTable";
import { FranchiseCiListTable } from "./components/FranchiseCiListTable";
import PaymentsTable from "@/app/admin/payments/components/PaymentsTable";
import { FranchiseAgreementsWorkspace } from "@/app/admin/franchise/components/FranchiseAgreementsWorkspace";

const TABS = ["students", "ci", "orders", "payments", "agreements"] as const;

function formatDate(value: string | Date | null | undefined) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString();
}

function compactText(value: unknown) {
  if (value == null || value === "") return "-";
  return String(value);
}

function uniqueValues(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => value?.trim()).filter(Boolean))] as string[];
}

function FranchiseFactCard({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: ElementType;
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-3 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-[11px] font-medium uppercase tracking-[0.08em]">
          {label}
        </span>
      </div>
      <p className="break-words text-sm font-semibold text-card-foreground">
        {value}
      </p>
      {helper ? (
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
          {helper}
        </p>
      ) : null}
    </div>
  );
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
          <div className="grid gap-3 px-4 py-4 sm:px-5 md:grid-cols-2 xl:grid-cols-4">
            <FranchiseFactCard
              icon={User}
              label="Franchisee"
              value={compactText(franchisee?.name)}
              helper={
                uniqueValues([franchisee?.mail, franchisee?.phone]).join(" | ") ||
                "Owner contact"
              }
            />
            <FranchiseFactCard
              icon={MapPin}
              label="Location"
              value={subtitle || compactText(franchise?.city)}
              helper={compactText(franchise?.address)}
            />
            <FranchiseFactCard
              icon={FileText}
              label="Programs"
              value={programNames.length > 0 ? programNames.join(", ") : "-"}
              helper={`${programNames.length || 0} assigned`}
            />
            <FranchiseFactCard
              icon={BadgeCheck}
              label="Agreements"
              value={String(agreementsCount)}
              helper={`Created ${formatDate(franchise?.createdAt)}`}
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
        <FranchiseStudentsTable franchiseId={franchiseId} />
      </TabsContent>

      <TabsContent value="ci" className="mt-0">
        <FranchiseCiListTable franchiseId={franchiseId} />
      </TabsContent>

      <TabsContent value="orders" className="mt-0">
        <AdminOrdersTable franchiseId={franchiseId} />
      </TabsContent>

      <TabsContent value="payments" className="mt-0">
        <PaymentsTable franchiseId={franchiseId} />
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
