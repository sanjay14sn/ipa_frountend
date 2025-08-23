"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Building2, Plus } from "lucide-react";
import FranchiseTable from "./components/FranchiseTable";
import { FranchiseData, getAllFranchise } from "@/services/franchisee.service";
import { bulkUploadFranchises } from "@/services/franchise.service";
import { toast } from "sonner";

export default function AdminFranchises() {
  const [franchises, setFranchises] = useState<FranchiseData[] | undefined>();
  const [students, setStudents] = useState([]);
  const [courseInstructors, setCourseInstructors] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const result = await getAllFranchise();
      setFranchises(result.result);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
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
      await fetchData();
    } catch (error) {
      console.error("Bulk upload failed:", error);
      toast.error("Bulk upload failed");
    } finally {
      // Reset the input so the same file can be selected again if needed
      e.target.value = "";
    }
  };

  const getFranchiseStats = (franchiseId: string) => {
    const franchiseStudents = students.filter(
      (student: any) => student.franchiseId === franchiseId
    );
    const franchiseCourseInstructors = courseInstructors.filter(
      (ci: any) => ci.franchiseId === franchiseId
    );
    const franchiseOrders = orders.filter(
      (order: any) => order.franchiseId === franchiseId
    );

    return {
      students: franchiseStudents.length,
      courseInstructors: franchiseCourseInstructors.length,
      orders: franchiseOrders.length,
      pendingOrders: franchiseOrders.filter(
        (order: any) => order.status === "Pending"
      ).length,
    };
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-700 border-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "inactive":
        return "bg-gray-100 text-gray-600 border-gray-200";
      case "suspended":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-gray-100 text-gray-600 border-gray-200";
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
        <div className="animate-pulse space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-8 bg-gray-200 rounded-lg w-64"></div>
              <div className="h-4 bg-gray-200 rounded w-96"></div>
            </div>
            <div className="h-10 bg-gray-200 rounded-lg w-32"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const activeCount = franchises?.filter(
    (f: any) => f.status === "Active"
  ).length;
  const pendingCount = franchises?.filter(
    (f: any) => f.status === "Pending"
  ).length;
  const totalStudents = students.length;
  const totalOrders = orders.length;

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
            onClick={fetchData}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Franchise Grid */}
      <div className="flex flex-row gap-4">
        <div className="w-full">
          <FranchiseTable clients={franchises} />
        </div>
        {/* <div>
          <Card className="bg-white border-primary max-w-[400px] p-1 rounded-md">
            <CardHeader className=" border border-black rounded-t-md p-0 mb-3 ">
              <CardTitle className="text-sm font-medium tracking-wider text-gray-800 p-2 bg-primary/80 rounded-t-md">
                Activity Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {[
                  {
                    time: "25/06/2025 09:29",
                    franchise: "IPA Madpipakkam",
                    action: "Applied",
                  },
                  {
                    time: "25/06/2025 08:12",
                    franchise: "IPA Madpipakkam",
                    action: "Paid Monthly Fee",
                  },
                  {
                    time: "24/06/2025 22:55",
                    franchise: "IPA Madpipakkam",
                    action: "Paid Monthly Fee",
                  },
                  {
                    time: "24/06/2025 21:33",
                    franchise: "IPA Madpipakkam",
                    action: "Paid Monthly Fee",
                  },
                  {
                    time: "24/06/2025 19:45",
                    franchise: "IPA Madpipakkam",
                    action: "Paid Monthly Fee",
                  },
                ].map((log, index) => (
                  <div
                    key={index}
                    className="text-xs border-l-2 border-primary pl-3 p-2 rounded transition-colors"
                  >
                    <div className="text-neutral-500 font-mono">{log.time}</div>
                    <div className="text-black">
                      Franchise{" "}
                      <span className="text-primary font-mono">
                        {log.franchise}
                      </span>{" "}
                      {log.action}{" "}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          </div> */}
      </div>

      {franchises?.length === 0 && (
        <div className="text-center py-16">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Building2 className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No franchises found
          </h3>
          <p className="text-gray-600 mb-6">
            Get started by adding your first franchise to the network
          </p>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Add First Franchise
          </Button>
        </div>
      )}
    </div>
  );
}
