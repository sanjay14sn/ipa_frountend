export type UserRole = "admin" | "franchisee" | "franchise";

export interface User {
  id: string;
  name: string;
  role: UserRole;
  franchiseId?: string;
  franchiseName?: string;
  franchiseStatus?: string;
  mail?: string;
  phone?: string;
  adminRole?: "super" | "staff";
  state?: string | null;
  franchises?: Array<{ id: string; name: string; status: string }>;
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
    franchise?: {
      id: string;
      name: string;
      type: string;
      status: string;
      programId: number;
      franchiseeId: number;
      approvedBy: number;
      approvedAt: string;
      createdAt: string;
      updatedAt: string;
      city?: string;
      address?: string;
      franchisePrograms?: Array<{
        program: {
          id: number;
          name: string;
        };
      }>;
      franchisePayrolls?: Array<{
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
        totalAmount: number;
        createdBy: number;
        updatedBy: number;
        franchiseProgram: {
          id: number;
          program: {
            id: number;
            name: string;
          };
        };
      }>;
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
        totalAmount: number;
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

export const USERS = {
  admin: {
    id: "admin-1",
    password: "admin123",
    name: "Admin User",
    role: "admin" as UserRole,
  },
  franchise: {
    id: "franchise-1",
    password: "franchise123",
    name: "Franchise Owner",
    role: "franchise" as UserRole,
    franchiseId: "1",
    franchiseName: "Abacus 1",
    franchiseStatus: "Active",
  },
};

export function createFranchiseUser(franchiseData: any): User {
  return {
    id: franchiseData.id,
    name: franchiseData.contactPerson || franchiseData.name,
    role: "franchise" as UserRole,
    franchiseId: franchiseData.id,
    franchiseName: franchiseData.name,
    franchiseStatus: franchiseData.franchiseStatus || "Pending",
  };
}

export function saveUserToStorage(userId: number) {
  if (typeof window !== "undefined") {
    localStorage.setItem("userId", userId.toString());
  }
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

export function removeUserFromStorage() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("userId");
  }
}
