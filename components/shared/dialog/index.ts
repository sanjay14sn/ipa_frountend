/**
 * Unified popup/dialog design system.
 * Import from this barrel for the high-level building blocks.
 */

export {
  AppDialog,
  AppDialogBody,
  AppDialogTitle,
  AppDialogDescription,
  type AppDialogProps,
} from "./AppDialog"

export {
  AppDialogHeader,
  type AppDialogHeaderProps,
} from "./AppDialogHeader"

export {
  AppDialogFooter,
  type AppDialogFooterProps,
  type FooterAction,
  type FooterButtonVariant,
} from "./AppDialogFooter"

export { type DialogSize } from "./tokens"

export {
  DialogStateMessage,
  type DialogStateMessageProps,
  type StateTone,
} from "./DialogStateMessage"

export {
  DialogStepper,
  type DialogStepperProps,
  type StepDef,
} from "./DialogStepper"

// Re-exports of the generally-reusable primitives that ALSO work in dialogs.
// Prefer importing these from `@/components/shared/stepper` and `@/components/shared/form-section`
// when used outside of a dialog.
export { type StepperProps } from "@/components/shared/stepper"
export { type FormSectionProps } from "@/components/shared/form-section"

export * from "./form"
export * from "./detail"
export * from "./picker"
export * from "./templates"
