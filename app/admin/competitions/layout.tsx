"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const TAB_REDIRECTS: Record<string, string> = {
  all: "/admin/competitions",
  mapping: "/admin/competitions/mapping",
  "practice-paper": "/admin/competitions/practice-paper",
  certifications: "/admin/competitions/certifications",
  pricing: "/admin/competitions/practice-pricing",
  "practice-pricing": "/admin/competitions/practice-pricing",
};

function LegacyCompetitionsTabRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (!tab) return;
    const destination = TAB_REDIRECTS[tab];
    if (!destination) return;
    const paperId = searchParams.get("paperId");
    router.replace(paperId ? `${destination}?paperId=${paperId}` : destination);
  }, [router, searchParams]);

  return null;
}

export default function AdminCompetitionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Suspense fallback={null}>
        <LegacyCompetitionsTabRedirect />
      </Suspense>
      {children}
    </>
  );
}
