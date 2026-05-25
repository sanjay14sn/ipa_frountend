"use client";

import { Stepper } from "@/components/shared/stepper";

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

/**
 * Thin wrapper around the shared `Stepper` so the agreement onboarding flow
 * uses the same visual treatment as the admin "Setup Existing Franchise"
 * multi-step dialog. Local labels / query helpers above are unchanged so
 * callers keep their existing imports.
 */
export function AgreementStepper({ currentStep }: AgreementStepperProps) {
  const steps = AGREEMENT_STEP_LABELS.map((title, i) => ({
    id: i + 1,
    title,
  }));
  return <Stepper steps={steps} currentStep={currentStep} compact />;
}
