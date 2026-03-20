"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { type User } from "../lib/auth";
import { switchFranchise as apiSwitchFranchise, getFranchiseeProfile } from "../services/auth.service";

interface UserContextType {
  user: User | null;
  setUser: (user: User) => void;
  switchFranchise: (franchiseId: string) => Promise<void>;
}

export const UserContext = createContext<UserContextType | null>(null);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  const setUserWithStorage = (user: User) => {
    setUser(user);
    if (typeof window !== "undefined") {
      localStorage.setItem("user", JSON.stringify(user));
    }
  };

  const switchFranchise = async (franchiseId: string) => {
    if (!user) return;
    const data = await apiSwitchFranchise(franchiseId);
    let profileData = null;
    try {
      const profileResponse = await getFranchiseeProfile();
      profileData = profileResponse.result ?? profileResponse;
    } catch {
      // Profile fetch may fail for Pending franchises
    }
    const profile = profileData
      ? {
          ...profileData,
          city: (profileData as any).franchise?.city ?? (profileData as any).city,
          state: (profileData as any).franchise?.state ?? (profileData as any).state,
          pincode: (profileData as any).franchise?.pincode ?? (profileData as any).pincode,
          address: (profileData as any).franchise?.address ?? (profileData as any).address,
        }
      : user.profile;
    const updated: User = {
      ...user,
      franchiseId: data.franchiseId,
      franchiseName: data.franchiseName,
      franchiseStatus: data.franchiseStatus,
      franchises: data.franchises,
      profile,
    };
    setUserWithStorage(updated);
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser && storedUser !== "{}") {
      const user = JSON.parse(storedUser);
      setUser(user);
    }
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser: setUserWithStorage, switchFranchise }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
