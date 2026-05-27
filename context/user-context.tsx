"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type User, slimIdentity, getStoredIdentity } from "../lib/auth";
import {
  switchFranchise as apiSwitchFranchise,
  getFranchiseeProfile,
  getAdminProfile,
} from "../services/auth.service";
import { getEffectiveFranchiseStatus } from "../lib/auth";
import { queryKeys } from "@/hooks/api/query-keys";
import { useScopeStore } from "@/lib/stores/scope-store";
import { toast } from "sonner";
import { isAxiosError } from "axios";

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
  // Subscribing here so the auto-pin effect below re-runs when the scope
  // store changes (e.g. the user just logged in, the persisted store cleared,
  // or another tab cleared it).
  const scopeAgreementId = useScopeStore((s) => s.agreementId);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const identity = getStoredIdentity();
      if (!identity) {
        setLoading(false);
        return;
      }
      // Set slim identity immediately so queries can fire (role/franchiseId available).
      // Keep loading=true — profile fetch below will complete the hydration.
      setUserState(identity as User);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const setUserWithStorage = useCallback(
    (next: User | ((prev: User | null) => User | null)) => {
      const applyScopeFromUser = (u: User | null) => {
        // Keep the scope store in lockstep with the user blob — call sites
        // like LoginCard.setUser(nextUser) need programId set in the same
        // synchronous batch as the user state so the first React Query
        // refetch already carries it.
        if (!u) {
          useScopeStore.getState().clear();
          return;
        }
        const candidates = (u.profile?.franchise?.activePrograms ?? []).filter(
          (row) => row.type !== "CI_AGREEMENT" && row.id != null,
        );
        if (candidates.length === 0) {
          useScopeStore.getState().setFranchise(u.franchiseId ?? null);
          return;
        }
        const stored = useScopeStore.getState();
        const existing =
          stored.agreementId != null
            ? candidates.find((row) => row.id === stored.agreementId)
            : undefined;
        const picked = existing ?? candidates[0];
        useScopeStore.setState({
          franchiseId: u.franchiseId ?? null,
          agreementId: picked.id,
          programId: picked.programId ?? null,
        });
      };

      if (typeof next === "function") {
        setUserState((prev) => {
          const updated = next(prev);
          if (typeof window !== "undefined") {
            if (updated) {
              localStorage.setItem("user", JSON.stringify(slimIdentity(updated)));
            } else {
              localStorage.removeItem("user");
            }
          }
          applyScopeFromUser(updated);
          return updated;
        });
      } else {
        setUserState(next);
        if (typeof window !== "undefined") {
          localStorage.setItem("user", JSON.stringify(slimIdentity(next)));
        }
        applyScopeFromUser(next);
      }
    },
    [],
  );

  const switchFranchise = async (franchiseId: string) => {
    if (!user) return;
    // Backend session switch — throws on genuine failure (5xx, network error).
    const data = await apiSwitchFranchise(franchiseId);

    let profileData: Record<string, unknown> | null = null;
    try {
      const profileResponse = await getFranchiseeProfile();
      const raw =
        (profileResponse as { result?: Record<string, unknown> }).result ??
        (profileResponse as unknown as Record<string, unknown>);
      profileData = raw && typeof raw === "object" ? raw : null;
    } catch (profileErr) {
      // 403 is expected for Pending franchises — they can't fetch their full
      // profile until the agreement is signed. Any other error (5xx, network)
      // means something went wrong; surface it without blocking the switch.
      const status = isAxiosError(profileErr)
        ? profileErr.response?.status
        : undefined;
      if (status !== 403) {
        toast.error(
          "Switched franchise successfully, but your profile could not be refreshed. " +
            "Try reloading if data looks stale.",
        );
      }
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
        // here so applyScopeFromUser (called inside setUserWithStorage) picks
        // the first agreement of the NEW franchise rather than re-using the
        // stale selection.
        activeAgreementId: null,
        profile: fetchedProfile ?? prev.profile,
      };
    });
    // Cache from the previous franchise is stale (different programId
    // namespace, different franchise rows). Drop the whole cache so React
    // Query doesn't hand stale data back to the new scope on the first
    // render — replaces the per-key invalidation that used to live here.
    queryClient.clear();
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
          localStorage.setItem("user", JSON.stringify(slimIdentity(next)));
        }
        return next;
      });
      // Mirror to the scope store so franchise services pick up programId
      // without going through props/context. Query keys now include
      // programId — the change triggers refetches automatically; no manual
      // invalidation block needed.
      useScopeStore.getState().setAgreement(agreementId, resolvedProgramId);
    },
    [],
  );

  const profileQuery = useQuery({
    queryKey: queryKeys.auth.franchiseeProfile(),
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
      (user.role === "franchisee" || user.role === "franchise"),
    staleTime: 60_000,
  });

  // Global auto-pin: ensure the scope store always reflects a valid agreement
  // for the active franchisee, even when the AgreementSwitcher (which has its
  // own copy of this effect via useScopeAgreements) isn't rendered. This is
  // critical for single-agreement franchisees — the switcher hides for them,
  // so without this effect their programId would stay null and the backend
  // would return all data unscoped.
  useEffect(() => {
    if (!user || user.role !== "franchisee" || !user.franchiseId) return;
    if (user.franchiseStatus !== "Active") return;
    const activePrograms = user.profile?.franchise?.activePrograms ?? [];
    const candidates = activePrograms.filter(
      (row) => row.type !== "CI_AGREEMENT" && row.id != null,
    );
    if (candidates.length === 0) return;
    const stillValid =
      scopeAgreementId != null &&
      candidates.some((row) => row.id === scopeAgreementId);
    if (stillValid) return;
    const pick = candidates[0];
    useScopeStore
      .getState()
      .setAgreement(pick.id, pick.programId ?? null);
  }, [
    user,
    scopeAgreementId,
  ]);

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
        localStorage.setItem("user", JSON.stringify(slimIdentity(next)));
        return next;
      });
      setLoading(false);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [
    profileQuery.isSuccess,
    profileQuery.data,
    profileQuery.dataUpdatedAt,
  ]);

  const adminProfileQuery = useQuery({
    queryKey: queryKeys.auth.adminProfile(),
    queryFn: async () => {
      const res = await getAdminProfile();
      return res;
    },
    enabled:
      typeof window !== "undefined" &&
      !!user &&
      user.role === "admin",
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!adminProfileQuery.isSuccess || !adminProfileQuery.data) return;
    const data = adminProfileQuery.data;
    setUserState((prev) => {
      if (!prev || prev.role !== "admin") return prev;
      return {
        ...prev,
        mail: data.emailId,
        adminRole: data.role,
        state: data.state ?? prev.state,
      };
    });
    setLoading(false);
  }, [adminProfileQuery.isSuccess, adminProfileQuery.data]);

  useEffect(() => {
    if (profileQuery.isError || adminProfileQuery.isError) {
      setLoading(false);
    }
  }, [profileQuery.isError, adminProfileQuery.isError]);

  const contextValue = useMemo(
    () => ({
      user,
      loading,
      setUser: setUserWithStorage,
      switchFranchise,
      switchAgreement,
    }),
    [user, loading, setUserWithStorage, switchFranchise, switchAgreement],
  );

  return (
    <UserContext.Provider value={contextValue}>
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
