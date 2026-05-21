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
import { useScopeStore } from "@/lib/stores/scope-store";

interface UserContextType {
  user: User | null;
  loading: boolean;
  setUser: (user: User | ((prev: User | null) => User | null)) => void;
  switchFranchise: (franchiseId: string) => Promise<void>;
  /**
   * Switch the currently active program scope (agreementId) for the active
   * franchise. Mirrors `switchFranchise`:
   *   - Updates the persisted `user` blob in localStorage
   *   - Invalidates program-scoped queries so dependent lists refetch
   * Pass `null` to clear the selection (e.g. franchise was switched).
   */
  switchAgreement: (agreementId: number | null) => Promise<void>;
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
        // One-shot migration: if the scope store hasn't picked up the
        // legacy `user.activeAgreementId` yet (first load after upgrade,
        // or a different browser), pull it in so we don't lose the
        // selection mid-rollout.
        useScopeStore.getState().hydrateFromUserBlob();
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
          if (typeof window !== "undefined") {
            if (updated) {
              localStorage.setItem("user", JSON.stringify(updated));
            } else {
              localStorage.removeItem("user");
            }
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
        // Program scope is franchise-specific — clear the previous selection
        // on every franchise switch. The AgreementProvider auto-hydrates the
        // newest agreement for the new franchise once its feed loads.
        activeAgreementId: null,
        profile: fetchedProfile ?? prev.profile,
      };
    });
    // Mirror into the scope store so service calls re-pick up the new
    // franchise immediately (and clear programId — useScopeAgreements
    // auto-pins the newest one on the next render).
    useScopeStore.getState().setFranchise(data.franchiseId ?? null);
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
      queryClient.invalidateQueries({ queryKey: ["franchises"] }),
      queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      queryClient.invalidateQueries({ queryKey: ["streams"] }),
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.franchiseeProfile() }),
    ]);
  };

  /**
   * Program-scope switch — pure client-side state change (no backend session
   * call, unlike `switchFranchise`). Persists the new selection in the user
   * blob and invalidates every program-scoped query so list pages refetch.
   *
   * This is the ONLY supported mechanism for changing the active program;
   * the AgreementSwitcher delegates here so the user blob in localStorage
   * always reflects the current selection.
   */
  const switchAgreement = useCallback(
    async (agreementId: number | null) => {
      let resolvedProgramId: number | null = null;
      setUserState((prev) => {
        if (!prev) return prev;
        if ((prev.activeAgreementId ?? null) === agreementId) {
          const matched = prev.profile?.franchise?.activePrograms?.find(
            (row) => row.id === agreementId,
          );
          resolvedProgramId = matched?.programId ?? null;
          return prev;
        }
        const matched = prev.profile?.franchise?.activePrograms?.find(
          (row) => row.id === agreementId,
        );
        resolvedProgramId = matched?.programId ?? null;
        const next = { ...prev, activeAgreementId: agreementId };
        if (typeof window !== "undefined") {
          localStorage.setItem("user", JSON.stringify(next));
        }
        return next;
      });
      // Mirror to the scope store so franchise services pick up programId
      // without going through props/context.
      useScopeStore.getState().setAgreement(agreementId, resolvedProgramId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["students"] }),
        queryClient.invalidateQueries({ queryKey: ["course-instructors"] }),
        queryClient.invalidateQueries({ queryKey: ["orders-franchisee"] }),
        queryClient.invalidateQueries({ queryKey: ["orders"] }),
        queryClient.invalidateQueries({ queryKey: ["payments"] }),
        queryClient.invalidateQueries({ queryKey: ["certification"] }),
        queryClient.invalidateQueries({ queryKey: ["agreements"] }),
        queryClient.invalidateQueries({ queryKey: ["program-requests"] }),
        queryClient.invalidateQueries({ queryKey: ["streams"] }),
      ]);
    },
    [queryClient],
  );

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
        // Also gate on franchiseeSignature: without this, a stale localStorage
        // snapshot from before the signature was uploaded would survive the
        // refresh, and downstream sheets keep prompting for re-upload.
        const sameSignature =
          (prev.profile?.franchiseeSignature ?? null) ===
          (profile.franchiseeSignature ?? null);
        // Also gate on the agreement-switcher feed: when admin approves a
        // new program (or the franchisee signs/pays), `activePrograms`
        // changes but `franchise.updatedAt` doesn't, and the skip path
        // would silently keep stale state in localStorage — the switcher
        // would never see the new program until logout/login.
        const prevPrograms = prev.profile?.franchise?.activePrograms ?? [];
        const nextPrograms = profile.franchise?.activePrograms ?? [];
        const sameActivePrograms =
          prevPrograms.length === nextPrograms.length &&
          prevPrograms.every((row, i) => {
            const other = nextPrograms[i];
            if (!other) return false;
            return (
              row.id === other.id &&
              row.status === other.status &&
              row.signed === other.signed
            );
          });
        if (
          sameId &&
          sameFranchiseUpdated &&
          sameStatus &&
          sameName &&
          sameSignature &&
          sameActivePrograms &&
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
      value={{
        user,
        loading,
        setUser: setUserWithStorage,
        switchFranchise,
        switchAgreement,
      }}
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
