"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import { LoginCard } from "./components/LoginCard";
import { FranchiseApplicationModal } from "@/components/franchise-application-modal";

export default function Page() {
  const [franchiseModalOpen, setFranchiseModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 gap-6">
      <Image
        src="/brand/ipa-lockup.png"
        alt="Ideal Play Abacus"
        width={433}
        height={66}
        priority
      />

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
