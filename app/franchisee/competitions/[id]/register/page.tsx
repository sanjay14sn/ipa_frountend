"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Trash2, PlusCircle, Loader2 } from "lucide-react";
import { api } from "@/lib/axios";
import { getAllStudents } from "@/services/student-list.service";

// Helper to format date strictly as DD-MM-YYYY
function formatDOB(dateString: string) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function money(value: unknown): string {
  const amount = Number(value);
  return Number.isNaN(amount) ? "0.00" : amount.toFixed(2);
}

function registrationFeeParts(competition: any, reg: any) {
  const baseFee = Number(competition?.baseFee ?? 0);
  const franchiseBenefit = Number(competition?.franchiseBenefit ?? 0);
  const payable = Number(reg?.totalFeePaid ?? 0);
  return { baseFee, franchiseBenefit, payable };
}

function formatCompetitionDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export default function RegisterStudentPage() {
  const params = useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const competitionId = params.id as string;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [studentIdInput, setStudentIdInput] = useState("");
  const [searchTrigger, setSearchTrigger] = useState("");
  const [selectedMode, setSelectedMode] = useState("ONLINE");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchedStudent, setSearchedStudent] = useState<any>(null);

  // Fetch all students for the dropdown
  const { data: allStudents } = useQuery({
    queryKey: ["franchise-students-list"],
    queryFn: async () => {
      const res = await getAllStudents();
      return res.result ?? [];
    },
  });

  // Fetch Competition Details to check status
  const { data: competition } = useQuery({
    queryKey: ["competition", competitionId],
    queryFn: async () => {
      const res = await api.get(`/competitions/franchise/${competitionId}`);
      return res.data?.result || res.data?.data || res.data;
    }
  });

  const isClosed = competition?.status === "CLOSED";

  // Fetch DB Registered/Pending Students
  const { data: dbData, isLoading: isLoadingList } = useQuery({
    queryKey: ["franchise-comp-students", competitionId],
    queryFn: async () => {
      const res = await api.get(`/competitions/franchise/${competitionId}/students`);
      return res.data?.result || res.data?.data || res.data || { result: [], keyId: "" };
    },
  });

  const dbRegistrations = dbData?.result || [];
  const razorpayKey = dbData?.keyId || "";
  const feeCompetition = dbData?.competition || competition;
  const franchiseBenefit = Number(feeCompetition?.franchiseBenefit ?? 0);
  const baseFee = Number(feeCompetition?.baseFee ?? 0);
  const netPerStudent = Math.max(0, baseFee - franchiseBenefit);
  const centreClosingDate = dbData?.franchiseClosingDate ?? null;
  const adminClosingDate =
    dbData?.adminClosingDate ?? feeCompetition?.closingDate ?? null;

  // Fetch the certificate data for eligibility check (Optional)
  const { data: certData, isLoading: isSearching } = useQuery({
    queryKey: ["student-cert", searchTrigger],
    queryFn: async () => {
      if (!searchTrigger) return null;
      try {
        const res = await api.get(`/competitions/franchise/students/${searchTrigger}/certificate-data`);
        return res.data?.result || res.data?.data || res.data;
      } catch (err) {
        return null;
      }
    },
    enabled: !!searchTrigger,
    retry: false,
  });

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!studentIdInput.trim()) return;
    
    const idToSearch = Number(studentIdInput.trim());

    // Prevent adding duplicates to staging
    if (dbRegistrations.some((s: any) => s.studentId === idToSearch)) {
      toast.error("This student is already in the registration list.");
      return;
    }

    const fullStudent = allStudents?.find((s: any) => s.id === idToSearch);
    if (!fullStudent) {
      toast.error("Student not found in your franchise list.");
      setSearchedStudent(null);
      return;
    }

    setSearchedStudent(fullStudent);
    setSearchTrigger(studentIdInput.trim());
  };

  // Add to List (Creates PENDING Registration in DB)
  const addMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post(`/competitions/franchise/students/register`, payload);
    },
    onSuccess: () => {
      toast.success("Student added to staging list.");
      qc.invalidateQueries({ queryKey: ["franchise-comp-students", competitionId] });
      setIsModalOpen(false);
      setSearchTrigger("");
      setStudentIdInput("");
      setSearchedStudent(null);
      setSelectedMode("ONLINE");
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || "Failed to add student";
      if (typeof msg === 'string' && (msg.toLowerCase().includes("already in use") || msg.toLowerCase().includes("unique"))) {
        toast.error("This student is already registered for this competition.");
      } else {
        toast.error(msg);
      }
    }
  });

  // Delete PENDING Registration
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.delete(`/competitions/franchise/students/register/${id}`);
    },
    onSuccess: () => {
      toast.success("Registration removed.");
      qc.invalidateQueries({ queryKey: ["franchise-comp-students", competitionId] });
    },
    onError: () => {
      toast.error("Failed to remove registration.");
    }
  });

  const handleAddToList = () => {
    if (!searchedStudent) return;
    addMutation.mutate({
      studentId: searchedStudent.id,
      competitionId: Number(competitionId),
      typeSelected: selectedMode,
      includePracticePaper: false
    });
  };

  // Toggle paid status
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const toggleMutation = useMutation({
    mutationFn: async ({ id, isPaid }: { id: number, isPaid: boolean }) => {
      return api.patch(`/competitions/franchise/students/register/${id}/paid-status`, { isPaidToFranchise: isPaid });
    },
    onSuccess: () => {
      toast.success("Paid status updated.");
      qc.invalidateQueries({ queryKey: ["franchise-comp-students", competitionId] });
      setTogglingId(null);
    },
    onError: () => {
      toast.error("Failed to update status.");
      setTogglingId(null);
    }
  });

  const handleTogglePaid = (id: number, currentStatus: boolean) => {
    setTogglingId(id);
    toggleMutation.mutate({ id, isPaid: !currentStatus });
  };

  const handleModalClose = (open: boolean) => {
    setIsModalOpen(open);
    if (!open) {
      setSearchTrigger("");
      setStudentIdInput("");
      setSearchedStudent(null);
      setSelectedMode("ONLINE");
    }
  };

  // Pay existing PENDING Registration
  const [payingId, setPayingId] = useState<number | null>(null);
  const handlePay = (reg: any) => {
    if (!razorpayKey) {
      toast.error("Payment configuration missing. Please refresh the page.");
      return;
    }

    if (!reg.razorpayOrderId || reg.totalFeePaid <= 0) {
      toast.error("No pending payment found for this registration.");
      return;
    }

    setPayingId(reg.id);
    const options = {
      key: razorpayKey,
      amount: Math.round(Number(reg.totalFeePaid) * 100),
      currency: "INR",
      name: "Abacus EduPlatform",
      description: "Competition Registration Fee",
      order_id: reg.razorpayOrderId,
      handler: async function (response: any) {
        try {
          await api.post(`/competitions/franchise/students/register/verify`, {
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature
          });
          toast.success("Payment successful! Student registered.");
          qc.invalidateQueries({ queryKey: ["franchise-comp-students", competitionId] });
        } catch (err) {
          toast.error("Payment verification failed.");
        } finally {
          setPayingId(null);
        }
      },
      modal: {
        ondismiss: function () {
          setPayingId(null);
        }
      },
      theme: { color: "#3399cc" }
    };
    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  };

  // Bulk Pay Mutation
  const [isBulkPaying, setIsBulkPaying] = useState(false);
  const handleBulkPay = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkPaying(true);

    try {
      // 1. Generate Master Order
      const res = await api.post(`/competitions/franchise/students/register/bulk-pay`, {
        registrationIds: selectedIds
      });
      const data = res.data?.result || res.data?.data || res.data;

      if (!data.razorpayOrderId) {
        toast.success("Payment handled automatically for zero amount.");
        setSelectedIds([]);
        qc.invalidateQueries({ queryKey: ["franchise-comp-students", competitionId] });
        return;
      }

      // 2. Open Razorpay
      const options = {
        key: data.keyId,
        amount: Math.round(Number(data.amount) * 100),
        currency: "INR",
        name: "Abacus EduPlatform",
        description: `Bulk Registration (${selectedIds.length} students)`,
        order_id: data.razorpayOrderId,
        handler: async function (response: any) {
          try {
            await api.post(`/competitions/franchise/students/register/verify`, {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature
            });
            toast.success("Bulk payment successful!");
            setSelectedIds([]);
            qc.invalidateQueries({ queryKey: ["franchise-comp-students", competitionId] });
          } catch (err) {
            toast.error("Bulk payment verification failed.");
          } finally {
            setIsBulkPaying(false);
          }
        },
        modal: {
          ondismiss: function () {
            setIsBulkPaying(false);
          }
        },
        theme: { color: "#3399cc" }
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.open();

    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to initiate bulk payment.");
      setIsBulkPaying(false);
    }
  };

  const pendingRegs = dbRegistrations.filter((r: any) => r.paymentStatus === "PENDING");
  const allPendingSelected = pendingRegs.length > 0 && selectedIds.length === pendingRegs.length;
  const totalBulkAmount = dbRegistrations
    .filter((r: any) => selectedIds.includes(r.id))
    .reduce((sum: number, r: any) => sum + Number(r.totalFeePaid || 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Register Students</h2>
          <p className="text-muted-foreground">
            {isClosed ? "This competition is closed. You can only view existing registrations." : "Add eligible students to the list and register them."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/franchisee/competitions">Back to Competitions</Link>
          </Button>
          {!isClosed && (
            <Dialog open={isModalOpen} onOpenChange={handleModalClose}>
              <DialogTrigger asChild>
                <Button><PlusCircle className="mr-2 h-4 w-4" /> Add Student</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Search Student for Competition</DialogTitle>
                  <DialogDescription>
                    Enter a Student ID or Name to check their eligibility and add them to the registration list.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="flex items-center gap-2 py-4">
                  <Input 
                    placeholder="Enter Student ID or Name..." 
                    value={studentIdInput}
                    onChange={(e) => {
                      setStudentIdInput(e.target.value);
                      setSearchedStudent(null);
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <Button onClick={() => handleSearch()} disabled={isSearching}>
                    {isSearching ? "Searching..." : "Search"}
                  </Button>
                </div>

                {studentIdInput.length > 1 && !searchedStudent && allStudents && (
                  <div className="border rounded-md shadow-lg max-h-48 overflow-y-auto z-10 bg-background">
                    {allStudents.filter((s: any) => 
                        s.name.toLowerCase().includes(studentIdInput.toLowerCase()) || 
                        String(s.id).includes(studentIdInput)
                      ).map((s: any) => (
                        <div 
                          key={s.id} 
                          className="p-2 hover:bg-muted cursor-pointer flex justify-between items-center border-b last:border-0"
                          onClick={() => {
                            setStudentIdInput(String(s.id));
                            if (dbRegistrations.some((draft: any) => draft.studentId === s.id)) {
                              toast.error("This student is already in the registration list.");
                              return;
                            }
                            setSearchTrigger(String(s.id));
                            setSearchedStudent(s);
                          }}
                        >
                          <span className="font-medium text-sm">{s.name}</span>
                          <span className="text-xs text-muted-foreground">ID: {s.id}</span>
                        </div>
                      ))}
                  </div>
                )}

                {searchedStudent && (
                  <div className="border rounded-lg p-4 bg-muted/30 space-y-3 animate-in fade-in zoom-in duration-200">
                    <div className="flex justify-between items-start">
                      <h4 className="font-semibold text-primary">Student Found</h4>
                      {certData?.marks && <Badge variant="secondary">Marks: {certData.marks}</Badge>}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-muted-foreground">Name:</span> {searchedStudent.name}</div>
                      <div><span className="text-muted-foreground">Student ID:</span> {searchedStudent.id}</div>
                      <div><span className="text-muted-foreground">Current Level:</span> {searchedStudent.level?.name || "-"}</div>
                      <div><span className="text-muted-foreground">Completed Level:</span> {isSearching ? "Checking..." : (certData?.completedLevelName || "-")}</div>
                    </div>

                    <Button className="w-full mt-4" onClick={handleAddToList} disabled={isSearching || addMutation.isPending}>
                      {addMutation.isPending ? "Adding..." : "Add to Registration List"}
                    </Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {feeCompetition && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <p className="text-muted-foreground">Base Fee</p>
                <p className="font-semibold">₹{money(baseFee)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Franchise Benefit (₹)</p>
                <p className="font-semibold text-emerald-700">
                  {franchiseBenefit > 0 ? `−₹${money(franchiseBenefit)}` : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Net Payable (per student)</p>
                <p className="font-semibold text-primary">₹{money(netPerStudent)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Head Office Closing</p>
                <p className="font-semibold">{formatCompetitionDate(adminClosingDate)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Your Centre Closing</p>
                <p className="font-semibold text-primary">
                  {formatCompetitionDate(centreClosingDate || adminClosingDate)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table className="w-full text-xs sm:text-sm">
            <TableHeader className="bg-muted/50">
              <TableRow>
                {!isClosed && (
                  <TableHead className="w-12 text-center border-r px-2 py-3">
                    <Checkbox 
                      checked={allPendingSelected}
                      onCheckedChange={(c) => {
                        if (c) {
                          setSelectedIds(pendingRegs.map((r: any) => r.id));
                        } else {
                          setSelectedIds([]);
                        }
                      }}
                      disabled={pendingRegs.length === 0}
                    />
                  </TableHead>
                )}
                <TableHead className="font-semibold tracking-wider uppercase text-center border-r px-2 py-3">SL NO</TableHead>
                <TableHead className="font-semibold tracking-wider uppercase border-r px-2 py-3">NAME OF THE STUDENTS</TableHead>
                <TableHead className="font-semibold tracking-wider uppercase border-r px-2 py-3">DOB</TableHead>
                <TableHead className="font-semibold tracking-wider uppercase border-r px-2 py-3">CI NAME</TableHead>
                <TableHead className="font-semibold tracking-wider uppercase border-r px-2 py-3">CURRENT LEVEL</TableHead>
                <TableHead className="font-semibold tracking-wider uppercase border-r px-2 py-3">COMPLETED LEVEL</TableHead>
                <TableHead className="font-semibold tracking-wider uppercase border-r px-2 py-3">CATEGORY</TableHead>
                <TableHead className="font-semibold tracking-wider uppercase border-r px-2 py-3">PARENT PHONE NUMBER</TableHead>
                <TableHead className="font-semibold tracking-wider uppercase border-r px-2 py-3">MODE</TableHead>
                <TableHead className="font-semibold tracking-wider uppercase border-r px-2 py-3 text-center">PAID (YES/NO)</TableHead>
                <TableHead className="font-semibold tracking-wider uppercase px-2 py-3 text-center">ACTION</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingList ? (
                <TableRow>
                  <TableCell colSpan={isClosed ? 10 : 11} className="h-32 text-center text-muted-foreground">
                    Loading registrations...
                  </TableCell>
                </TableRow>
              ) : dbRegistrations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isClosed ? 10 : 11} className="h-32 text-center text-muted-foreground">
                    No students added yet.
                  </TableCell>
                </TableRow>
              ) : (
                dbRegistrations.map((reg: any, index: number) => {
                  const student = reg.student || {};
                  const isPending = reg.paymentStatus === "PENDING";
                  return (
                    <TableRow key={reg.id} className="hover:bg-muted/30">
                      {!isClosed && (
                        <TableCell className="text-center border-r px-2 py-3">
                          {isPending ? (
                            <Checkbox 
                              checked={selectedIds.includes(reg.id)}
                              onCheckedChange={(c) => {
                                if (c) {
                                  setSelectedIds([...selectedIds, reg.id]);
                                } else {
                                  setSelectedIds(selectedIds.filter(id => id !== reg.id));
                                }
                              }}
                              disabled={reg.createdBy === student.id && !reg.isPaidToFranchise}
                            />
                          ) : null}
                        </TableCell>
                      )}
                      <TableCell className="text-center border-r px-2 py-3">{index + 1}</TableCell>
                      <TableCell className="font-medium border-r px-2 py-3">{student.name || `Student ID ${reg.studentId}`}</TableCell>
                      <TableCell className="border-r px-2 py-3 whitespace-nowrap">{formatDOB(student.dateOfBirth)}</TableCell>
                      <TableCell className="border-r px-2 py-3">-</TableCell>
                      <TableCell className="border-r px-2 py-3">{student.level?.name || "-"}</TableCell>
                      <TableCell className="border-r px-2 py-3">{reg.completedLevel?.name || "-"}</TableCell>
                      <TableCell className="border-r px-2 py-3">{student.level?.stream?.name || "-"}</TableCell>
                      <TableCell className="border-r px-2 py-3">{student.fatherContactNo || student.motherContactNo || "-"}</TableCell>
                      <TableCell className="border-r px-2 py-3 font-medium">{reg.typeSelected}</TableCell>
                      <TableCell className="border-r px-2 py-3">
                        <div className="flex items-center justify-center space-x-2">
                          <Switch 
                            checked={reg.isPaidToFranchise}
                            disabled={togglingId === reg.id || reg.paymentStatus === 'COMPLETED'}
                            onCheckedChange={() => handleTogglePaid(reg.id, reg.isPaidToFranchise)}
                          />
                          {togglingId === reg.id ? <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /> : <span className="text-xs">{reg.isPaidToFranchise ? "YES" : "NO"}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="px-2 py-3">
                        {reg.paymentStatus === "COMPLETED" ? (
                          <Button size="sm" variant="secondary" disabled>
                            Registered
                          </Button>
                        ) : isClosed ? (
                          <Button size="sm" variant="secondary" disabled>
                            Closed
                          </Button>
                        ) : (
                          <div className="flex items-center gap-2 justify-center">
                            {(() => {
                              const fee = registrationFeeParts(feeCompetition, reg);
                              return (
                                <div className="flex flex-col items-center gap-1">
                                  <Button
                                    size="sm"
                                    onClick={() => handlePay(reg)}
                                    disabled={
                                      payingId === reg.id ||
                                      deleteMutation.isPending ||
                                      (reg.createdBy === student.id && !reg.isPaidToFranchise)
                                    }
                                  >
                                    {payingId === reg.id
                                      ? "Wait..."
                                      : `Pay ₹${money(fee.payable)}`}
                                  </Button>
                                  {fee.franchiseBenefit > 0 ? (
                                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                      Base ₹{money(fee.baseFee)} − Benefit ₹
                                      {money(fee.franchiseBenefit)}
                                    </span>
                                  ) : null}
                                </div>
                              );
                            })()}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="destructive" 
                                  className="px-2"
                                  disabled={deleteMutation.isPending || payingId === reg.id}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently remove this pending registration from your list.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => deleteMutation.mutate(reg.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Yes, delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
        {selectedIds.length > 0 && !isClosed && (
          <div className="bg-primary/5 border-t p-4 flex flex-col sm:flex-row justify-between items-center gap-4 rounded-b-xl animate-in fade-in zoom-in-95 duration-200">
            <div>
              <p className="text-sm font-medium text-primary">Bulk Checkout Active</p>
              <p className="text-xs text-muted-foreground">You have selected {selectedIds.length} student{selectedIds.length > 1 ? 's' : ''} to register at once.</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total Amount</p>
                <p className="text-lg font-bold text-primary">₹{money(totalBulkAmount)}</p>
                {franchiseBenefit > 0 ? (
                  <p className="text-[10px] text-emerald-700">
                    Base ₹{money(baseFee)} − Franchise Benefit ₹{money(franchiseBenefit)} per
                    student
                  </p>
                ) : null}
              </div>
              <Button onClick={handleBulkPay} disabled={isBulkPaying} size="lg" className="shadow-md">
                {isBulkPaying ? "Processing..." : "Complete Payment"}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Load Razorpay SDK */}
      <script src="https://checkout.razorpay.com/v1/checkout.js" async />
    </div>
  );
}
