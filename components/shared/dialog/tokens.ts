/**
 * Shared Tailwind class constants for the dialog system.
 * Single source of truth — primitives import from here so visual updates only happen here.
 */

export const DIALOG_TOKENS = {
  radius: "rounded-2xl",
  padding: "p-4 sm:p-5",
  paddingFlush: "p-0",
  contentGap: "gap-4",

  // Container size map
  sizeSm: "max-w-md",
  sizeMd: "max-w-lg",
  sizeLg: "max-w-2xl",
  sizeXl: "max-w-4xl",
  size2xl: "max-w-[1320px]",
  sizeFull: "w-[96vw] max-w-[1440px]",

  // Header — single unified style matching "Setup Existing Franchise" (tightened)
  headerWrap: "flex flex-col space-y-1.5 pr-12 text-left font-sans",
  headerBordered: "border-b border-border",
  headerPadded: "px-4 py-4 sm:px-5",
  titleClass:
    "flex items-center gap-2 text-xl font-normal leading-tight tracking-tight text-card-foreground font-sans",
  descriptionClass: "max-w-3xl text-sm leading-snug text-muted-foreground font-sans",
  eyebrowClass:
    "inline-flex w-fit items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.16em] text-primary font-sans",

  // Header icon bubble — matching Setup Existing Franchise: icon in rounded square next to title
  iconBubble:
    "grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary shrink-0",
  iconBubbleSuccess:
    "inline-flex h-14 w-14 items-center justify-center rounded-full bg-success-soft text-primary",

  // Footer
  footerWrap: "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end font-sans",
  footerPadded: "px-4 py-3 sm:px-5",
  footerBordered: "border-t border-border",
  footerSticky: "sticky bottom-0 z-10 bg-card",

  // Form fields (tightened: label and control sit closer)
  fieldWrap: "space-y-1.5 font-sans",
  fieldLabel: "text-sm font-medium leading-none text-card-foreground font-sans",
  fieldRequiredMark: "text-destructive ml-0.5",
  fieldError: "text-xs text-destructive font-sans",
  fieldHint: "text-xs text-muted-foreground font-sans",

  // Grid (tightened)
  gridGap: "gap-3",
  gridGapSm: "gap-2",
  gridGapLg: "gap-5",

  // Section
  sectionWrap: "space-y-3",
  sectionTitle:
    "text-base font-semibold leading-tight tracking-tight text-card-foreground",
  sectionDescription: "text-sm text-muted-foreground",
  sectionDivider: "border-t border-border pt-4",

  // Stepper
  stepperRow: "flex items-center justify-between gap-2",
  stepperStep: "flex flex-col items-center gap-2 flex-1 min-w-0",
  stepperBubbleBase:
    "flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors",
  stepperBubbleActive:
    "border-primary bg-primary text-primary-foreground shadow-sm",
  stepperBubbleComplete: "border-primary bg-primary text-primary-foreground",
  stepperBubbleIdle: "border-border bg-card text-muted-foreground",
  stepperLabel: "text-xs font-medium text-center",
  stepperLabelActive: "text-primary",
  stepperLabelIdle: "text-muted-foreground",
  stepperConnector: "h-0.5 flex-1 transition-colors",
  stepperConnectorActive: "bg-primary",
  stepperConnectorIdle: "bg-border",

  // State message (pending/warning/info/success/destructive)
  stateWrap:
    "flex items-start gap-3 rounded-lg border p-4",
  stateTone: {
    info: "border-border bg-muted/40 text-card-foreground",
    success: "border-primary/20 bg-success-soft text-primary",
    warning: "border-amber-500/30 bg-amber-50 text-amber-900",
    destructive: "border-destructive/20 bg-red-50 text-destructive",
  },

  // Detail
  heroCardWrap:
    "rounded-2xl border border-border bg-accent/30 p-5 space-y-3",
  heroCardTitleRow: "flex items-start justify-between gap-4",
  heroCardTitle: "text-lg font-semibold leading-tight tracking-tight text-card-foreground",
  heroCardDescription: "text-sm text-muted-foreground",
  infoGridWrap: "grid gap-3",
  infoCardWrap:
    "rounded-xl border border-border bg-card p-4 space-y-1",
  infoCardLabel:
    "text-[11px] font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5",
  infoCardValue:
    "text-sm font-semibold text-card-foreground",
  progressCardWrap:
    "rounded-xl border border-border bg-card p-4 space-y-3",
  progressCardTitleRow:
    "flex items-baseline justify-between gap-3",

  // Picker
  pickerSearchWrap: "flex items-center justify-between gap-3",
  pickerListWrap:
    "rounded-lg border border-border bg-card divide-y divide-border max-h-72 overflow-y-auto scrollbar-green",
  pickerListItem:
    "flex items-center gap-3 px-3 py-2.5 hover:bg-accent/40 transition-colors",
  pickerPendingWrap:
    "rounded-lg border border-primary/20 bg-success-soft/50 p-3 space-y-2",
  pickerPendingTitle: "text-xs font-semibold uppercase tracking-wide text-primary",

  // Scroll utility
  scroll: "scrollbar-green",
} as const

export type DialogSize = "sm" | "md" | "lg" | "xl" | "2xl" | "full"

export const SIZE_CLASS: Record<DialogSize, string> = {
  sm: DIALOG_TOKENS.sizeSm,
  md: DIALOG_TOKENS.sizeMd,
  lg: DIALOG_TOKENS.sizeLg,
  xl: DIALOG_TOKENS.sizeXl,
  "2xl": DIALOG_TOKENS.size2xl,
  full: DIALOG_TOKENS.sizeFull,
}
