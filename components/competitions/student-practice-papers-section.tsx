"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, LockOpen, ShoppingCart } from "lucide-react";
import Link from "next/link";

import { api } from "@/lib/axios";
import { formatRupees } from "@/lib/currency-utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageSkeleton } from "@/components/shared";
import type { PracticePaperPricingPlan } from "@/components/competitions/practice-paper-pricing-section";

type StudentPracticeAccess = {
  remainingCredits: number;
  mapping: {
    id: number;
    paper: string;
    stream: string;
    level: string;
    levelMatchMode: string;
  } | null;
  studentContext: {
    stream: string;
    currentLevel: string;
    completedLevel: string | null;
    month: number | null;
  } | null;
  questionPapers: Array<{ id: string; name: string; unlocked: boolean }>;
  nextQuestionPaper: { id: string; name: string; unlocked: boolean } | null;
  canUnlock: boolean;
  unlocks: Array<{
    id: number;
    questionPaperName: string;
    unlockedAt: string;
  }>;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpayScript() {
  return new Promise<void>((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay"));
    document.body.appendChild(script);
  });
}

export function StudentPracticePapersSection({ studentId }: { studentId: number }) {
  const queryClient = useQueryClient();
  const [buyingPlanId, setBuyingPlanId] = useState<number | null>(null);

  const { data: access, isLoading: accessLoading } = useQuery({
    queryKey: ["student-practice-access", studentId],
    queryFn: async () => {
      const res = await api.get(`/competitions/practice-pricing/students/${studentId}/balance`);
      return (res.data?.result || res.data?.data || res.data) as StudentPracticeAccess;
    },
  });

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ["practice-paper-pricing-plans-active"],
    queryFn: async () => {
      const res = await api.get("/competitions/practice-pricing/plans/active");
      return (res.data?.result || res.data?.data || res.data || []) as PracticePaperPricingPlan[];
    },
  });

  const unlockMutation = useMutation({
    mutationFn: async () =>
      api.post(`/competitions/practice-pricing/students/${studentId}/unlock`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-practice-access", studentId] });
      toast.success("Question paper unlocked");
    },
    onError: (err: unknown) => {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(message || "Failed to unlock question paper");
    },
  });

  const purchaseMutation = useMutation({
    mutationFn: async (planId: number) => {
      setBuyingPlanId(planId);
      const res = await api.post("/competitions/practice-pricing/purchase", {
        studentId,
        planId,
      });
      return res.data?.result || res.data?.data || res.data;
    },
    onSuccess: async (data) => {
      if (!data?.amount || Number(data.amount) <= 0) {
        queryClient.invalidateQueries({ queryKey: ["student-practice-access", studentId] });
        const unlocked = data?.unlockedCount ?? data?.creditsGranted ?? 0;
        toast.success(
          unlocked > 0
            ? `${unlocked} question paper${unlocked === 1 ? "" : "s"} unlocked`
            : "Credits added",
        );
        setBuyingPlanId(null);
        return;
      }

      if (!data?.razorpayOrderId || !data?.keyId) {
        toast.error("Payment could not be started");
        setBuyingPlanId(null);
        return;
      }

      try {
        await loadRazorpayScript();
        const rzp = new window.Razorpay!({
          key: data.keyId,
          amount: Math.round(Number(data.amount) * 100),
          currency: "INR",
          name: "IPA Practice Papers",
          description: "Practice question paper credits",
          order_id: data.razorpayOrderId,
          handler: async (response: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            try {
              await api.post("/competitions/practice-pricing/verify-payment", {
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              });
              queryClient.invalidateQueries({ queryKey: ["student-practice-access", studentId] });
              toast.success("Payment successful — credits added");
            } catch {
              toast.error("Payment verification failed");
            } finally {
              setBuyingPlanId(null);
            }
          },
          modal: {
            ondismiss: () => setBuyingPlanId(null),
          },
        });
        rzp.open();
      } catch {
        toast.error("Failed to open payment gateway");
        setBuyingPlanId(null);
      }
    },
    onError: (err: unknown) => {
      setBuyingPlanId(null);
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(message || "Failed to start purchase");
    },
  });

  const sortedPlans = useMemo(
    () => [...(plans ?? [])].sort((a, b) => a.displayOrder - b.displayOrder),
    [plans],
  );

  if (accessLoading || plansLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Practice papers</h1>
          <p className="text-sm text-muted-foreground">
            Buy question-paper credits and unlock practice content for this student&apos;s level.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/franchisee/students">Back to students</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Available credits</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {access?.remainingCredits ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Mapped paper</CardDescription>
            <CardTitle className="text-lg">
              {access?.mapping
                ? `${access.mapping.paper} · ${access.mapping.stream} · ${access.mapping.level}`
                : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {access?.studentContext
              ? `Current level: ${access.studentContext.currentLevel}${
                  access.studentContext.month ? ` · Month ${access.studentContext.month}` : ""
                }`
              : "No mapping resolved yet"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Next unlock</CardDescription>
            <CardTitle className="text-lg truncate">
              {access?.nextQuestionPaper?.name ?? "None available"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              disabled={!access?.canUnlock || unlockMutation.isPending}
              onClick={() => unlockMutation.mutate()}
            >
              {unlockMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LockOpen className="mr-2 h-4 w-4" />
              )}
              Unlock next QP
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buy a pack</CardTitle>
          <CardDescription>
            Same pricing for all students. Credits unlock question papers from the mapped paper.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {sortedPlans.map((plan) => {
            const total = plan.paidQuestionPapers + plan.bonusQuestionPapers;
            return (
              <div
                key={plan.id}
                className="rounded-lg border p-4 flex flex-col gap-3"
              >
                <div>
                  <p className="font-semibold">{plan.name}</p>
                  {plan.description ? (
                    <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{plan.paidQuestionPapers} paid QPs</Badge>
                  {plan.bonusQuestionPapers > 0 ? (
                    <Badge variant="outline">+{plan.bonusQuestionPapers} bonus</Badge>
                  ) : null}
                  <Badge>{total} total credits</Badge>
                </div>
                <div className="flex items-center justify-between mt-auto pt-2">
                  <span className="font-mono font-semibold">{formatRupees(plan.priceInr)}</span>
                  <Button
                    size="sm"
                    disabled={purchaseMutation.isPending && buyingPlanId === plan.id}
                    onClick={() => purchaseMutation.mutate(plan.id)}
                  >
                    {purchaseMutation.isPending && buyingPlanId === plan.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ShoppingCart className="mr-2 h-4 w-4" />
                    )}
                    Buy
                  </Button>
                </div>
              </div>
            );
          })}
          {sortedPlans.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active pricing plans configured.</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Question papers</CardTitle>
          <CardDescription>Unlock status for this student&apos;s mapped paper</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {(access?.questionPapers ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No generated question papers on the mapped paper yet.
            </p>
          ) : (
            access?.questionPapers.map((paper) => (
              <div
                key={paper.id}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <span>{paper.name}</span>
                <Badge variant={paper.unlocked ? "default" : "outline"}>
                  {paper.unlocked ? "Unlocked" : "Locked"}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
