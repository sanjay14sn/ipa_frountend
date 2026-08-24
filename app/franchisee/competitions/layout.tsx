"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const TAB_REDIRECTS: Record<string, string> = {
  all: "/franchisee/competitions",
  certifications: "/franchisee/competitions/certifications",
};

function LegacyCompetitionsTabRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (!tab) return;
    const destination = TAB_REDIRECTS[tab];
    if (destination) router.replace(destination);
  }, [router, searchParams]);

  return null;
}

export default function FranchiseeCompetitionsLayout({
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
