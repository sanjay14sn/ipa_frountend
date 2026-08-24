"use client";

import { useMemo } from "react";
import { Calculator, Calendar as CalendarIcon, CheckCircle2, Clock, Sparkles } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { formatRupees } from "@/lib/currency-utils";
import {
  addMonthsToDate,
  computeFeeTotals,
  parseFeeAmount,
  resolveLevelDurationMonths,
  type FeeRuleType,
} from "@/lib/student-fee-calculations";
import type { Level } from "@/services/level.service";

export type SessionCountOption = "3" | "4" | "5" | "custom";
export type CourseDurationOption = "level" | "custom";

export interface StudentFeeSetupData {
  feeRule: FeeRuleType;
  registrationFee: number;
  courseFee: number;
  startDate: string;
  isManualEndDate: boolean;
  manualEndDate: string;
  durationOption: CourseDurationOption;
  customDurationMonths: number;
  sessionsOption: SessionCountOption;
  customSessions: number;
  installmentDays: number;
}

export const DEFAULT_FEE_SETUP: StudentFeeSetupData = {
  feeRule: "REG_PLUS_FULL_COURSE",
  registrationFee: 1000,
  courseFee: 6000,
  startDate: new Date().toISOString().split("T")[0],
  isManualEndDate: false,
  manualEndDate: "",
  durationOption: "level",
  customDurationMonths: 4,
  sessionsOption: "4",
  customSessions: 8,
  installmentDays: 30,
};

interface StudentFeeSetupFieldsProps {
  value: StudentFeeSetupData;
  onChange: (patch: Partial<StudentFeeSetupData>) => void;
  level: Level | null;
  errors?: Record<string, string>;
}

export function StudentFeeSetupFields({
  value,
  onChange,
  level,
  errors = {},
}: StudentFeeSetupFieldsProps) {
  const levelInfo = useMemo(
    () => ({
      name: level?.name || level?.code || "Level Duration",
      duration: resolveLevelDurationMonths(level),
    }),
    [level],
  );

  const effectiveMonths = useMemo(() => {
    if (value.durationOption === "level") return levelInfo.duration;
    return Math.max(1, value.customDurationMonths || 1);
  }, [value.durationOption, value.customDurationMonths, levelInfo.duration]);

  const effectiveSessionsPerMonth = useMemo(() => {
    if (value.sessionsOption === "3") return 3;
    if (value.sessionsOption === "4") return 4;
    if (value.sessionsOption === "5") return 5;
    return Math.max(1, value.customSessions || 1);
  }, [value.sessionsOption, value.customSessions]);

  const autoEndDate = useMemo(
    () => addMonthsToDate(value.startDate, effectiveMonths),
    [value.startDate, effectiveMonths],
  );

  const effectiveEndDate = value.isManualEndDate
    ? value.manualEndDate
    : autoEndDate;

  const feeCalculation = useMemo(
    () =>
      computeFeeTotals({
        feeRule: value.feeRule,
        registrationFee: value.registrationFee,
        courseFee: value.courseFee,
        durationMonths: effectiveMonths,
      }),
    [value.feeRule, value.registrationFee, value.courseFee, effectiveMonths],
  );

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Fee Rule</Label>
        <RadioGroup
          value={value.feeRule}
          onValueChange={(feeRule) =>
            onChange({ feeRule: feeRule as FeeRuleType })
          }
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          {[
            {
              id: "REG_PLUS_FULL_COURSE",
              title: "Reg. + Full Course",
              desc: "Registration + full course fee upfront",
            },
            {
              id: "REG_PLUS_FIRST_MONTH",
              title: "Reg. + 1st Month",
              desc: "Registration + first month installment",
            },
            {
              id: "REG_ONLY",
              title: "Registration Only",
              desc: "Registration now, installments later",
            },
            {
              id: "CUSTOM",
              title: "Custom Rule",
              desc: "Custom fee schedule",
            },
          ].map((rule) => {
            const isSelected = value.feeRule === rule.id;
            return (
              <Label
                key={rule.id}
                htmlFor={`fee-rule-${rule.id}`}
                className={`flex flex-col rounded-xl border p-4 cursor-pointer transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border/60 hover:border-border hover:bg-muted/20"
                }`}
              >
                <RadioGroupItem
                  value={rule.id}
                  id={`fee-rule-${rule.id}`}
                  className="sr-only"
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm">{rule.title}</span>
                  {isSelected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{rule.desc}</p>
              </Label>
            );
          })}
        </RadioGroup>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="registrationFee">Registration Fee (₹) *</Label>
          <Input
            id="registrationFee"
            type="number"
            min={0}
            value={value.registrationFee || ""}
            onChange={(e) =>
              onChange({ registrationFee: parseFeeAmount(e.target.value) })
            }
            className={errors.registrationFee ? "border-red-500" : ""}
          />
          {errors.registrationFee && (
            <p className="text-red-500 text-sm">{errors.registrationFee}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="courseFee">Course / Level Fee (₹) *</Label>
          <Input
            id="courseFee"
            type="number"
            min={0}
            disabled={value.feeRule === "REG_ONLY"}
            value={value.courseFee || ""}
            onChange={(e) =>
              onChange({ courseFee: parseFeeAmount(e.target.value) })
            }
            className={errors.courseFee ? "border-red-500" : ""}
          />
          {errors.courseFee && (
            <p className="text-red-500 text-sm">{errors.courseFee}</p>
          )}
        </div>
      </div>

      {(value.feeRule === "REG_ONLY" ||
        value.feeRule === "REG_PLUS_FIRST_MONTH") && (
        <div className="space-y-1.5 max-w-xs">
          <Label htmlFor="installmentDays">Installment Due After (days)</Label>
          <Input
            id="installmentDays"
            type="number"
            min={1}
            max={365}
            value={value.installmentDays}
            onChange={(e) =>
              onChange({
                installmentDays: Math.max(1, Number(e.target.value) || 30),
              })
            }
          />
        </div>
      )}

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Calculator className="h-4 w-4 text-primary" />
          Total Payable (Auto Calculated)
        </div>
        <ul className="space-y-1 text-sm">
          {feeCalculation.breakdownParts.map((part) => (
            <li key={part}>{part}</li>
          ))}
          <li className="font-medium">
            Monthly installment: {formatRupees(feeCalculation.monthlyFee)}
          </li>
        </ul>
        <div className="rounded-lg bg-primary px-4 py-3 text-primary-foreground">
          <span className="text-xs opacity-90">Due now</span>
          <p className="text-xl font-bold">
            {formatRupees(feeCalculation.totalPayable)}
          </p>
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="feeStartDate">Start Date *</Label>
          <Input
            id="feeStartDate"
            type="date"
            value={value.startDate}
            onChange={(e) => onChange({ startDate: e.target.value })}
            className={errors.startDate ? "border-red-500" : ""}
          />
          {errors.startDate && (
            <p className="text-red-500 text-sm">{errors.startDate}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="feeEndDate">
              End Date {value.isManualEndDate ? "(Manual)" : "(Auto)"}
            </Label>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Manual override</span>
              <Switch
                checked={value.isManualEndDate}
                onCheckedChange={(checked) =>
                  onChange({ isManualEndDate: checked })
                }
              />
            </div>
          </div>
          <Input
            id="feeEndDate"
            type="date"
            disabled={!value.isManualEndDate}
            value={effectiveEndDate}
            onChange={(e) => onChange({ manualEndDate: e.target.value })}
            className={errors.manualEndDate ? "border-red-500" : ""}
          />
          {errors.manualEndDate && (
            <p className="text-red-500 text-sm">{errors.manualEndDate}</p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <Label className="flex items-center justify-between">
          <span>Course Duration</span>
          <span className="text-xs font-normal text-muted-foreground">
            Effective: {effectiveMonths} months
          </span>
        </Label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            {
              value: "level" as const,
              label: `${levelInfo.name} (${levelInfo.duration} months)`,
            },
            { value: "custom" as const, label: "Custom" },
          ].map((item) => (
            <Button
              key={item.value}
              type="button"
              variant={value.durationOption === item.value ? "default" : "outline"}
              onClick={() => onChange({ durationOption: item.value })}
              className="h-11"
            >
              {item.label}
            </Button>
          ))}
        </div>
        {value.durationOption === "custom" && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-primary" />
            <Input
              type="number"
              min={1}
              max={36}
              value={value.customDurationMonths}
              onChange={(e) =>
                onChange({ customDurationMonths: Number(e.target.value) || 1 })
              }
              className="h-9 w-20 text-center"
            />
            <span>months</span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <Label className="flex items-center justify-between">
          <span>Sessions Per Month</span>
          <span className="text-xs font-normal text-muted-foreground">
            {effectiveSessionsPerMonth} sessions / month
          </span>
        </Label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { value: "3" as const, label: "3" },
            { value: "4" as const, label: "4" },
            { value: "5" as const, label: "5" },
            { value: "custom" as const, label: "Custom" },
          ].map((item) => (
            <Button
              key={item.value}
              type="button"
              variant={value.sessionsOption === item.value ? "default" : "outline"}
              onClick={() => onChange({ sessionsOption: item.value })}
              className="h-11"
            >
              {item.label}
            </Button>
          ))}
        </div>
        {value.sessionsOption === "custom" && (
          <div className="flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            <Input
              type="number"
              min={1}
              max={31}
              value={value.customSessions}
              onChange={(e) =>
                onChange({ customSessions: Number(e.target.value) || 1 })
              }
              className="h-9 w-20 text-center"
            />
            <span>per month</span>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <CalendarIcon className="h-3.5 w-3.5" />
        Fee setup is saved when you register the student.
      </p>
    </div>
  );
}

export function buildFeeSetupPayload(
  value: StudentFeeSetupData,
  level: Level | null,
) {
  const effectiveMonths =
    value.durationOption === "level"
      ? resolveLevelDurationMonths(level)
      : Math.max(1, value.customDurationMonths || 1);
  const effectiveSessionsPerMonth =
    value.sessionsOption === "3"
      ? 3
      : value.sessionsOption === "4"
        ? 4
        : value.sessionsOption === "5"
          ? 5
          : Math.max(1, value.customSessions || 1);
  const autoEndDate = addMonthsToDate(value.startDate, effectiveMonths);
  const effectiveEndDate = value.isManualEndDate
    ? value.manualEndDate
    : autoEndDate;

  return {
    feeRule: value.feeRule,
    registrationFee: value.registrationFee,
    courseFee: value.courseFee,
    startDate: value.startDate,
    endDate: effectiveEndDate,
    isManualEndDate: value.isManualEndDate,
    durationOption: value.durationOption,
    durationMonths: effectiveMonths,
    sessionsOption: value.sessionsOption,
    sessionsPerMonth: effectiveSessionsPerMonth,
    installmentDays: value.installmentDays,
  };
}
