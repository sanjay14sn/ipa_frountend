"use client";

import { ProgramManagement } from "./components/ProgramManagement";

export default function AdminProfilePage() {
  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            System Configuration
          </h1>
          <p className="text-sm text-gray-600">
            Manage programs, levels, and inventory for your franchise network
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-row gap-4">
        <div className="w-full">
          <ProgramManagement />
        </div>
      </div>
    </div>
  );
}
