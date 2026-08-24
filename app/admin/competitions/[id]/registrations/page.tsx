"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/axios";
import { ChevronLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageSkeleton } from "@/components/shared/skeletons";

export default function AdminRegistrationsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  // Fetch Competition Details for Header
  const { data: compResponse, isLoading: isLoadingComp } = useQuery({
    queryKey: ["admin-competition", id],
    queryFn: async () => {
      const res = await api.get(`/competitions/admin/${id}`);
      return res.data?.result || res.data;
    }
  });

  // Fetch Registrations
  const { data: registrationsResponse, isLoading: isLoadingRegs } = useQuery({
    queryKey: ["admin-competition-registrations", id],
    queryFn: async () => {
      const res = await api.get(`/competitions/admin/${id}/registrations`);
      return res.data?.result || res.data;
    }
  });

  const competition = compResponse;
  const registrations = registrationsResponse || [];

  if (isLoadingComp || isLoadingRegs) {
    return <PageSkeleton />;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.push("/admin/competitions")}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Paid Registrations</h1>
          <p className="text-muted-foreground">
            Viewing registered students for <strong>{competition?.title || "Competition"}</strong>
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Registered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{registrations.length}</div>
            <p className="text-xs text-muted-foreground">Students across all franchises</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registration Directory</CardTitle>
          <CardDescription>A complete list of all successfully paid student registrations for this competition.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table className="w-full text-xs sm:text-sm">
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-semibold tracking-wider uppercase text-center border-r px-2 py-3 w-16">SL NO</TableHead>
                <TableHead className="font-semibold tracking-wider uppercase border-r px-2 py-3 min-w-[150px]">FRANCHISE</TableHead>
                <TableHead className="font-semibold tracking-wider uppercase border-r px-2 py-3 min-w-[150px]">STUDENT NAME</TableHead>
                <TableHead className="font-semibold tracking-wider uppercase border-r px-2 py-3">DOB</TableHead>
                <TableHead className="font-semibold tracking-wider uppercase border-r px-2 py-3">CURRENT LEVEL</TableHead>
                <TableHead className="font-semibold tracking-wider uppercase border-r px-2 py-3">CONTACT</TableHead>
                <TableHead className="font-semibold tracking-wider uppercase border-r px-2 py-3">MODE</TableHead>
                <TableHead className="font-semibold tracking-wider uppercase border-r px-2 py-3">FEE PAID</TableHead>
                <TableHead className="font-semibold tracking-wider uppercase px-2 py-3 min-w-[150px]">PAYMENT REF</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registrations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                    No registrations found for this competition yet.
                  </TableCell>
                </TableRow>
              ) : (
                registrations.map((reg: any, index: number) => {
                  const student = reg.student || {};
                  const franchise = reg.franchise || {};
                  
                  // Format DOB safely
                  let dobStr = "-";
                  if (student.dateOfBirth) {
                    try {
                      dobStr = new Date(student.dateOfBirth).toLocaleDateString('en-GB'); // DD/MM/YYYY
                    } catch(e) {}
                  }

                  return (
                    <TableRow key={reg.id} className="hover:bg-muted/30">
                      <TableCell className="text-center border-r px-2 py-3">{index + 1}</TableCell>
                      <TableCell className="font-medium border-r px-2 py-3 text-primary">{franchise.name || `ID: ${reg.franchiseId}`}</TableCell>
                      <TableCell className="font-medium border-r px-2 py-3">{student.name || `ID: ${reg.studentId}`}</TableCell>
                      <TableCell className="border-r px-2 py-3 whitespace-nowrap">{dobStr}</TableCell>
                      <TableCell className="border-r px-2 py-3">{student.level?.name || "-"}</TableCell>
                      <TableCell className="border-r px-2 py-3">{student.fatherContactNo || student.motherContactNo || "-"}</TableCell>
                      <TableCell className="border-r px-2 py-3 font-medium">{reg.typeSelected}</TableCell>
                      <TableCell className="border-r px-2 py-3 font-medium text-emerald-600">₹{reg.totalFeePaid}</TableCell>
                      <TableCell className="px-2 py-3 font-mono text-[10px] sm:text-xs truncate max-w-[150px]" title={reg.razorpayPaymentId}>
                        {reg.razorpayPaymentId || "-"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
