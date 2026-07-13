"use client";

import { PageTabs, TabsContent } from "@/components/shared/page-tabs";
import { useTabFromUrl } from "@/hooks/use-tab-from-url";
import { ReceivablesSection } from "./_components/receivables-section";
import { ProgressSection } from "./_components/progress-section";
import { UpcomingSection } from "./_components/upcoming-section";

const TABS = ["receivables", "progress", "upcoming"] as const;

/**
 * CI-01: the training hub — one tabbed page replacing the three sibling
 * routes. Receivables is the default tab: it carries the sequential-unlock
 * Pay CTA, the portal's actionable surface.
 */
export default function CITrainingHubPage() {
  const [tab, setTab] = useTabFromUrl("receivables", TABS);

  return (
    <PageTabs
      title="Training"
      description="Receivables, level progress, and upcoming sessions."
      tabs={[
        { value: "receivables", label: "Receivables" },
        { value: "progress", label: "Progress" },
        { value: "upcoming", label: "Upcoming" },
      ]}
      value={tab}
      onValueChange={setTab}
    >
      <TabsContent value="receivables" className="mt-0">
        <ReceivablesSection />
      </TabsContent>
      <TabsContent value="progress" className="mt-0">
        <ProgressSection />
      </TabsContent>
      <TabsContent value="upcoming" className="mt-0">
        <UpcomingSection />
      </TabsContent>
    </PageTabs>
  );
}
