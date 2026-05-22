"use client"

/**
 * Thin re-export of the shared Stepper for backwards compatibility with the dialog system.
 * Prefer importing `Stepper` directly from `@/components/shared/stepper` for non-dialog use.
 */

export { Stepper as DialogStepper, type StepDef, type StepperProps as DialogStepperProps } from "@/components/shared/stepper"
