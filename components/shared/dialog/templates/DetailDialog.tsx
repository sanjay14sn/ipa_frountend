"use client"

import * as React from "react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { AppDialog, AppDialogBody, type AppDialogProps } from "../AppDialog"
import { AppDialogHeader } from "../AppDialogHeader"
import {
  AppDialogFooter,
  type FooterAction,
} from "../AppDialogFooter"

export interface DetailDialogProps
  extends Pick<
    AppDialogProps,
    "open" | "onOpenChange" | "size" | "maxHeight" | "dismissable" | "hideClose"
  > {
  title: React.ReactNode
  description?: React.ReactNode
  /** Optional uppercase pill above the title (e.g. "ADMIN ONBOARDING"). */
  headerEyebrow?: React.ReactNode
  headerIcon?: LucideIcon | React.ReactNode
  /** Right-aligned header actions (e.g. download button) */
  headerActions?: React.ReactNode
  /** Optional status badge after the title */
  headerBadge?: React.ReactNode

  /** Rendered above the body — typically <DialogHeroCard /> */
  hero?: React.ReactNode
  /** Row of stat tiles — typically <InfoGrid />... */
  infoGrid?: React.ReactNode
  /** Optional <Tabs> rendered above the body */
  tabs?: React.ReactNode
  /** Footer actions or custom node */
  footer?: React.ReactNode | { primary?: FooterAction; secondary?: FooterAction }

  className?: string
  bodyClassName?: string
  children?: React.ReactNode
}

/**
 * Read-only detail dialog. Standard chrome (header + scrollable body + optional sticky footer) with
 * dedicated slots for hero card, info grid, and tabs.
 */
export function DetailDialog({
  open,
  onOpenChange,
  size = "lg",
  maxHeight,
  dismissable,
  hideClose,
  title,
  description,
  headerEyebrow,
  headerIcon,
  headerActions,
  headerBadge,
  hero,
  infoGrid,
  tabs,
  footer,
  className,
  bodyClassName,
  children,
}: DetailDialogProps) {
  const footerIsActions =
    footer &&
    typeof footer === "object" &&
    !React.isValidElement(footer) &&
    ("primary" in (footer as object) || "secondary" in (footer as object))

  const footerNode = footer
    ? footerIsActions
      ? (
          <AppDialogFooter
            sticky
            padded
            primary={(footer as { primary?: FooterAction }).primary}
            secondary={(footer as { secondary?: FooterAction }).secondary}
          />
        )
      : (footer as React.ReactNode)
    : null

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
        actions={headerActions}
        badge={headerBadge}
        sticky
      />

      <AppDialogBody className={cn("space-y-5", bodyClassName)}>
        {hero}
        {infoGrid}
        {tabs}
        {children}
      </AppDialogBody>

      {footerNode}
    </AppDialog>
  )
}
