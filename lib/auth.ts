export type UserRole = "admin" | "franchise";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  franchiseId?: string;
  franchiseName?: string;
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

  return null;
}

export function getUserFromStorage(): User | null {
  if (typeof window === "undefined") return null;

  const userData = localStorage.getItem("user");
  return userData ? JSON.parse(userData) : null;
}

export function saveUserToStorage(user: User): void {
  if (typeof window === "undefined") return;

  localStorage.setItem("user", JSON.stringify(user));
}

export function removeUserFromStorage(): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem("user");
}
