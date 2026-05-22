"use client"

import * as React from "react"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

export interface StepDef {
  id: number
  title: string
}

export interface StepperProps {
  steps: StepDef[]
  /** 1-indexed current step */
  currentStep: number
  /** Hide step labels under 480px (still visible at sm+). */
  compact?: boolean
  /** Wrap the stepper in the standard tinted card container. Default true. */
  framed?: boolean
  className?: string
}

const STEP_BUBBLE_BASE =
  "flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors"
const STEP_BUBBLE_ACTIVE =
  "border-primary bg-primary text-primary-foreground shadow-sm"
const STEP_BUBBLE_COMPLETE =
  "border-primary bg-primary text-primary-foreground"
const STEP_BUBBLE_IDLE = "border-border bg-card text-muted-foreground"

const CONNECTOR_BASE = "h-0.5 flex-1 transition-colors -mt-5"
const CONNECTOR_ACTIVE = "bg-primary"
const CONNECTOR_IDLE = "bg-border"

const STEP_LABEL_BASE = "text-xs font-medium text-center truncate w-full font-sans"
const STEP_LABEL_ACTIVE = "text-primary"
const STEP_LABEL_IDLE = "text-muted-foreground"

/**
 * Numbered horizontal stepper. Uses brand-green tokens. Works inside dialogs OR
 * anywhere else in the app (wizards, onboarding pages, settings tabs, etc.).
 *
 * Pass `framed={false}` to render bare bubbles without the tinted card wrapper —
 * useful when embedding inside a section that already has its own background.
 */
export function Stepper({
  steps,
  currentStep,
  compact,
  framed = true,
  className,
}: StepperProps) {
  const inner = (
    <div className={cn("flex items-center justify-between gap-2", className)}>
      {steps.map((step, i) => {
        const isComplete = currentStep > step.id
        const isActive = currentStep === step.id
        const isLast = i === steps.length - 1

        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
              <div
                className={cn(
                  STEP_BUBBLE_BASE,
                  isComplete && STEP_BUBBLE_COMPLETE,
                  isActive && STEP_BUBBLE_ACTIVE,
                  !isComplete && !isActive && STEP_BUBBLE_IDLE
                )}
                aria-current={isActive ? "step" : undefined}
              >
                {isComplete ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span>{step.id}</span>
                )}
              </div>
              <div
                className={cn(
                  STEP_LABEL_BASE,
                  isActive || isComplete
                    ? STEP_LABEL_ACTIVE
                    : STEP_LABEL_IDLE,
                  compact && "hidden sm:block"
                )}
                title={step.title}
              >
                {step.title}
              </div>
            </div>

            {!isLast && (
              <div
                className={cn(
                  CONNECTOR_BASE,
                  isComplete ? CONNECTOR_ACTIVE : CONNECTOR_IDLE
                )}
                aria-hidden
              />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )

  if (!framed) return inner

  return (
    <div className="rounded-xl border border-border bg-accent/30 px-4 py-3 font-sans">
      {inner}
    </div>
  )
}
