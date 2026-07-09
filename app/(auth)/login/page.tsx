"use client";

import { Suspense, useState } from "react";
import { LoginCard } from "./components/LoginCard";
import { FranchiseApplicationModal } from "@/components/franchise-application-modal";

export default function Page() {
  const [franchiseModalOpen, setFranchiseModalOpen] = useState(false);

  return (
    <>

      {/* Suspense boundary: LoginCard reads useSearchParams() for ?next=. */}
      <Suspense fallback={null}>
        <LoginCard onStartApplication={() => setFranchiseModalOpen(true)} />
      </Suspense>

      <FranchiseApplicationModal
        open={franchiseModalOpen}
        onOpenChange={setFranchiseModalOpen}
      />
    </>
  );
}
