export type UserRole = "admin" | "franchisee" | "franchise";

export interface User {
  id: string;
  name: string;
  role: UserRole;
  franchiseId?: string;
  franchiseName?: string;
  /** Application-review status only (Pending/Approved/Rejected). */
  franchiseStatus?: string;
  /**
   * Derived operational flag — true when the active franchise has at least one
   * in-force (Valid) agreement. Replaces the old `franchiseStatus === "Active"`
   * check. Persisted in the slim identity so gating works before the profile
   * finishes loading.
   */
  isOperational?: boolean;
  /**
   * Currently selected program scope inside the active franchise. Mirrors the
   * franchise-selection model: persisted in the localStorage `user` blob,
   * mutated ONLY through the program switcher (`UserContext.switchAgreement`).
   * Null means "no program selected yet" — the AgreementProvider auto-picks
   * the newest agreement for the franchise the first time it's loaded.
   */
  activeAgreementId?: number | null;
  mail?: string;
  phone?: string;
  adminRole?: "super" | "staff";
  state?: string | null;
  franchises?: Array<{ id: string; name: string; status: string; pendingCount?: number }>;
  profile?: {
    id: number;
    name: string;
    dob: string;
    bloodGroup: string;
    address: string;
    communicationAddress: string;
    city?: string;
    state?: string,
    pincode?: string;
    phone: string;
    mail: string;
    education: string;
    occupation: string;
    reference: string;
    /** Raw stored signature path on the franchisee row (relative to /uploads). */
    franchiseeSignature?: string | null;
    /** Raw stored profile-photo path (relative to /uploads); null = none. */
    photoPath?: string | null;
    /**
     * Guided-tour completion map (docs/guided-tours/) — rides the
     * /franchisee/auth/me row spread; absent on old backends (treated as
     * completed, fail-open).
     */
    toursCompleted?: Record<string, { version: number; completedAt: string }>;
    /**
     * All franchises owned by this franchisee (any review status), from the
     * /franchisee/auth/me response. Source of truth for `User.franchises` —
     * riding the profile fetch is what lets the switcher survive full page
     * loads (the persisted slim identity intentionally omits the list).
     */
    franchises?: Array<{ id: string; name: string; status: string }>;
    franchise?: {
      id: string;
      code?: string | null;
      name: string;
      type: string;
      /** Application-review status only (Pending/Approved/Rejected). */
      status: string;
      /** Derived: count of in-force (Valid) agreements, excluding CI agreements. */
      validAgreementsCount?: number;
      /** Derived: true when the franchise has at least one valid agreement. */
      isOperational?: boolean;
      franchiseeId: number;
      approvedBy: number;
      approvedAt: string;
      createdAt: string;
      updatedAt: string;
      city?: string;
      address?: string;
      agreements?: Array<{
        programId?: number | null;
        programName?: string | null;
        program?: { id?: number; name?: string } | null;
      }>;
      /**
       * All non-terminal agreements (ACTIVE + APPROVED) for this franchise.
       * The agreement switcher is sourced from here instead of a dedicated
       * endpoint — one round-trip via the profile fetch. Rows are flat
       * AgreementRecords, so they carry `kind`/`origin` + UPPER_SNAKE status.
       */
      activePrograms?: Array<{
        id: number;
        kind: string;
        origin?: string;
        status: string;
        signed: boolean;
        franchiseId: string;
        franchiseeId: number;
        programId: number | null;
        title: string | null;
        tenure: number | null;
        expiresAt: string | null;
        franchiseeSignedAt: string | null;
        createdAt: string;
        program?: { id: number; name: string } | null;
      }>;
      operationalStanding?: {
        standing: string | null;
        holdReason: string | null;
        restrictedToPaymentPortal: boolean;
      };
      franchisePayroll?: {
        franchiseFee: number;
        dateOfPayment: string;
        dateOfJoining: string;
        monthlyFee: number;
        ciShare: number;
        franchiseShare: number;
        royalty: number;
        kitCost: number;
        materialCost: number;
        installment: number;
        createdBy: number;
        updatedBy: number;
      };
    };
  };
}

export function getEffectiveFranchiseStatus(
  user: User | null | undefined,
  franchiseId?: string | null,
): string | undefined {
  if (!user) return undefined;

  const targetFranchiseId = franchiseId ?? user.franchiseId;
  if (
    targetFranchiseId &&
    user.profile?.franchise?.id === targetFranchiseId &&
    user.profile.franchise.status
  ) {
    return user.profile.franchise.status;
  }

  if (user.franchiseStatus) {
    return user.franchiseStatus;
  }

  if (user.profile?.franchise?.status) {
    return user.profile.franchise.status;
  }

  return user.franchises?.find((franchise) => franchise.id === targetFranchiseId)
    ?.status;
}

/**
 * True when the franchise is operational — i.e. has at least one in-force
 * (Valid) agreement. Replaces the old `getEffectiveFranchiseStatus(...) === "Active"`
 * checks now that operational standing is derived from agreements rather than a
 * stored franchise status. Prefers the loaded profile; falls back to the slim
 * persisted flag (available before the profile finishes loading).
 */
export function isFranchiseOperational(
  user: User | null | undefined,
  franchiseId?: string | null,
): boolean {
  if (!user) return false;
  const targetFranchiseId = franchiseId ?? user.franchiseId;
  const franchise = user.profile?.franchise;
  if (
    franchise &&
    (targetFranchiseId == null || franchise.id === targetFranchiseId)
  ) {
    if (typeof franchise.isOperational === "boolean") {
      return franchise.isOperational;
    }
    if (typeof franchise.validAgreementsCount === "number") {
      return franchise.validAgreementsCount > 0;
    }
  }
  if (targetFranchiseId == null || targetFranchiseId === user.franchiseId) {
    return user.isOperational === true;
  }
  return false;
}

/** Minimal identity blob stored in localStorage — no PII, no profile. */
export interface StoredIdentity {
  id: string;
  role: UserRole;
  name: string;
  franchiseStatus?: string;
  isOperational?: boolean;
  franchiseId?: string;
  franchiseName?: string;
}

/** Write-only: persist slim identity without any profile/PII fields. */
export function slimIdentity(user: User): StoredIdentity {
  return {
    id: user.id,
    role: user.role,
    name: user.name,
    franchiseStatus: user.franchiseStatus,
    isOperational: user.isOperational,
    franchiseId: user.franchiseId,
    franchiseName: user.franchiseName,
  };
}

/** Read from localStorage; returns null if missing, invalid, or wrong shape. */
export function getStoredIdentity(): StoredIdentity | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("user");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredIdentity>;
    if (!parsed.id || !parsed.role || !parsed.name) return null;
    return {
      id: parsed.id,
      role: parsed.role,
      name: parsed.name,
      franchiseStatus: parsed.franchiseStatus,
      isOperational: parsed.isOperational,
      franchiseId: parsed.franchiseId,
      franchiseName: parsed.franchiseName,
    };
  } catch {
    return null;
  }
}

/**
 * @deprecated The localStorage "user" blob no longer stores the full profile (P0-2).
 * Call sites reading profile, franchiseId, or other fields will get undefined.
 * Use `getStoredIdentity()` for auth state, or `UserContext` for full user data.
 */
export function getUserFromStorage(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

