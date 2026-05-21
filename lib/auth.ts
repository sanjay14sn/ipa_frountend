export type UserRole = "admin" | "franchisee" | "franchise";

export interface User {
  id: string;
  name: string;
  role: UserRole;
  franchiseId?: string;
  franchiseName?: string;
  franchiseStatus?: string;
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
    franchise?: {
      id: string;
      name: string;
      type: string;
      status: string;
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
       * All non-terminal agreements (Valid + Approved) for this franchise.
       * Post-refactor the agreement switcher is sourced from here instead
       * of a dedicated endpoint — one round-trip via the profile fetch.
       */
      activePrograms?: Array<{
        id: number;
        type: string;
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

/** Full user object persisted by `context/user-context` */
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

