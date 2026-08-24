import { Suspense } from "react";

import { PracticePaperMappingSection } from "@/components/competitions/practice-paper-mapping-section";
import { PageSkeleton } from "@/components/shared";

export default function AdminPracticePaperMappingPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <div className="p-6">
        <PracticePaperMappingSection />
      </div>
    </Suspense>
  );
}
