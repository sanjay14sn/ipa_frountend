"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProgramManagement } from "../profile/components/ProgramManagement";
import { useUser } from "@/context/user-context";

export default function AdminProgramsPage() {
  const router = useRouter();
  const { user } = useUser();
  const isSuperAdmin = user?.role === "admin" && user.adminRole === "super";

  useEffect(() => {
    if (user && !isSuperAdmin) {
      router.replace("/admin/dashboard");
    }
  }, [isSuperAdmin, router, user]);

  if (user && !isSuperAdmin) {
    return null;
  }

  return (
    <div className="min-h-full space-y-6">
      <ProgramManagement />
    </div>
  );
}
