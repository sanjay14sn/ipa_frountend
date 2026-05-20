"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { useQueryClient } from "@tanstack/react-query";

import { type User } from "@/lib/auth";
import { useUser } from "@/context/user-context";
import { queryKeys } from "@/hooks/api/query-keys";
import type { AgreementSwitcherItem } from "@/services/agreement.service";

type ActiveProgramRow = NonNullable<
  NonNullable<NonNullable<User["profile"]>["franchise"]>["activePrograms"]
>[number];

/**
 * Second-level scope under the franchise: which agreement (program) the
 * franchisee is currently working inside.
 *
 * Post-refactor the switcher feed is derived ENTIRELY from the cached
 * franchisee profile (`user.profile.franchise.activePrograms`) — no separate
 * `/franchisee/agreements/switcher` round-trip. The profile already carries
 * every non-terminal agreement (Valid + Approved) for the active franchise,
 * which is exactly what the switcher needs to show.
 *
 * Why this matters:
 *   - One source of truth. The profile drives sidebar/header/switcher.
 *   - No extra request hitting the operational-access guard. The guard
 *     short-circuits unrelated reads when the franchise is restricted to
 *     payment-portal mode; sourcing the switcher from cached state means
 *     it keeps working even when the guard is locking down operational
 *     endpoints.
 *
 * Persistence: the active selection lives on `user.activeAgreementId` in
 * the localStorage `user` blob, mutated only via `UserContext.switchAgreement`.
 */
interface AgreementContextValue {
  agreements: AgreementSwitcherItem[];
  loading: boolean;
  activeAgreementId: number | null;
  activeAgreement: AgreementSwitcherItem | null;
  switchAgreement: (agreementId: number | null) => Promise<void>;
  /** Force a refetch of the profile (e.g. after submit/sign/pay). */
  refresh: () => Promise<void>;
}

const AgreementContext = createContext<AgreementContextValue | null>(null);

type AgreementLifecycleStatus = AgreementSwitcherItem["lifecycleStatus"];

function toLifecycleStatus(status: string): AgreementLifecycleStatus {
  switch (status) {
    case "Draft":
    case "Approved":
    case "Valid":
    case "Suspended":
    case "Void":
    case "Rejected":
    case "Pending":
      return status as AgreementLifecycleStatus;
    default:
      // Conservative fallback: treat unknown values as Approved so the row
      // still renders rather than vanishing silently.
      return "Approved";
  }
}

/**
 * Map a row from `profile.franchise.activePrograms` into the shape the
 * switcher UI expects. Skips CI agreements — those have their own UI and
 * never belonged in the program switcher.
 */
function mapActiveProgramToSwitcher(
  row: ActiveProgramRow,
): AgreementSwitcherItem | null {
  if (row.type === "CI_AGREEMENT") return null;
  return {
    kind: "agreement",
    agreementId: row.id,
    programRequestId: null,
    franchiseId: row.franchiseId,
    programId: row.programId,
    programName: row.program?.name ?? null,
    programCode: null,
    agreementType: row.type as AgreementSwitcherItem["agreementType"],
    lifecycleStatus: toLifecycleStatus(row.status),
    signed: row.signed,
    title: row.title,
    tenureMonths: row.tenure,
    expiresAt: row.expiresAt,
    signedAt: row.franchiseeSignedAt,
    createdAt: row.createdAt,
  };
}

export function AgreementProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: userLoading, switchAgreement: userSwitchAgreement } = useUser();
  const queryClient = useQueryClient();
  const franchiseId = user?.franchiseId ?? null;
  const isActiveFranchisee =
    user?.role === "franchisee" && !!franchiseId && user.franchiseStatus === "Active";
  const activeAgreementId = user?.activeAgreementId ?? null;

  const agreements = useMemo<AgreementSwitcherItem[]>(() => {
    const rows = user?.profile?.franchise?.activePrograms ?? [];
    return rows
      .map(mapActiveProgramToSwitcher)
      .filter((row): row is AgreementSwitcherItem => row != null);
  }, [user?.profile?.franchise?.activePrograms]);

  // Hydrate / recover `activeAgreementId` from the profile-derived list.
  // If the stored selection no longer exists (agreement voided, franchise
  // switched, etc.) pin to the newest agreement so the user lands somewhere.
  useEffect(() => {
    if (!isActiveFranchisee || agreements.length === 0) return;
    const stillValid =
      activeAgreementId != null &&
      agreements.some((row) => row.agreementId === activeAgreementId);
    if (stillValid) return;
    const firstAgreement = agreements.find((row) => row.agreementId != null);
    const nextId = firstAgreement?.agreementId ?? null;
    if (nextId === activeAgreementId) return;
    void userSwitchAgreement(nextId);
  }, [agreements, activeAgreementId, isActiveFranchisee, userSwitchAgreement]);

  const switchAgreement = useCallback(
    async (agreementId: number | null) => {
      await userSwitchAgreement(agreementId);
    },
    [userSwitchAgreement],
  );

  // Switcher is derived from the profile, so refreshing means refetching
  // the profile query. UserContext owns that query and will rehydrate
  // `user.profile.franchise.activePrograms`.
  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.auth.franchiseeProfile(franchiseId ?? undefined),
    });
  }, [franchiseId, queryClient]);

  const activeAgreement = useMemo(() => {
    if (activeAgreementId == null) return null;
    return agreements.find((row) => row.agreementId === activeAgreementId) ?? null;
  }, [agreements, activeAgreementId]);

  const value = useMemo<AgreementContextValue>(
    () => ({
      agreements,
      loading: userLoading,
      activeAgreementId,
      activeAgreement,
      switchAgreement,
      refresh,
    }),
    [
      agreements,
      userLoading,
      activeAgreementId,
      activeAgreement,
      switchAgreement,
      refresh,
    ],
  );

  return (
    <AgreementContext.Provider value={value}>
      {children}
    </AgreementContext.Provider>
  );
}

export function useAgreementContext(): AgreementContextValue {
  const ctx = useContext(AgreementContext);
  if (!ctx) {
    throw new Error("useAgreementContext must be used within an AgreementProvider");
  }
  return ctx;
}
