"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"
import { DIALOG_TOKENS, SIZE_CLASS, type DialogSize } from "./tokens"

export interface AppDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Container width. Default "md". */
  size?: DialogSize
  /** Inner padding strategy. "flush" lets children own the layout (e.g. branded header band). Default "default". */
  padding?: "default" | "flush"
  /** When true, body scrolls within the dialog; pair with sticky header/footer. */
  scrollBody?: boolean
  /** Max height for the dialog container. Default "max-h-[92vh]". */
  maxHeight?: string
  /** Hide the corner X button. Rare. */
  hideClose?: boolean
  className?: string
  /** Pointer events on outside click — pass false to disable backdrop dismiss. */
  dismissable?: boolean
  children: React.ReactNode
}

/**
 * Foundational dialog wrapper. Composes shadcn Dialog + DialogContent with our size/padding/overflow conventions.
 * Visual chrome (radius, border, shadow, overlay, close button position) matches components/ui/dialog.tsx exactly.
 */
export function AppDialog({
  open,
  onOpenChange,
  size = "md",
  padding = "default",
  scrollBody = false,
  maxHeight = "max-h-[92vh]",
  hideClose = false,
  dismissable = true,
  className,
  children,
}: AppDialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />
        <DialogPrimitive.Content
          onPointerDownOutside={(e) => {
            if (!dismissable) e.preventDefault()
          }}
          onEscapeKeyDown={(e) => {
            if (!dismissable) e.preventDefault()
          }}
          className={cn(
            "fixed left-[50%] top-[50%] z-50 w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%]",
            DIALOG_TOKENS.radius,
            "border bg-card text-card-foreground shadow-xl duration-200",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
            SIZE_CLASS[size],
            maxHeight,
            scrollBody
              ? "flex flex-col overflow-hidden"
              : cn("grid", DIALOG_TOKENS.contentGap, "overflow-hidden"),
            padding === "default" && !scrollBody && DIALOG_TOKENS.padding,
            className
          )}
        >
          {children}
          {!hideClose && (
            <DialogPrimitive.Close className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full border bg-background/80 text-muted-foreground opacity-80 ring-offset-background transition hover:bg-accent hover:text-primary hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-primary">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

/**
 * Body wrapper for scrollable dialogs.
 * Use inside AppDialog when scrollBody=true to get the inner scroll region with consistent padding.
 */
export function AppDialogBody({
  className,
  children,
  layout = "scroll",
}: {
  className?: string
  children?: React.ReactNode
  /**
   * "scroll" (default) — body scrolls vertically when content overflows.
   * "fill"  — body uses `flex flex-col` and does NOT scroll itself. Children manage their own scrolling.
   *           Use when a child picker/list needs to fill the available space with internal scroll.
   */
  layout?: "scroll" | "fill"
}) {
  return (
    <div
      className={cn(
        "flex-1 px-4 py-4 sm:px-5 font-sans",
        layout === "scroll"
          ? cn("overflow-y-auto", DIALOG_TOKENS.scroll)
          : "flex flex-col min-h-0 overflow-hidden",
        className
      )}
    >
      {children}
    </div>
  )
}

/**
 * Title slot. Wraps Radix DialogPrimitive.Title so screen readers still announce the title.
 * Use within AppDialogHeader; rarely needed directly.
 */
export const AppDialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(DIALOG_TOKENS.titleClass, className)}
    {...props}
  />
))
AppDialogTitle.displayName = "AppDialogTitle"

export const AppDialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn(DIALOG_TOKENS.descriptionClass, className)}
    {...props}
  />
))
AppDialogDescription.displayName = "AppDialogDescription"
