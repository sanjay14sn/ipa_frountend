"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getUserFromStorage } from "@/lib/auth";

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

      hydrateFromUserBlob: () => {
        const user = getUserFromStorage();
        if (!user) return;

        const nextFranchiseId = user.franchiseId ?? null;
        const legacyAgreementId = user.activeAgreementId ?? null;
        const activePrograms = user.profile?.franchise?.activePrograms ?? [];

        const matchingProgram =
          legacyAgreementId != null
            ? activePrograms.find((row) => row.id === legacyAgreementId)
            : undefined;

        const nextProgramId = matchingProgram?.programId ?? null;
        const current = get();

        if (
          current.franchiseId === nextFranchiseId &&
          current.agreementId === legacyAgreementId &&
          current.programId === nextProgramId
        ) {
          return;
        }

        set({
          franchiseId: nextFranchiseId,
          agreementId: legacyAgreementId,
          programId: nextProgramId,
        });
      },
    }),
    {
      name: "ipa-scope",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? window.localStorage
          : (undefined as unknown as Storage),
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
