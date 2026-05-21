"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Check, ChevronDown, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LifecycleStatusBadge } from "@/components/status/lifecycle-status-badge";
import { useUser } from "@/context/user-context";
import { useScopeAgreements } from "@/hooks/use-scope";

/**
 * Second-level switcher beneath the franchise switcher. Lists every agreement
 * (and any program request that doesn't have an agreement yet) for the current
 * franchise. Selecting one updates the agreement context, which invalidates the
 * program-scoped query keys so CIs / students / orders re-filter.
 *
 * Hidden when the franchisee only has a single agreement — there's nothing to
 * switch between in that case.
 */
export function AgreementSwitcher() {
  const { agreements, activeAgreement, loading } = useScopeAgreements();
  // Continue to delegate the actual scope mutation through UserContext so the
  // legacy localStorage `user.activeAgreementId` field stays in sync during
  // the migration window. UserContext.switchAgreement mirrors into the scope
  // store internally.
  const { switchAgreement } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [switching, setSwitching] = useState(false);

  if (loading && agreements.length === 0) return null;
  if (agreements.length <= 1) return null;

  const isOnAgreementPage =
    pathname === "/franchisee/agreement" ||
    (pathname?.startsWith("/franchisee/agreement/") ?? false);

  const handleSwitch = async (
    agreementId: number | null,
    lifecycleStatus: string,
    disabled: boolean,
  ) => {
    if (disabled || switching) return;
    setSwitching(true);
    try {
      await switchAgreement(agreementId);

      // Status-driven routing (post-refactor — agreement.status IS the lifecycle).
      // Two contexts matter:
      //   1. Standing on a regular portal page (dashboard, students, orders…)
      //      → only navigate AWAY for the "needs action" statuses
      //        (Approved goes to sign page; Pending goes to Programs tab).
      //        Valid/Suspended/Void stay put — the page just rescopes.
      //   2. Standing on /franchisee/agreement → the user is currently signing.
      //      Selecting an Approved sibling re-pins the URL to that agreementId.
      //      Selecting a Valid/Suspended/Void/Draft means "I'm done here" —
      //      send them to the dashboard so the program scope they picked
      //      becomes the working view.
      const isSignNeeded = agreementId != null && lifecycleStatus === "Approved";
      const isPendingRequest = lifecycleStatus === "Pending";

      if (isSignNeeded) {
        router.push(`/franchisee/agreement?agreementId=${agreementId}`);
      } else if (isPendingRequest) {
        router.push(`/franchisee/franchise?tab=programs`);
      } else if (isOnAgreementPage) {
        // Picked a non-actionable agreement (Valid / Suspended / Void / Draft)
        // while sitting on the sign page — leave the sign flow and land on
        // the dashboard with the new scope already active.
        router.push("/franchisee/dashboard");
      }
      // else: regular portal page + non-actionable status → silent scope switch.
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to switch agreement";
      toast.error(message);
    } finally {
      setSwitching(false);
    }
  };

  const triggerLabel =
    activeAgreement?.programName ??
    activeAgreement?.title ??
    "Select Program";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 border-border text-sm text-primary hover:bg-accent hover:text-accent-foreground"
          disabled={switching}
        >
          {switching ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <FileText className="h-3.5 w-3.5 opacity-60" />
          )}
          <span className="max-w-[160px] truncate">{triggerLabel}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-80">
        <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Your Programs
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {agreements.map((row) => {
          // Request-backed items (no agreementId yet) cannot be selected as
          // a working scope — they only exist to show "we received your request".
          const isRequestOnly = row.agreementId == null;
          const isActive =
            row.agreementId != null &&
            row.agreementId === activeAgreement?.agreementId;
          const disabled = isRequestOnly;
          const key =
            row.agreementId != null
              ? `agreement-${row.agreementId}`
              : `request-${row.programRequestId}`;
          return (
            <DropdownMenuItem
              key={key}
              className={`flex items-center justify-between gap-2 px-2 py-2 ${
                disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer"
              }`}
              disabled={disabled}
              onClick={() => handleSwitch(row.agreementId, row.lifecycleStatus, disabled)}
            >
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <Check
                  className={`h-4 w-4 shrink-0 text-primary ${isActive ? "opacity-100" : "opacity-0"}`}
                />
                <span className="truncate text-sm">
                  {row.programName ?? row.title ?? "Untitled program"}
                </span>
              </div>
              <LifecycleStatusBadge
                status={row.lifecycleStatus}
                className="shrink-0"
              />
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
