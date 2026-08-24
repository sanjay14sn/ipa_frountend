"use client";

import { useState, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trophy, CheckCircle, Search, Plus, Trash2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import { PageSkeleton } from "@/components/shared";

function toDateInputValue(value?: string | null): string {
  if (!value) return "";
  return new Date(value).toISOString().split("T")[0];
}

function todayDateInputValue(): string {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

function CompetitionsSection() {
  const queryClient = useQueryClient();
  const [optInDialog, setOptInDialog] = useState<{ open: boolean; comp: any }>({ open: false, comp: null });
  const [markupItems, setMarkupItems] = useState<{ name: string; amount: number }[]>([]);
  const [franchiseClosingDate, setFranchiseClosingDate] = useState("");

  const handleOpenDialog = (comp: any) => {
    setOptInDialog({ open: true, comp });
    setFranchiseClosingDate(
      toDateInputValue(comp.franchiseClosingDate) ||
        toDateInputValue(comp.adminClosingDate || comp.closingDate),
    );
    if (comp.isApprovedByFranchise && comp.franchiseMarkupBreakdown?.length > 0) {
      setMarkupItems(comp.franchiseMarkupBreakdown);
    } else if (comp.isApprovedByFranchise && comp.franchiseMarkup) {
      setMarkupItems([{ name: "Markup", amount: comp.franchiseMarkup }]);
    } else {
      setMarkupItems([]);
    }
  };

  const [page, setPage] = useState(1);
  const limit = 10;

  const { data: competitionsData, isLoading } = useQuery({
    queryKey: ["franchisee-competitions", page],
    queryFn: async () => {
      const res = await api.get(`/competitions/franchise?page=${page}&limit=${limit}`);
      const payload = res.data?.data ?? res.data?.result ?? res.data;
      return payload || { items: [], totalPages: 1 };
    },
  });

  const competitions = competitionsData?.items || [];
  const totalPages = competitionsData?.totalPages || 1;

  const optInMutation = useMutation({
    mutationFn: async ({
      id,
      markupFee,
      markupBreakdown,
      franchiseClosingDate: centreClosingDate,
    }: {
      id: string;
      markupFee: number;
      markupBreakdown: any[];
      franchiseClosingDate: string;
    }) => {
      return api.post(`/competitions/franchise/${id}/approve`, {
        markupFee,
        markupBreakdown,
        franchiseClosingDate: centreClosingDate,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["franchisee-competitions"] });
      setOptInDialog({ open: false, comp: null });
      toast.success("Successfully opted into competition!");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to opt in");
    },
  });

  const handleOptIn = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const markupFee = markupItems.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
    const markupBreakdown = markupItems.filter(item => item.name.trim() !== "" && Number(item.amount) > 0);

    if (!franchiseClosingDate) {
      toast.error("Please set your centre closing date.");
      return;
    }

    if (optInDialog.comp) {
      optInMutation.mutate({
        id: optInDialog.comp.id,
        markupFee,
        markupBreakdown,
        franchiseClosingDate,
      });
    }
  };

  const currentTotalMarkup = markupItems.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
  const adminClosingDateInput = toDateInputValue(
    optInDialog.comp?.adminClosingDate || optInDialog.comp?.closingDate,
  );
  const today = todayDateInputValue();

  const formatFranchiseBenefit = (value: unknown) => {
    if (value == null || value === "") return "-";
    const amount = Number(value);
    return Number.isNaN(amount) ? "-" : `₹${amount.toFixed(2)}`;
  };

  const formatCompetitionDate = (value?: string | null) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  if (isLoading) return <div className="p-6">Loading competitions...</div>;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-semibold text-xs tracking-wider uppercase">Title</TableHead>
                <TableHead className="font-semibold text-xs tracking-wider uppercase">Type</TableHead>
                <TableHead className="font-semibold text-xs tracking-wider uppercase">Closing Date</TableHead>
                <TableHead className="font-semibold text-xs tracking-wider uppercase">Base Fee</TableHead>
                <TableHead className="font-semibold text-xs tracking-wider uppercase">Franchise Benefit (₹)</TableHead>
                <TableHead className="font-semibold text-xs tracking-wider uppercase">Your Markup</TableHead>
                <TableHead className="font-semibold text-xs tracking-wider uppercase">Total Fee</TableHead>
                <TableHead className="font-semibold text-xs tracking-wider uppercase">Status</TableHead>
                <TableHead className="font-semibold text-xs tracking-wider uppercase text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {competitions?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                    No active competitions available.
                  </TableCell>
                </TableRow>
              ) : (
                competitions?.map((comp: any) => (
                  <TableRow key={comp.id}>
                    <TableCell className="font-medium">{comp.title}</TableCell>
                    <TableCell>{comp.type}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {comp.isApprovedByFranchise && comp.franchiseClosingDate
                        ? formatCompetitionDate(comp.franchiseClosingDate)
                        : formatCompetitionDate(
                            comp.adminClosingDate || comp.closingDate,
                          )}
                      {comp.isApprovedByFranchise && comp.franchiseClosingDate ? (
                        <span className="block text-[10px] text-muted-foreground">
                          HO: {formatCompetitionDate(comp.adminClosingDate || comp.closingDate)}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">₹{comp.baseFee}</TableCell>
                    <TableCell className="whitespace-nowrap text-emerald-700 font-medium">
                      {formatFranchiseBenefit(comp.franchiseBenefit)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{comp.isApprovedByFranchise ? `₹${comp.franchiseMarkup}` : "-"}</TableCell>
                    <TableCell className="font-semibold whitespace-nowrap">
                      {comp.isApprovedByFranchise ? `₹${Number(comp.baseFee) + Number(comp.franchiseMarkup)}` : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={comp.status === "CLOSED" ? "outline" : comp.isApprovedByFranchise ? "default" : "secondary"} className="uppercase text-[10px]">
                        {comp.status === "CLOSED" ? "Closed" : comp.isApprovedByFranchise ? "Opted In" : "Available"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center gap-2">
                        {comp.status === "CLOSED" ? (
                          <>
                            <Badge variant="outline" className="mr-2">Registrations Closed</Badge>
                            <Button size="sm" asChild>
                              <Link href={`/franchisee/competitions/${comp.id}/register`}>
                                View Registrations
                              </Link>
                            </Button>
                          </>
                        ) : !comp.isApprovedByFranchise ? (
                          <Button size="sm" onClick={() => handleOpenDialog(comp)}>
                            Opt In & Set Fee
                          </Button>
                        ) : (
                          <>
                            <Button variant="outline" size="sm" onClick={() => handleOpenDialog(comp)}>
                              Edit Markup
                            </Button>
                            <Button size="sm" asChild>
                              <Link href={`/franchisee/competitions/${comp.id}/register`}>
                                Register Students
                              </Link>
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
        {totalPages > 1 && (
          <div className="p-4 flex items-center justify-between border-t">
            <div className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Dialog open={optInDialog.open} onOpenChange={(open) => !open && setOptInDialog({ open: false, comp: null })}>
        <DialogContent className="max-w-lg">
          <form onSubmit={handleOptIn}>
            <DialogHeader>
              <DialogTitle>Opt In to {optInDialog.comp?.title}</DialogTitle>
              <DialogDescription>
                Set your markup fee breakdown. This will be added to the base fee of ₹{optInDialog.comp?.baseFee}.
                {optInDialog.comp?.franchiseBenefit != null && optInDialog.comp?.franchiseBenefit !== "" ? (
                  <> Franchise benefit for this competition: {formatFranchiseBenefit(optInDialog.comp.franchiseBenefit)}.</>
                ) : null}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-3 rounded-md border bg-muted/40 p-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Competition Date</p>
                  <p className="font-medium">
                    {formatCompetitionDate(optInDialog.comp?.competitionDate)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Head Office Closing Date</p>
                  <p className="font-medium">
                    {formatCompetitionDate(
                      optInDialog.comp?.adminClosingDate || optInDialog.comp?.closingDate,
                    )}
                  </p>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="franchiseClosingDate">Your Centre Closing Date</Label>
                <Input
                  id="franchiseClosingDate"
                  type="date"
                  value={franchiseClosingDate}
                  min={today}
                  max={adminClosingDateInput || undefined}
                  onChange={(event) => setFranchiseClosingDate(event.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Must be on or before the head office closing date. Students at your centre
                  will see this deadline.
                </p>
              </div>
              <div className="space-y-4">
                <Label>Markup Fee Breakdown</Label>
                {markupItems.map((item, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Input
                      className="flex-1"
                      placeholder="Fee Name (e.g. Travel, Food)"
                      value={item.name}
                      onChange={(e) => {
                        const newItems = [...markupItems];
                        newItems[index].name = e.target.value;
                        setMarkupItems(newItems);
                      }}
                      required
                    />
                    <div className="relative w-[180px] shrink-0">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                      <Input
                        type="number"
                        min="0"
                        className="pl-7"
                        placeholder="Amount"
                        value={item.amount === 0 ? "" : item.amount}
                        onChange={(e) => {
                          const newItems = [...markupItems];
                          newItems[index].amount = Number(e.target.value);
                          setMarkupItems(newItems);
                        }}
                        required
                      />
                    </div>
                    <Button
                      type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          const newItems = markupItems.filter((_, i) => i !== index);
                          setMarkupItems(newItems);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full border-dashed"
                  onClick={() => setMarkupItems([...markupItems, { name: "", amount: 0 }])}
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Item
                </Button>
              </div>

              <div className="p-4 bg-muted rounded-md text-sm mt-2 border">
                <div className="flex justify-between mb-1 text-muted-foreground">
                  <span>Base Fee:</span>
                  <span>₹{optInDialog.comp?.baseFee}</span>
                </div>
                {optInDialog.comp?.franchiseBenefit != null && optInDialog.comp?.franchiseBenefit !== "" ? (
                  <div className="flex justify-between mb-1 text-emerald-700">
                    <span>Franchise Benefit:</span>
                    <span>{formatFranchiseBenefit(optInDialog.comp.franchiseBenefit)}</span>
                  </div>
                ) : null}
                {markupItems.length > 0 && currentTotalMarkup > 0 && (
                  <div className="flex justify-between mb-1 text-muted-foreground">
                    <span>Total Markup:</span>
                    <span>₹{currentTotalMarkup}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold border-t pt-2 mt-2 text-primary">
                  <span>Student Pays:</span>
                  <span>₹{Number(optInDialog.comp?.baseFee) + currentTotalMarkup}</span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={optInMutation.isPending}>
                {optInMutation.isPending ? "Saving..." : "Save & Opt In"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function FranchiseeCompetitionsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <div className="p-6">
        <CompetitionsSection />
      </div>
    </Suspense>
  );
}
