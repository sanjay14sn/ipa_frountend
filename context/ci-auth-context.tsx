"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { CIUser, getCIMe } from "@/services/ci-auth.service";
import {
  countPendingCISignatures,
  deriveCIGatePhase,
  listMyCIAgreements,
  type CIAgreementPhase,
} from "@/services/contracting.service";

interface CIAuthContextValue {
  user: CIUser | null;
  loading: boolean;
  /**
   * Gate phase derived over ALL the CI's agreements (multi-franchise): SIGNED
   * once any agreement is executed — identical to the old single-agreement
   * phase when only one exists (deriveCIGatePhase is unit-tested for parity).
   */
  agreementPhase: CIAgreementPhase | null;
  /** Agreements still awaiting the CI's own signature (nav/dashboard badges). */
  pendingAgreementCount: number;
  refresh: () => Promise<void>;
  clear: () => void;
}

const CIAuthContext = createContext<CIAuthContextValue>({
  user: null,
  loading: true,
  agreementPhase: null,
  pendingAgreementCount: 0,
  refresh: async () => {},
  clear: () => {},
});

export function CIAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CIUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [agreementPhase, setAgreementPhase] = useState<CIAgreementPhase | null>(null);
  const [pendingAgreementCount, setPendingAgreementCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const me = await getCIMe();
      setUser(me);
      const agreements = await listMyCIAgreements().catch(
        () => [] as Awaited<ReturnType<typeof listMyCIAgreements>>,
      );
      setAgreementPhase(deriveCIGatePhase(agreements));
      setPendingAgreementCount(countPendingCISignatures(agreements));
    } catch {
      setUser(null);
      setAgreementPhase(null);
      setPendingAgreementCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setUser(null);
    setAgreementPhase(null);
    setPendingAgreementCount(0);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const ciContextValue = useMemo(
    () => ({ user, loading, agreementPhase, pendingAgreementCount, refresh, clear }),
    [user, loading, agreementPhase, pendingAgreementCount, refresh, clear],
  );

  return (
    <CIAuthContext.Provider value={ciContextValue}>
      {children}
    </CIAuthContext.Provider>
  );
}

export function useCIAuth() {
  return useContext(CIAuthContext);
}
