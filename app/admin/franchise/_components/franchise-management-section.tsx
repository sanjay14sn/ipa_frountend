"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import FranchiseTable from "./FranchiseTable";
import { CreateFranchiseDialog } from "./CreateFranchiseDialog";
import { getAllPrograms, Program } from "@/services/program.service";
import { toast } from "sonner";
import { TablePageShell, TableSectionSurface } from "@/components/shared";
import { Building2 } from "lucide-react";
import { sendClientLog } from "@/lib/client-telemetry";

export function FranchiseManagementSection() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [programsLoaded, setProgramsLoaded] = useState(false);

  const ensureProgramsLoaded = async () => {
    if (programsLoaded) return;
    try {
      const programsData = await getAllPrograms();
      setPrograms(programsData);
      setProgramsLoaded(true);
    } catch (error) {
      sendClientLog({ level: "error", event: "programs-load-error", message: "Error fetching programs", context: { error } });
      toast.error("Failed to load programs");
    }
  };

  const triggerRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <TablePageShell embed>
      {/* R6: the hub owns the page header; this section renders toolbar + content only. */}
      <div className="flex justify-end">
        <Button
          data-tour="onboard-franchise"
          onClick={async () => {
            await ensureProgramsLoaded();
            setIsCreateDialogOpen(true);
          }}
          title="Record a franchise that already operates — distinct from approving a new application"
        >
          <Building2 className="h-4 w-4" />
          Onboard existing franchise
        </Button>
      </div>

      {/* Create Franchise Dialog */}
      <CreateFranchiseDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        programs={programs}
        onSuccess={triggerRefresh}
      />

      {/* Franchise Table */}
      <TableSectionSurface>
        <FranchiseTable refreshTrigger={refreshTrigger} />
      </TableSectionSurface>
    </TablePageShell>
  );
}
