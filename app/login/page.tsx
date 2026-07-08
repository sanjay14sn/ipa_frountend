"use client";

import { Suspense, useState } from "react";
import { LoginCard } from "./components/LoginCard";
import { FranchiseApplicationModal } from "@/components/franchise-application-modal";

export default function Page() {
  const [franchiseModalOpen, setFranchiseModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 gap-6">
      <div className="text-center">
        <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-primary">
          Abacus Academy
        </span>
      </div>

      {/* Suspense boundary: LoginCard reads useSearchParams() for ?next=. */}
      <Suspense fallback={null}>
        <LoginCard onStartApplication={() => setFranchiseModalOpen(true)} />
      </Suspense>

      <FranchiseApplicationModal
        open={franchiseModalOpen}
        onOpenChange={setFranchiseModalOpen}
      />
    </div>
  );
}
