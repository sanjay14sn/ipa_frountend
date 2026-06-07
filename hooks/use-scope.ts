"use client";

import { useEffect, useMemo } from "react";

import { useUser } from "@/context/user-context";
import { useScopeStore } from "@/lib/stores/scope-store";
import type { AgreementSwitcherItem } from "@/services/agreement.service";
import { isFranchiseOperational, type User } from "@/lib/auth";

type ActiveProgramRow = NonNullable<
  NonNullable<NonNullable<User["profile"]>["franchise"]>["activePrograms"]
>[number];

type AgreementLifecycleStatus = AgreementSwitcherItem["lifecycleStatus"];

export function toLifecycleStatus(status: string): AgreementLifecycleStatus {
  switch (status) {
    case "Draft":
    case "Approved":
    case "Valid":
    case "Suspended":
    case "Void":
    case "Rejected":
    case "Pending":
    case "Expired":
      return status as AgreementLifecycleStatus;
    default:
      return "Approved";
  }
}

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

/**
 * Read the active scope (franchiseId / agreementId / programId). Components
 * subscribe selectively so they only re-render when their slice changes.
 */
export function useScope() {
  const franchiseId = useScopeStore((s) => s.franchiseId);
  const agreementId = useScopeStore((s) => s.agreementId);
  const programId = useScopeStore((s) => s.programId);
  return { franchiseId, agreementId, programId };
}

/** Just the programId — most common consumer. */
export function useProgramId(): number | null {
  return useScopeStore((s) => s.programId);
}

/**
 * Derive the agreement switcher list from the cached franchisee profile.
 * Replaces the old `AgreementContext` — same derivation logic, just no
 * separate provider.
 *
 * Also handles the auto-hydrate: if the store has no agreement selected (or
 * the selected one is stale), pin the newest non-CI agreement so the user
 * always lands somewhere.
 */
export function useScopeAgreements() {
  const { user, loading } = useUser();
  const agreementId = useScopeStore((s) => s.agreementId);
  const setAgreement = useScopeStore((s) => s.setAgreement);

  const franchiseId = user?.franchiseId ?? null;
  const isActiveFranchisee =
    user?.role === "franchisee" &&
    !!franchiseId &&
    isFranchiseOperational(user);

  const agreements = useMemo<AgreementSwitcherItem[]>(() => {
    const rows = user?.profile?.franchise?.activePrograms ?? [];
    return rows
      .map(mapActiveProgramToSwitcher)
      .filter((row): row is AgreementSwitcherItem => row != null);
  }, [user?.profile?.franchise?.activePrograms]);

  const activeAgreement = useMemo(() => {
    if (agreementId == null) return null;
    return agreements.find((row) => row.agreementId === agreementId) ?? null;
  }, [agreements, agreementId]);

  useEffect(() => {
    if (!isActiveFranchisee || agreements.length === 0) return;
    const stillValid =
      agreementId != null &&
      agreements.some((row) => row.agreementId === agreementId);
    if (stillValid) return;
    const firstAgreement = agreements.find((row) => row.agreementId != null);
    const nextAgreementId = firstAgreement?.agreementId ?? null;
    const nextProgramId = firstAgreement?.programId ?? null;
    setAgreement(nextAgreementId, nextProgramId);
  }, [agreements, agreementId, isActiveFranchisee, setAgreement]);

  return {
    agreements,
    activeAgreement,
    activeAgreementId: agreementId,
    loading,
  };
}
