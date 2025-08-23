"use client";

import { useState } from "react";
import { PageShell, BrandBar } from "@/components/brand";
import { AbacusHero } from "@/components/abacus-ui";
import { FranchiseApplicationModal } from "@/components/franchise-application-modal";
import { LoginCard } from "./components/LoginCard";
import { FranchiseCTA } from "./components/FranchiseCTA";

export default function Page() {
  const [franchiseModalOpen, setFranchiseModalOpen] = useState(false);

  return (
    <PageShell brand={false} className="bg-brand-white-500">
      <BrandBar label="Abacus Academy — Franchise Portal" />
      <main className="mx-auto w-full max-w-6xl px-4 py-10">
        <AbacusHero ctaPrimary={<></>} ctaSecondary={<></>} />

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div>
            <LoginCard />
          </div>
          <div>
            <FranchiseCTA
              onStartApplication={() => setFranchiseModalOpen(true)}
            />
          </div>
        </div>

        <FranchiseApplicationModal
          open={franchiseModalOpen}
          onOpenChange={setFranchiseModalOpen}
        />
      </main>
    </PageShell>
  );
}
