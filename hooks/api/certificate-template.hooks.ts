"use client";

import { useQuery } from "@tanstack/react-query";
import {
  listCertificateTemplates,
  type CertificateTemplate,
} from "@/services/program.service";
import { getCertificateTemplatesForLevel } from "@/services/certificate-template-level.service";
import { queryKeys } from "@/hooks/api/query-keys";
import { getQueryClientBridge } from "@/hooks/api/query-client-bridge";

/**
 * Reference-data queries that almost never change. Infinite stale-time means
 * React Query never considers the data stale on its own; 30-minute GC time
 * keeps it in memory for a full working session without leaking indefinitely.
 */
const STATIC_REFERENCE_OPTIONS = {
  staleTime: Number.POSITIVE_INFINITY,
  gcTime: 30 * 60 * 1000,
  refetchOnWindowFocus: false,
} as const;

export function useCertificateTemplatesForProgram(
  programId: number | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.certificateTemplates.forProgram(programId ?? 0),
    queryFn: () => listCertificateTemplates(programId!),
    enabled: enabled && programId != null && programId > 0,
    ...STATIC_REFERENCE_OPTIONS,
  });
}

export function useCertificateTemplatesForLevel(
  levelId: number | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.certificateTemplates.forLevel(levelId ?? 0),
    queryFn: () => getCertificateTemplatesForLevel(levelId!),
    enabled: enabled && levelId != null && levelId > 0,
    ...STATIC_REFERENCE_OPTIONS,
  });
}

export async function invalidateLevelCertificates(levelId: number) {
  try {
    await getQueryClientBridge().invalidateQueries({
      queryKey: queryKeys.certificateTemplates.forLevel(levelId),
    });
  } catch {
    /* ignore */
  }
}

export type { CertificateTemplate };
