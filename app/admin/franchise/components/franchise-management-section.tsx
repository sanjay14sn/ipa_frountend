"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import FranchiseTable from "@/app/admin/franchises/components/FranchiseTable";
import { CreateFranchiseDialog } from "@/app/admin/franchises/components/CreateFranchiseDialog";
import { bulkUploadFranchises } from "@/services/franchise.service";
import { getAllPrograms, Program } from "@/services/program.service";
import { toast } from "sonner";
import { TablePageShell, TableSectionSurface } from "@/components/shared";
import { Building2, Download, RefreshCw, Upload } from "lucide-react";

export function FranchiseManagementSection() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [programsLoaded, setProgramsLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const ensureProgramsLoaded = async () => {
    if (programsLoaded) return;
    try {
      const programsData = await getAllPrograms();
      setPrograms(programsData);
      setProgramsLoaded(true);
    } catch (error) {
      console.error("Error fetching programs:", error);
      toast.error("Failed to load programs");
    }
  };

  const triggerRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleDownloadTemplate = () => {
    try {
      const headers = [
        "Franchisee Name",
        "Blood Group",
        "Date of Birth",
        "Password",
        "Address",
        "Communication Address",
        "City",
        "Phone",
        "Email",
        "Education",
        "Occupation",
        "Reference",
        "Franchise Name",
        "Franchise Type",
        "Program ID",
        "Franchise Fee",
        "Kit Cost",
        "Material Cost",
        "Monthly Fee",
        "CI Share",
        "Franchise Share",
        "Royalty",
        "Installment",
        "Total Amount",
        "Last Renewal Date",
        "Renewal Count",
        "Next Renewal Date",
        "Renew Tenure",
        "Payment Status",
      ];

      const csv = headers.join(",") + "\r\n";
      const blob = new Blob([csv], {
        type: "text/csv;charset=utf-8;",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "franchise_bulk_upload_template.csv";
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Template downloaded");
    } catch (error) {
      console.error("Error generating template:", error);
      toast.error("Failed to generate template");
    }
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await bulkUploadFranchises(file);
      toast.success("Franchises uploaded successfully");
      triggerRefresh();
    } catch (error) {
      console.error("Bulk upload failed:", error);
      toast.error("Bulk upload failed");
    } finally {
      // Reset the input so the same file can be selected again if needed
      e.target.value = "";
    }
  };

  return (
    <TablePageShell
      title="Franchise Management"
      description="Comprehensive franchise network oversight and administration"
      actions={
        <>
          <Button
            onClick={async () => {
              await ensureProgramsLoaded();
              setIsCreateDialogOpen(true);
            }}
          >
            <Building2 className="h-4 w-4" />
            Setup Existing Franchise
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleBulkUpload}
          />
          <Button
            variant="outline"
            onClick={handleDownloadTemplate}
          >
            <Download className="h-4 w-4" />
            Download CSV template
          </Button>
          <Button
            variant="outline"
            onClick={openFilePicker}
          >
            <Upload className="h-4 w-4" />
            Bulk upload CSV
          </Button>
          <Button
            variant="outline"
            onClick={triggerRefresh}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </>
      }
    >

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
