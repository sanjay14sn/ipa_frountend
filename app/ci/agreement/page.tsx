"use client";

import { Suspense, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  listMyCIAgreements,
  type CIAgreementRecord,
} from "@/services/contracting.service";
import { useCIAuth } from "@/context/ci-auth-context";
import { formatDate } from "@/lib/date-utils";
import { AgreementSignFlow } from "./_components/agreement-sign-flow";

// Multi-franchise CIs hold one agreement per attached franchise. With a
// single agreement this page renders the sign flow directly (pixel-identical
// to the pre-multi-franchise page); with several it shows a picker first,
// synced to ?agreementId= so deep links and the in-flow ?step= param keep
// working. The flow itself lives in _components/agreement-sign-flow.tsx
// (verbatim move — signing payloads untouched).

const PHASE_LABELS: Record<string, string> = {
  PENDING_CI_SIGNATURE: "Awaiting your signature",
  PENDING_FRANCHISEE_SIGNATURE: "Awaiting franchisee",
  SIGNED: "Signed",
  EXPIRED: "Expired",
};

/** Pending-signature agreements sort first; dead rows last. */
function pickerRank(a: CIAgreementRecord): number {
  if (a.status === "VOID") return 4;
  if (a.phase === "PENDING_CI_SIGNATURE") return 0;
  if (a.phase === "PENDING_FRANCHISEE_SIGNATURE") return 1;
  if (a.phase === "SIGNED") return 2;
  return 3;
}

function phaseBadge(a: CIAgreementRecord) {
  if (a.status === "VOID") return <Badge variant="outline">Terminated</Badge>;
  const label = PHASE_LABELS[a.phase] ?? a.phase;
  return a.phase === "PENDING_CI_SIGNATURE" ? (
    <Badge>{label}</Badge>
  ) : (
    <Badge variant="secondary">{label}</Badge>
  );
}

function LoadingCard({ text }: { text: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="rounded-2xl border bg-card px-6 py-5 text-center shadow-sm">
        <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

function CIAgreementContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { refresh } = useCIAuth();

  const { data: agreements, refetch, isLoading } = useQuery({
    queryKey: ["ci-agreements", "mine"],
    queryFn: listMyCIAgreements,
  });

  const handleSigned = useCallback(async () => {
    await refetch();
    await refresh();
  }, [refetch, refresh]);

  const selectAgreement = useCallback(
    (id: number | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id == null) {
        params.delete("agreementId");
        params.delete("step");
      } else {
        params.set("agreementId", String(id));
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  if (isLoading) {
    return <LoadingCard text="Loading your agreement…" />;
  }

  const list = agreements ?? [];

  if (!list.length) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-lg overflow-hidden rounded-2xl border-border bg-card shadow-sm">
          <CardHeader className="border-b bg-accent/30 px-5 py-5">
            <CardTitle className="text-xl font-normal text-card-foreground">
              Agreement pending
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 py-5">
            <p className="text-sm text-muted-foreground">
              No agreement has been issued yet. It will appear here after admin approval.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Single agreement — the pre-multi-franchise experience, verbatim.
  if (list.length === 1) {
    return <AgreementSignFlow agreement={list[0]} onSigned={handleSigned} />;
  }

  const selectedId = Number(searchParams.get("agreementId")) || null;
  const selected =
    selectedId != null ? (list.find((a) => a.id === selectedId) ?? null) : null;

  if (selected) {
    return (
      <div>
        <div className="mx-auto w-full max-w-5xl px-4 pt-4 sm:px-5 lg:px-6">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1 text-xs"
            onClick={() => selectAgreement(null)}
          >
            <ArrowLeft className="h-3 w-3" />
            All agreements
          </Button>
        </div>
        <AgreementSignFlow agreement={selected} onSigned={handleSigned} />
      </div>
    );
  }

  const sorted = [...list].sort((a, b) => pickerRank(a) - pickerRank(b));

  return (
    <div className="min-h-screen bg-background px-4 py-5 sm:px-5 lg:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-4 py-5 sm:px-5">
            <h1 className="text-2xl font-normal tracking-tight text-card-foreground">
              Your agreements
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              You hold one agreement per franchise you teach at. Agreements
              awaiting your signature are listed first.
            </p>
          </div>
          <div className="space-y-2 p-4 sm:p-5" data-testid="ci-agreement-picker">
            {sorted.map((a) => (
              <button
                key={a.id}
                type="button"
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-border p-4 text-left transition-colors hover:bg-muted/50"
                onClick={() => selectAgreement(a.id)}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-card-foreground truncate">
                    {a.franchisee?.centreName || a.franchisee?.name || a.title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {a.expiresAt
                      ? `Expires ${formatDate(a.expiresAt)}`
                      : a.tenure != null
                        ? `${a.tenure}-month tenure`
                        : "—"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {a.isHandler ? <Badge variant="outline">Handler</Badge> : null}
                  {phaseBadge(a)}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CIAgreementPage() {
  return (
    <Suspense fallback={<LoadingCard text="Loading…" />}>
      <CIAgreementContent />
    </Suspense>
  );
}
