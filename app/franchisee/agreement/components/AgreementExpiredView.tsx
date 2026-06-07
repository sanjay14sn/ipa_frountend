"use client";

import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { AgreementRecord } from "@/services/agreement.service";

interface AgreementExpiredViewProps {
  agreement: AgreementRecord;
  /** Id of the Approved renewal for this program, or null if none yet. */
  renewalAgreementId: number | null;
}

export function AgreementExpiredView({
  agreement,
  renewalAgreementId,
}: AgreementExpiredViewProps) {
  const router = useRouter();
  const programLabel =
    agreement.program?.name ??
    agreement.programName ??
    agreement.title ??
    "this program";
  const expiredOn = agreement.expiresAt
    ? format(new Date(agreement.expiresAt), "d MMM yyyy")
    : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg overflow-hidden rounded-2xl border-border bg-card shadow-sm">
        <CardHeader className="border-b bg-accent/30 px-5 py-5 text-left">
          <div className="mb-3">
            <span className="rounded-full border border-destructive/20 bg-destructive/10 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.16em] text-destructive">
              Expired
            </span>
          </div>
          <CardTitle className="flex items-center gap-2 text-2xl font-normal text-card-foreground">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            Agreement no longer active
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 py-5">
          <p className="text-sm text-muted-foreground">
            Your agreement for <span className="font-medium text-card-foreground">{programLabel}</span>
            {expiredOn ? <> lapsed on <span className="font-medium text-card-foreground">{expiredOn}</span>.</> : <> has lapsed.</>}
          </p>

          {renewalAgreementId != null ? (
            <>
              <p className="mt-3 text-sm text-muted-foreground">
                A renewal has been issued. Pay again to renew this program — you&apos;ll review the
                terms, sign, and pay just like before.
              </p>
              <Button
                className="mt-5 rounded-lg"
                onClick={() =>
                  router.push(`/franchisee/agreement?agreementId=${renewalAgreementId}`)
                }
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Pay again
              </Button>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Your renewal is being prepared by Abacus. You&apos;ll be able to pay here once it&apos;s
              issued — please check back soon.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
