export type UserRole = "admin" | "franchise";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  franchiseId?: string;
  franchiseName?: string;
  // Franchise onboarding status
  agreementAccepted?: boolean;
  paymentCompleted?: boolean;
  onboardingCompleted?: boolean;
}

export const USERS = {
  admin: {
    id: "admin-1",
    email: "admin@abacus.com",
    password: "admin123",
    name: "Admin User",
    role: "admin" as UserRole,
  },
  franchise: {
    id: "franchise-1",
    email: "franchise@abacus.com",
    password: "franchise123",
    name: "Franchise Owner",
    role: "franchise" as UserRole,
    franchiseId: "1",
    franchiseName: "Abacus 1",
    // Demo user is already onboarded
    agreementAccepted: false,
    paymentCompleted: false,
    onboardingCompleted: false,
  },
};

export async function authenticateUser(
  email: string,
  password: string
): Promise<User | null> {
  if (email === USERS.admin.email && password === USERS.admin.password) {
    const { password: _, ...user } = USERS.admin;
    return user;
  }

  if (
    email === USERS.franchise.email &&
    password === USERS.franchise.password
  ) {
    const { password: _, ...user } = USERS.franchise;
    return user;
  }

  // For dynamically created franchise users, we'll need to check via API endpoint
  // This will be handled in the API route itself
  return null;
}

// Helper function to create franchise user object
export function createFranchiseUser(franchiseData: any): User {
  return {
    id: franchiseData.id,
    email: franchiseData.email || franchiseData.loginEmail,
    name: franchiseData.contactPerson || franchiseData.name,
    role: "franchise" as UserRole,
    franchiseId: franchiseData.id,
    franchiseName: franchiseData.name,
    // Check onboarding status - for new franchises, these should be false
    agreementAccepted: franchiseData.agreementAccepted || false,
    paymentCompleted: franchiseData.paymentCompleted || false,
    onboardingCompleted: franchiseData.onboardingCompleted || false,
  };
}

export function saveUserToStorage(user: User) {
  if (typeof window !== "undefined") {
    localStorage.setItem("user", JSON.stringify(user));
  }
}

export function getUserFromStorage(): User | null {
  if (typeof window !== "undefined") {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  }
  return null;
}

export function removeUserFromStorage() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("user");
  }
}
