"use client";

import React, { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  Calculator,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Coins,
  DollarSign,
  HelpCircle,
  Receipt,
  Save,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

export type { FeeRuleType };

export type SessionCountOption = "3" | "4" | "5" | "custom";
export type CourseDurationOption = "level" | "custom";

interface FeeConfigurationFormProps {
  student: StudentData;
}

export function FeeConfigurationForm({ student }: FeeConfigurationFormProps) {
  // Section 1 - Fee Configuration State
  const [feeRule, setFeeRule] = useState<FeeRuleType>("REG_PLUS_FULL_COURSE");
  const [installmentDays, setInstallmentDays] = useState<number>(30);
  
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

        setFeeRule(existing.feeRule);
        setRegistrationFee(parseFeeAmount(existing.registrationFee));
        setCourseFee(parseFeeAmount(existing.courseFee));
        setStartDate(existing.startDate);
        setIsManualEndDate(existing.isManualEndDate);
        setManualEndDate(existing.endDate);
        setDurationOption(existing.durationOption);
        setCustomDurationMonths(existing.durationMonths);
        setSessionsOption(existing.sessionsOption);
        setCustomSessions(existing.sessionsPerMonth);
        setInstallmentDays(existing.installmentDays ?? 30);
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

      toast.success("Fee Configuration Saved Successfully!", {
        description: `Configured ₹${feeCalculation.totalPayable.toLocaleString(
          "en-IN"
        )} for ${student.name} (${student.rollNo}).`,
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
            <Badge variant="outline" className="bg-background text-xs font-semibold">
              Step 1 of 2
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Fee Rule Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              Fee Rule
              <span className="text-xs text-muted-foreground font-normal">(Select payment structure)</span>
            </Label>

            <RadioGroup
              value={feeRule}
              onValueChange={(val) => setFeeRule(val as FeeRuleType)}
              className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
            >
              {[
                {
                  id: "REG_PLUS_FULL_COURSE",
                  title: "Reg. + Full Course",
                  desc: "Registration Fee + Full Course Fee upfront",
                },
                {
                  id: "REG_PLUS_FIRST_MONTH",
                  title: "Reg. + 1st Month",
                  desc: "Registration Fee + First Month installment",
                },
                {
                  id: "REG_ONLY",
                  title: "Registration Only",
                  desc: "Reg Fee now, first installment after due period",
                },
                {
                  id: "CUSTOM",
                  title: "Custom Rule",
                  desc: "Fully customizable custom fee schedule",
                },
              ].map((rule) => {
                const isSelected = feeRule === rule.id;
                return (
                  <Label
                    key={rule.id}
                    htmlFor={rule.id}
                    className={`flex flex-col h-full justify-between rounded-xl border p-4 cursor-pointer transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border/60 hover:border-border hover:bg-muted/20"
                    }`}
                  >
                    <RadioGroupItem value={rule.id} id={rule.id} className="sr-only" />
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-foreground">{rule.title}</span>
                        {isSelected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{rule.desc}</p>
                    </div>
                  </Label>
                );
              })}
            </RadioGroup>
          </div>

          <Separator className="bg-border/60" />

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
                  disabled={feeRule === "REG_ONLY"}
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
            </div>
          </div>

          {(feeRule === "REG_ONLY" || feeRule === "REG_PLUS_FIRST_MONTH") && (
            <div className="space-y-1.5 max-w-xs">
              <Label htmlFor="installmentDays" className="text-xs font-semibold text-foreground">
                Installment Due After (days)
              </Label>
              <Input
                id="installmentDays"
                type="number"
                min={1}
                max={365}
                value={installmentDays}
                onChange={(e) => setInstallmentDays(Math.max(1, Number(e.target.value) || 30))}
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
            <Badge variant="outline" className="bg-background text-xs font-semibold">
              Step 2 of 2
            </Badge>
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
                onChange={(e) => setStartDate(e.target.value)}
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
