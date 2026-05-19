"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type User } from "../lib/auth";
import {
  switchFranchise as apiSwitchFranchise,
  getFranchiseeProfile,
} from "../services/auth.service";
import { getEffectiveFranchiseStatus } from "../lib/auth";
import { queryKeys } from "@/hooks/api/query-keys";

interface UserContextType {
  user: User | null;
  loading: boolean;
  setUser: (user: User | ((prev: User | null) => User | null)) => void;
  switchFranchise: (franchiseId: string) => Promise<void>;
}

export const UserContext = createContext<UserContextType | null>(null);

function normalizeFranchiseeProfile(
  profileData: Record<string, unknown>,
): NonNullable<User["profile"]> {
  const base = profileData as NonNullable<User["profile"]>;
  const p = profileData as {
    franchise?: {
      city?: string;
      state?: string;
      pincode?: string;
      address?: string;
    };
    city?: string;
    state?: string;
    pincode?: string;
    address?: string;
  };
  return {
    ...base,
    city: p.franchise?.city ?? p.city ?? base.city,
    state: p.franchise?.state ?? p.state ?? base.state,
    pincode: p.franchise?.pincode ?? p.pincode ?? base.pincode,
    address: p.franchise?.address ?? p.address ?? base.address,
  };
}

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const storedUser = localStorage.getItem("user");
      if (!storedUser || storedUser === "{}") {
        setLoading(false);
        return;
      }

      try {
        setUserState(JSON.parse(storedUser) as User);
      } catch {
        localStorage.removeItem("user");
      }
      setLoading(false);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const setUserWithStorage = useCallback(
    (next: User | ((prev: User | null) => User | null)) => {
      if (typeof next === "function") {
        setUserState((prev) => {
          const updated = next(prev);
          if (typeof window !== "undefined" && updated) {
            localStorage.setItem("user", JSON.stringify(updated));
          }
          return updated;
        });
      } else {
        setUserState(next);
        if (typeof window !== "undefined") {
          localStorage.setItem("user", JSON.stringify(next));
        }
      }
    },
    [],
  );

  const switchFranchise = async (franchiseId: string) => {
    if (!user) return;
    const data = await apiSwitchFranchise(franchiseId);
    let profileData: Record<string, unknown> | null = null;
    try {
      const profileResponse = await getFranchiseeProfile();
      const raw =
        (profileResponse as { result?: Record<string, unknown> }).result ??
        (profileResponse as unknown as Record<string, unknown>);
      profileData = raw && typeof raw === "object" ? raw : null;
    } catch {
      // Profile fetch may fail for Pending franchises
    }
    const fetchedProfile = profileData
      ? normalizeFranchiseeProfile(profileData)
      : null;
    setUserWithStorage((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        franchiseId: data.franchiseId,
        franchiseName: data.franchiseName,
        franchiseStatus: data.franchiseStatus,
        franchises: data.franchises,
        profile: fetchedProfile ?? prev.profile,
      };
    });
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["agreements"] }),
      queryClient.invalidateQueries({ queryKey: ["franchisee-ci-agreements"] }),
      queryClient.invalidateQueries({ queryKey: ["franchisee-ci-agreement-detail"] }),
      queryClient.invalidateQueries({ queryKey: ["orders"] }),
      queryClient.invalidateQueries({ queryKey: ["orders-franchisee"] }),
      queryClient.invalidateQueries({ queryKey: ["students"] }),
      queryClient.invalidateQueries({ queryKey: ["certification"] }),
      queryClient.invalidateQueries({ queryKey: ["course-instructors"] }),
      queryClient.invalidateQueries({ queryKey: ["payments"] }),
      queryClient.invalidateQueries({ queryKey: ["program-requests"] }),
      queryClient.invalidateQueries({ queryKey: ["franchisee"] }),
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.franchiseeProfile() }),
    ]);
  };

  const profileQuery = useQuery({
    queryKey: queryKeys.auth.franchiseeProfile(user?.franchiseId),
    queryFn: async () => {
      const res = await getFranchiseeProfile();
      const raw =
        (res as { result?: Record<string, unknown> }).result ??
        (res as unknown as Record<string, unknown>);
      if (!raw || typeof raw !== "object") {
        throw new Error("Invalid profile response");
      }
      return raw as Record<string, unknown>;
    },
    enabled:
      typeof window !== "undefined" &&
      !!user &&
      user.role === "franchisee" &&
      !!user.franchiseId,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!profileQuery.isSuccess || !profileQuery.data) return;

    const timeoutId = window.setTimeout(() => {
      setUserState((prev) => {
        if (!prev || prev.role !== "franchisee" || !prev.franchiseId) {
          return prev;
        }
        const profile = normalizeFranchiseeProfile(profileQuery.data!);
        const franchiseStatus =
          profile.franchise?.status ??
          getEffectiveFranchiseStatus(prev, prev.franchiseId);
        const franchiseName = profile.franchise?.name ?? prev.franchiseName;
        const franchises = prev.franchises?.map((franchise) =>
          franchise.id === (profile.franchise?.id ?? prev.franchiseId)
            ? {
                ...franchise,
                name: franchiseName ?? franchise.name,
                status: franchiseStatus ?? franchise.status,
              }
            : franchise,
        );
        const sameId = prev.profile?.id === profile.id;
        const sameFranchiseUpdated =
          prev.profile?.franchise?.updatedAt === profile.franchise?.updatedAt;
        const sameStatus = prev.franchiseStatus === franchiseStatus;
        const sameName = prev.franchiseName === franchiseName;
        if (
          sameId &&
          sameFranchiseUpdated &&
          sameStatus &&
          sameName &&
          prev.profile != null
        ) {
          return prev;
        }
        const next: User = {
          ...prev,
          franchiseStatus,
          franchiseName,
          franchises,
          profile,
        };
        localStorage.setItem("user", JSON.stringify(next));
        return next;
      });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [
    profileQuery.isSuccess,
    profileQuery.data,
    profileQuery.dataUpdatedAt,
  ]);

  return (
    <UserContext.Provider
      value={{ user, loading, setUser: setUserWithStorage, switchFranchise }}
    >
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
