"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type ScopeState = {
  franchiseId: string | null;
  agreementId: number | null;
  programId: number | null;
};

type ScopeActions = {
  setAgreement: (agreementId: number | null, programId: number | null) => void;
  setFranchise: (franchiseId: string | null) => void;
  clear: () => void;
  hydrateFromUserBlob: () => void;
};

const noopStorage: Storage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
  key: () => null,
  length: 0,
};

const initialState: ScopeState = {
  franchiseId: null,
  agreementId: null,
  programId: null,
};

export const useScopeStore = create<ScopeState & ScopeActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      setAgreement: (agreementId, programId) => {
        if (
          get().agreementId === agreementId &&
          get().programId === programId
        ) {
          return;
        }
        set({ agreementId, programId });
      },

      setFranchise: (franchiseId) => {
        if (get().franchiseId === franchiseId) return;
        set({ franchiseId, agreementId: null, programId: null });
      },

      clear: () => set({ ...initialState }),

      /**
       * @deprecated P0-2: localStorage no longer stores profile or
       * activeAgreementId — this function is a no-op. Scope hydration now
       * happens inside UserContext once the profile API response resolves.
       * Kept as a stub so any lingering call sites don't throw at runtime.
       */
      hydrateFromUserBlob: () => {
        // No-op: the slim localStorage blob contains only id/role/name/
        // franchiseStatus. Scope is hydrated by UserContext after the profile
        // query succeeds. See context/user-context.tsx setUserWithStorage.
      },
    }),
    {
      name: "ipa-scope",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : noopStorage
      ),
      partialize: (state) => ({
        franchiseId: state.franchiseId,
        agreementId: state.agreementId,
        programId: state.programId,
      }),
    },
  ),
);

export const getScope = (): ScopeState => {
  const { franchiseId, agreementId, programId } = useScopeStore.getState();
  return { franchiseId, agreementId, programId };
};
