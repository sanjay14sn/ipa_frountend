"use client"

import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { ArrowLeft, ArrowRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { Stepper, type StepDef } from "@/components/shared/stepper"
import { FormSection } from "@/components/shared/form-section"
import { AppDialog, AppDialogBody, type AppDialogProps } from "../AppDialog"
import { AppDialogHeader } from "../AppDialogHeader"
import {
  AppDialogFooter,
  type FooterAction,
} from "../AppDialogFooter"

export interface MultiStepDialogProps
  extends Pick<
    AppDialogProps,
    "open" | "onOpenChange" | "size" | "maxHeight" | "dismissable" | "hideClose"
  > {
  title: React.ReactNode
  description?: React.ReactNode
  /** Optional uppercase pill above the title (e.g. "ADMIN ONBOARDING"). */
  headerEyebrow?: React.ReactNode
  headerIcon?: LucideIcon | React.ReactNode
  steps: StepDef[]
  /** 1-indexed current step */
  currentStep: number
  /** Set by parent to enable/disable Next */
  canAdvance?: boolean
  onBack?: () => void
  onNext?: () => void
  /** Called when the user submits the LAST step */
  onSubmit?: () => void | Promise<void>
  isSubmitting?: boolean
  submitLabel?: string
  nextLabel?: string
  backLabel?: string
  cancelLabel?: string
  /** Hide cancel from footer (e.g. when there's no escape). Default false. */
  hideCancel?: boolean
  /** Extra footer action (e.g. "Save draft") rendered as a tertiary ghost button */
  extraAction?: FooterAction
  /** Disable the automatic FormSection wrap around step children. Default false (auto-wrap on). */
  noStepSection?: boolean
  /** Override the section header rendered above step content. Defaults to the current step's title. */
  stepSectionTitle?: React.ReactNode
  /** Optional description for the per-step FormSection header. */
  stepSectionDescription?: React.ReactNode
  className?: string
  /** Body for the CURRENT step. Parent decides which step's component to render. */
  children: React.ReactNode
}

/**
 * Multi-step wizard dialog. Header (branded by default) + DialogStepper + body + sticky footer with Back/Next/Submit.
 * Parent owns step state — this template renders chrome around it.
 */
export function MultiStepDialog({
  open,
  onOpenChange,
  size = "xl",
  maxHeight,
  dismissable,
  hideClose,
  title,
  description,
  headerEyebrow,
  headerIcon,
  steps,
  currentStep,
  canAdvance = true,
  onBack,
  onNext,
  onSubmit,
  isSubmitting,
  submitLabel = "Submit",
  nextLabel = "Next",
  backLabel = "Back",
  cancelLabel = "Cancel",
  hideCancel,
  extraAction,
  noStepSection,
  stepSectionTitle,
  stepSectionDescription,
  className,
  children,
}: MultiStepDialogProps) {
  const isFirstStep = currentStep === steps[0]?.id
  const isLastStep = currentStep === steps[steps.length - 1]?.id
  const currentStepDef = steps.find((s) => s.id === currentStep)
  const sectionTitle = stepSectionTitle ?? currentStepDef?.title

  const handlePrimary = async () => {
    if (isLastStep) {
      await onSubmit?.()
    } else {
      onNext?.()
    }
  }

  const handleCancel = () => onOpenChange(false)

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      size={size}
      maxHeight={maxHeight}
      dismissable={dismissable}
      hideClose={hideClose}
      padding="flush"
      scrollBody
      className={className}
    >
      <AppDialogHeader
        title={title}
        description={description}
        eyebrow={headerEyebrow}
        icon={headerIcon}
        sticky
      />

      <div className="px-4 pt-3 sm:px-5">
        <Stepper steps={steps} currentStep={currentStep} compact />
      </div>

      <AppDialogBody className="space-y-3">
        {noStepSection ? (
          children
        ) : (
          <FormSection title={sectionTitle} description={stepSectionDescription}>
            {children}
          </FormSection>
        )}
      </AppDialogBody>

      <AppDialogFooter
        sticky
        padded
        tertiary={
          extraAction ??
          (!isFirstStep && onBack
            ? {
                label: backLabel,
                onClick: onBack,
                icon: ArrowLeft,
                variant: "ghost",
              }
            : undefined)
        }
        leftSlot={
          <span className="hidden sm:inline">
            Step {currentStep} of {steps.length}
          </span>
        }
        secondary={
          !hideCancel
            ? { label: cancelLabel, onClick: handleCancel, type: "button" }
            : undefined
        }
        primary={{
          label: isLastStep ? submitLabel : nextLabel,
          onClick: handlePrimary,
          icon: isLastStep ? undefined : ArrowRight,
          loading: isSubmitting,
          disabled: !canAdvance,
        }}
      />
    </AppDialog>
  )
}
