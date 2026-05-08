"use client";

import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const AGREEMENT_STEP_LABELS = [
  "Review",
  "Terms",
  "Sign",
  "Pay",
] as const;

export const AGREEMENT_STEP_QUERY = [
  "review",
  "terms",
  "sign",
  "pay",
] as const;

export type AgreementStepIndex = 1 | 2 | 3 | 4;

export function stepToQuery(step: AgreementStepIndex): (typeof AGREEMENT_STEP_QUERY)[number] {
  return AGREEMENT_STEP_QUERY[step - 1];
}

export function queryToStep(q: string | null): AgreementStepIndex | null {
  const i = AGREEMENT_STEP_QUERY.indexOf((q ?? "") as (typeof AGREEMENT_STEP_QUERY)[number]);
  return i >= 0 ? ((i + 1) as AgreementStepIndex) : null;
}

interface AgreementStepperProps {
  currentStep: AgreementStepIndex;
}

export function AgreementStepper({ currentStep }: AgreementStepperProps) {
  const steps = AGREEMENT_STEP_LABELS.map((title, i) => ({
    id: (i + 1) as AgreementStepIndex,
    title,
  }));

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className="flex flex-1 flex-col items-center">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border text-xs font-medium transition-all duration-200",
                  currentStep === step.id &&
                    "border-primary bg-primary text-primary-foreground shadow-sm",
                  currentStep > step.id &&
                    "border-primary bg-primary text-primary-foreground",
                  currentStep < step.id &&
                    "border-border bg-card text-muted-foreground",
                )}
              >
                {currentStep > step.id ? (
                  <Check className="h-4 w-4" strokeWidth={3} />
                ) : (
                  step.id
                )}
              </div>
              <div className="mt-2 max-w-[72px] text-center sm:max-w-none">
                <p
                  className={cn(
                    "text-[10px] font-medium leading-tight sm:text-xs",
                    currentStep >= step.id
                      ? "text-card-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {step.title}
                </p>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className="flex max-w-[40px] flex-1 items-center justify-center px-1 sm:max-w-[60px] sm:px-2">
                <div
                  className={cn(
                    "h-0.5 w-full transition-all duration-200",
                    currentStep > step.id ? "bg-primary" : "bg-border",
                  )}
                />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
