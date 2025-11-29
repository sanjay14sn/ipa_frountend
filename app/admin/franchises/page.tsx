"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import FranchiseTable from "./components/FranchiseTable";
import { CreateFranchiseDialog } from "./components/CreateFranchiseDialog";
import { bulkUploadFranchises } from "@/services/franchise.service";
import { getAllPrograms, Program } from "@/services/program.service";
import { toast } from "sonner";

export default function AdminFranchises() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [programs, setPrograms] = useState<Program[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const programsData = await getAllPrograms();
        setPrograms(programsData);
      } catch (error) {
        console.error("Error fetching programs:", error);
      }
    };
    fetchPrograms();
  }, []);

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
    <div className="p-6 space-y-6 bg-gray-50 min-h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Franchise Management
          </h1>
          <p className="text-sm text-gray-600">
            Comprehensive franchise network oversight and administration
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={() => setIsCreateDialogOpen(true)}
          >
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
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
            onClick={handleDownloadTemplate}
          >
            Download CSV template
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={openFilePicker}
          >
            Bulk upload CSV
          </Button>
          <Button
            variant="outline"
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
            onClick={triggerRefresh}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Create Franchise Dialog */}
      <CreateFranchiseDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        programs={programs}
        onSuccess={triggerRefresh}
      />

      {/* Franchise Table */}
      <div className="bg-white rounded-lg">
        <FranchiseTable refreshTrigger={refreshTrigger} />
      </div>
    </div>
  );
}
