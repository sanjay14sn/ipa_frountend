"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { PageHeaderCard } from "@/components/shared/page-header-card"

export interface PageTabsTab<T extends string> {
  value: T
  label: React.ReactNode
  /** Right-side decoration on the tab trigger (e.g. count badge). */
  badge?: React.ReactNode
  disabled?: boolean
}

export interface PageTabsProps<T extends string> {
  /** Optional uppercase eyebrow pill above the title (e.g. "Management"). */
  eyebrow?: React.ReactNode
  /** Required page title. */
  title: React.ReactNode
  /** Optional description shown below the title. */
  description?: React.ReactNode
  /** Right-aligned slot inside the header card (typically the primary CTA button). */
  action?: React.ReactNode

  /** Tab definitions. */
  tabs: ReadonlyArray<PageTabsTab<T>>
  /** Currently active tab value. */
  value: T
  /** Called when the user switches tabs. */
  onValueChange: (value: T) => void

  /** TabsContent children. The component sets up the surrounding <Tabs> provider. */
  children: React.ReactNode

  /** Extra slot inside the header card, between description and TabsList — for filters etc. */
  headerExtras?: React.ReactNode

  className?: string
  /** Class applied to the header card. */
  headerClassName?: string
}

/**
 * Page-level tabbed section. Renders the standard header card (eyebrow + title + description +
 * optional right action) with the tab triggers inside, then the tab content beneath.
 *
 * Use it for any page that has multiple "sub-screens" stacked behind tabs (Franchise Hub,
 * Programs, etc.). All pages get the same chrome with zero per-page JSX.
 *
 * @example
 *   <PageTabs
 *     eyebrow="Management"
 *     title="Franchise Hub"
 *     description="Manage franchises, applications, program requests, and agreements."
 *     tabs={[
 *       { value: "franchises", label: "Franchises" },
 *       { value: "applications", label: "Applications" },
 *     ]}
 *     value={tab}
 *     onValueChange={setTab}
 *   >
 *     <TabsContent value="franchises">…</TabsContent>
 *     <TabsContent value="applications">…</TabsContent>
 *   </PageTabs>
 */
export function PageTabs<T extends string>({
  eyebrow,
  title,
  description,
  action,
  tabs,
  value,
  onValueChange,
  children,
  headerExtras,
  className,
  headerClassName,
}: PageTabsProps<T>) {
  return (
    <Tabs
      value={value}
      onValueChange={(v) => onValueChange(v as T)}
      className={cn("space-y-4 font-sans", className)}
    >
      <PageHeaderCard
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={action}
        className={headerClassName}
      >
        {headerExtras ? <div className="mt-3">{headerExtras}</div> : null}

        <TabsList className="mt-4 flex h-auto flex-wrap justify-start gap-1">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              disabled={tab.disabled}
              className="gap-1.5"
              data-tour={`tab:${tab.value}`}
            >
              {tab.label}
              {tab.badge ? <span>{tab.badge}</span> : null}
            </TabsTrigger>
          ))}
        </TabsList>
      </PageHeaderCard>

      {children}
    </Tabs>
  )
}

export { TabsContent }
