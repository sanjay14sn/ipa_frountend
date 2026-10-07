"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Calculator,
  Calendar as CalendarIcon,
  Clock,
  Coins,
  Save,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { StudentData } from "@/services/student-list.service";
import {
  fetchStudentFeeConfiguration,
  saveStudentFeeConfiguration,
} from "@/services/student-fee.service";
import { formatRupees } from "@/lib/currency-utils";
import {
  addMonthsToDate,
  computeFeeTotals,
  parseFeeAmount,
  resolveLevelDurationMonths,
  type FeeRuleType,
} from "@/lib/student-fee-calculations";
import { queryKeys } from "@/hooks/api/query-keys";

export type { FeeRuleType };

export type SessionCountOption = "3" | "4" | "5" | "custom";
export type CourseDurationOption = "level" | "custom";

const FEE_RULE_OPTIONS: { value: FeeRuleType; label: string }[] = [
  { value: "REG_PLUS_FULL_COURSE", label: "Registration + Full Fee" },
  { value: "REG_PLUS_FIRST_MONTH", label: "Registration + First Month" },
  { value: "REG_ONLY", label: "Registration Only" },
];

function selectableFeeRule(rule: FeeRuleType): FeeRuleType {
  return FEE_RULE_OPTIONS.some((option) => option.value === rule)
    ? rule
    : "REG_PLUS_FIRST_MONTH";
}

function addDaysIso(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return isoDate;
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function daysBetweenIso(start: string, end: string): number {
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  if (!sy || !sm || !sd || !ey || !em || !ed) return 30;
  const startUtc = Date.UTC(sy, sm - 1, sd);
  const endUtc = Date.UTC(ey, em - 1, ed);
  return Math.round((endUtc - startUtc) / 86_400_000);
}

interface FeeConfigurationFormProps {
  student: StudentData;
}

export function FeeConfigurationForm({ student }: FeeConfigurationFormProps) {
  const queryClient = useQueryClient();

  const [feeRule, setFeeRule] = useState<FeeRuleType>("REG_PLUS_FIRST_MONTH");
  const [installmentDays, setInstallmentDays] = useState<number>(30);
  const [firstInstallmentDate, setFirstInstallmentDate] = useState<string>(() =>
    addDaysIso(new Date().toISOString().split("T")[0], 30),
  );
  
  const [registrationFee, setRegistrationFee] = useState<number>(1000);
  const [courseFee, setCourseFee] = useState<number>(6000);

  const levelInfo = useMemo(() => {
    if (typeof student.level === "object" && student.level !== null) {
      return {
        name: student.level.name || student.level.code || "Level Duration",
        duration: resolveLevelDurationMonths(student.level),
      };
    }
    const nameStr = typeof student.level === "string" ? student.level : "Level Duration";
    return {
      name: nameStr,
      duration: resolveLevelDurationMonths(null),
    };
  }, [student.level]);

  // Section 2 - Course Duration State
  const todayStr = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [isManualEndDate, setIsManualEndDate] = useState<boolean>(false);
  const [manualEndDate, setManualEndDate] = useState<string>("");

  const [sessionsOption, setSessionsOption] = useState<SessionCountOption>("4");
  const [customSessions, setCustomSessions] = useState<number>(8);

  const [durationOption, setDurationOption] = useState<CourseDurationOption>("level");
  const [customDurationMonths, setCustomDurationMonths] = useState<number>(4);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;

    async function loadExistingConfiguration() {
      setIsLoading(true);
      try {
        const existing = await fetchStudentFeeConfiguration(student.id);
        if (cancelled || !existing) return;

        setFeeRule(selectableFeeRule(existing.feeRule));
        setRegistrationFee(parseFeeAmount(existing.registrationFee));
        setCourseFee(parseFeeAmount(existing.courseFee));
        setStartDate(existing.startDate);
        setIsManualEndDate(existing.isManualEndDate);
        setManualEndDate(existing.endDate);
        setDurationOption(existing.durationOption);
        setCustomDurationMonths(existing.durationMonths);
        setSessionsOption(existing.sessionsOption);
        setCustomSessions(existing.sessionsPerMonth);
        const savedGap = existing.installmentDays ?? 30;
        setInstallmentDays(savedGap);
        setFirstInstallmentDate(addDaysIso(existing.startDate, savedGap));
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load fee configuration", err);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadExistingConfiguration();
    return () => {
      cancelled = true;
    };
  }, [student.id]);

  // Effective Duration in Months
  const effectiveMonths = useMemo(() => {
    if (durationOption === "level") return levelInfo.duration;
    return Math.max(1, customDurationMonths || 1);
  }, [durationOption, levelInfo.duration, customDurationMonths]);

  // Effective Sessions Per Month
  const effectiveSessionsPerMonth = useMemo(() => {
    if (sessionsOption === "3") return 3;
    if (sessionsOption === "4") return 4;
    if (sessionsOption === "5") return 5;
    return Math.max(1, customSessions || 1);
  }, [sessionsOption, customSessions]);

  const autoEndDate = useMemo(
    () => addMonthsToDate(startDate, effectiveMonths),
    [startDate, effectiveMonths],
  );

  const effectiveEndDate = isManualEndDate ? manualEndDate : autoEndDate;

  const feeCalculation = useMemo(
    () =>
      computeFeeTotals({
        feeRule,
        registrationFee,
        courseFee,
        durationMonths: effectiveMonths,
      }),
    [feeRule, registrationFee, courseFee, effectiveMonths],
  );

  const planTotal = useMemo(
    () =>
      parseFeeAmount(registrationFee) + parseFeeAmount(courseFee),
    [registrationFee, courseFee],
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await saveStudentFeeConfiguration(student.id, {
        feeRule,
        registrationFee,
        courseFee,
        startDate,
        endDate: effectiveEndDate,
        isManualEndDate,
        durationOption,
        durationMonths: effectiveMonths,
        sessionsOption,
        sessionsPerMonth: effectiveSessionsPerMonth,
        installmentDays,
      });

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.students.feeSummaries,
        }),
        queryClient.invalidateQueries({ queryKey: ["student-fee-history"] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.students.all }),
      ]);

      toast.success("Fee Configuration Saved Successfully!", {
        description: `Fee Dues and installment history will use this plan (₹${planTotal.toLocaleString("en-IN")} total).`,
      });
    } catch (err) {
      toast.error("Failed to save fee configuration", {
        description: err instanceof Error ? err.message : "Unexpected error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-8">
      {isLoading ? (
        <div className="rounded-xl border border-border/60 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          Loading saved fee configuration...
        </div>
      ) : (
        <>
      {/* SECTION 1: FEE CONFIGURATION */}
      <Card className="border-border/60 shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-border/40 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Coins className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Section 1 – Fee Configuration</CardTitle>
                <CardDescription className="text-xs">
                  Active for student: <strong className="text-foreground">{student.name}</strong> ({student.rollNo})
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {FEE_RULE_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={feeRule === option.value ? "default" : "outline"}
                onClick={() => setFeeRule(option.value)}
                className="h-auto min-h-12 whitespace-normal px-3 py-2 text-center text-sm font-semibold"
              >
                {option.label}
              </Button>
            ))}
          </div>

          {/* Fee Amounts Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Registration Fee */}
            <div className="space-y-1.5">
              <Label htmlFor="regFee" className="text-xs font-semibold text-foreground">
                Registration Fee (₹)
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-muted-foreground">₹</span>
                <Input
                  id="regFee"
                  type="number"
                  min={0}
                  value={registrationFee || ""}
                  onChange={(e) => setRegistrationFee(parseFeeAmount(e.target.value))}
                  className="pl-7 h-10"
                />
              </div>
            </div>

            {/* Course / Level Fee */}
            <div className="space-y-1.5">
              <Label htmlFor="courseFee" className="text-xs font-semibold text-foreground">
                Course / Level Fee (₹)
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-muted-foreground">₹</span>
                <Input
                  id="courseFee"
                  type="number"
                  min={0}
                  value={courseFee || ""}
                  onChange={(e) => setCourseFee(parseFeeAmount(e.target.value))}
                  className="pl-7 h-10"
                />
              </div>
            </div>
          </div>

          {/* Auto Calculate Total Summary Card */}
          <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/5 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-border/50">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Calculator className="h-4 w-4 text-primary" />
                Total Payable (Auto Calculated)
              </span>
              <Badge variant="secondary" className="bg-primary/10 text-primary text-xs font-medium">
                Real-Time Calculation
              </Badge>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {feeCalculation.breakdownLabel}
                </span>
                <ul className="mt-2 space-y-1 text-xs text-foreground">
                  {feeCalculation.breakdownParts.map((part) => (
                    <li key={part}>{part}</li>
                  ))}
                  <li className="font-medium">
                    Monthly installment: {formatRupees(feeCalculation.monthlyFee)}
                  </li>
                </ul>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs items-center">
                <div>
                  <span className="text-muted-foreground">Monthly Fee (auto):</span>
                  <p className="text-sm font-semibold text-foreground mt-0.5">
                    {formatRupees(feeCalculation.monthlyFee)}
                  </p>
                </div>

                <div className="rounded-lg bg-primary p-3 text-primary-foreground text-right sm:text-left">
                  <span className="text-[11px] opacity-90 block">Final Total Payable (due now):</span>
                  <p className="text-lg font-black tracking-tight mt-0.5">
                    {formatRupees(feeCalculation.totalPayable)}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-border/70 bg-muted/20 p-3 text-xs">
                <p className="font-semibold text-foreground">
                  Full plan total (Fee Dues): {formatRupees(planTotal)}
                </p>
                <p className="mt-1 text-muted-foreground">
                  Registration {formatRupees(registrationFee)} + course{" "}
                  {formatRupees(courseFee)} over {effectiveMonths} month
                  {effectiveMonths === 1 ? "" : "s"}
                  {feeRule === "REG_ONLY"
                    ? ` · ${effectiveMonths} monthly installment${effectiveMonths === 1 ? "" : "s"} of ${formatRupees(feeCalculation.monthlyFee)} after registration`
                    : feeRule === "REG_PLUS_FIRST_MONTH"
                      ? ` · due now ${formatRupees(feeCalculation.totalPayable)} (reg + 1st month), then ${Math.max(0, effectiveMonths - 1)} monthly installment${effectiveMonths - 1 === 1 ? "" : "s"} of ${formatRupees(feeCalculation.monthlyFee)}`
                      : null}
                </p>
                <Button variant="link" className="mt-1 h-auto p-0 text-primary" asChild>
                  <Link href={`/franchisee/fee-dues/${student.id}`}>
                    View Fee Dues &amp; installment history
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {feeRule !== "REG_PLUS_FULL_COURSE" && (
          <div className="space-y-1.5 max-w-xs">
            <Label htmlFor="firstInstallmentDate" className="text-xs font-semibold text-foreground">
              First Installment Date
            </Label>
            <Input
              id="firstInstallmentDate"
              type="date"
              min={startDate || undefined}
              value={firstInstallmentDate}
              onChange={(e) => {
                const next = e.target.value;
                if (!next) return;
                const gap = daysBetweenIso(startDate, next);
                if (gap < 1) {
                  setFirstInstallmentDate(addDaysIso(startDate, 1));
                  setInstallmentDays(1);
                  return;
                }
                setFirstInstallmentDate(next);
                setInstallmentDays(Math.min(365, gap));
              }}
              className="h-10"
            />
          </div>
          )}
        </CardContent>
      </Card>

      {/* SECTION 2: COURSE DURATION */}
      <Card className="border-border/60 shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-border/40 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <CalendarIcon className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Section 2 – Course Duration</CardTitle>
                <CardDescription className="text-xs">
                  Configure training timeline and monthly class schedules.
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Start & End Dates */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="startDate" className="text-xs font-semibold text-foreground">
                Start Date
              </Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => {
                  const next = e.target.value;
                  setStartDate(next);
                  if (daysBetweenIso(next, firstInstallmentDate) < 1) {
                    setFirstInstallmentDate(addDaysIso(next, installmentDays || 30));
                  }
                }}
                className="h-10"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="endDate" className="text-xs font-semibold text-foreground">
                  End Date {isManualEndDate ? "(Manual)" : "(Auto Calculated)"}
                </Label>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground text-[11px]">Manual Override</span>
                  <Switch
                    checked={isManualEndDate}
                    onCheckedChange={setIsManualEndDate}
                    aria-label="Toggle Manual End Date"
                  />
                </div>
              </div>

              <Input
                id="endDate"
                type="date"
                disabled={!isManualEndDate}
                value={effectiveEndDate}
                onChange={(e) => setManualEndDate(e.target.value)}
                className={`h-10 ${!isManualEndDate ? "bg-muted/40 font-medium" : ""}`}
              />
            </div>
          </div>

          <Separator className="bg-border/60" />

          {/* Course Duration Selector */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-foreground flex items-center justify-between">
              <span>Course Duration</span>
              <span className="text-xs text-muted-foreground font-normal">
                Effective: <strong className="text-foreground">{effectiveMonths} Months</strong>
              </span>
            </Label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { value: "level", label: `${levelInfo.name} (${levelInfo.duration} Months)` },
                { value: "custom", label: "Custom" },
              ].map((item) => {
                const isSelected = durationOption === item.value;
                return (
                  <Button
                    key={item.value}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    onClick={() => setDurationOption(item.value as CourseDurationOption)}
                    className="h-12 flex-col gap-0.5 font-semibold text-sm"
                  >
                    {item.label}
                  </Button>
                );
              })}
            </div>

            {durationOption === "custom" && (
              <div className="mt-3 flex items-center gap-3 p-3 rounded-lg border border-primary/20 bg-primary/5 max-w-sm">
                <Clock className="h-4 w-4 text-primary shrink-0" />
                <div className="flex items-center gap-2 text-xs font-medium">
                  <span>Custom Duration:</span>
                  <Input
                    type="number"
                    min={1}
                    max={36}
                    value={customDurationMonths}
                    onChange={(e) => setCustomDurationMonths(Number(e.target.value))}
                    className="h-8 w-20 bg-background text-center text-xs"
                  />
                  <span>Months</span>
                </div>
              </div>
            )}
          </div>

          <Separator className="bg-border/60" />

          {/* Sessions Per Month Selector */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-foreground flex items-center justify-between">
              <span>Sessions Per Month</span>
              <span className="text-xs text-muted-foreground font-normal">
                Selected: <strong className="text-foreground">{effectiveSessionsPerMonth} Sessions / Month</strong>
              </span>
            </Label>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { value: "3", label: "3 Sessions" },
                { value: "4", label: "4 Sessions" },
                { value: "5", label: "5 Sessions" },
                { value: "custom", label: "Custom" },
              ].map((item) => {
                const isSelected = sessionsOption === item.value;
                return (
                  <Button
                    key={item.value}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    onClick={() => setSessionsOption(item.value as SessionCountOption)}
                    className="h-12 flex-col gap-0.5 font-semibold text-sm"
                  >
                    {item.label}
                  </Button>
                );
              })}
            </div>

            {sessionsOption === "custom" && (
              <div className="mt-3 flex items-center gap-3 p-3 rounded-lg border border-primary/20 bg-primary/5 max-w-sm">
                <Sparkles className="h-4 w-4 text-primary shrink-0" />
                <div className="flex items-center gap-2 text-xs font-medium">
                  <span>Custom Sessions:</span>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={customSessions}
                    onChange={(e) => setCustomSessions(Number(e.target.value))}
                    className="h-8 w-20 bg-background text-center text-xs"
                  />
                  <span>per Month</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* FORM SUBMISSION BAR */}
      <div className="flex items-center justify-end gap-3">
        <Button
          type="submit"
          size="lg"
          disabled={isSaving || isLoading}
          className="px-8 font-bold text-sm shadow-md"
        >

          {isSaving ? (
            "Saving..."
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Fee Configuration
            </>
          )}
        </Button>
      </div>
        </>
      )}
    </form>
  );
}
