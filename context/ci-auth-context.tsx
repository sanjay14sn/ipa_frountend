"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { CIUser, getCIMe } from "@/services/ci-auth.service";
import { getCIAgreement, CIAgreementPhase } from "@/services/ci-training.service";

interface CIAuthContextValue {
  user: CIUser | null;
  loading: boolean;
  agreementPhase: CIAgreementPhase | null;
  refresh: () => Promise<void>;
  clear: () => void;
}

const CIAuthContext = createContext<CIAuthContextValue>({
  user: null,
  loading: true,
  agreementPhase: null,
  refresh: async () => {},
  clear: () => {},
});

export function CIAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CIUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [agreementPhase, setAgreementPhase] = useState<CIAgreementPhase | null>(null);

  const refresh = useCallback(async () => {
    try {
      const me = await getCIMe();
      setUser(me);
      const agreement = await getCIAgreement().catch(() => null);
      setAgreementPhase(agreement?.phase ?? null);
    } catch {
      setUser(null);
      setAgreementPhase(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setUser(null);
    setAgreementPhase(null);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <CIAuthContext.Provider value={{ user, loading, agreementPhase, refresh, clear }}>
      {children}
    </CIAuthContext.Provider>
  );
}

export function useCIAuth() {
  return useContext(CIAuthContext);
}
