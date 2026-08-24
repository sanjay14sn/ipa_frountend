import { Suspense } from "react";

import { CompetitionMappingSection } from "@/components/competitions/competition-mapping-section";
import { PageSkeleton } from "@/components/shared";

export default function AdminCompetitionMappingPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <div className="p-6">
        <CompetitionMappingSection />
      </div>
    </Suspense>
  );
}
