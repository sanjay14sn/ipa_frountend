"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  isNavItemActive,
  type PortalNavSection,
} from "@/lib/navigation/nav-config";
import { cn } from "@/lib/utils";

export interface PortalSidebarProps {
  nav: readonly PortalNavSection[];
  homeHref: string;
  brand: { title: string; subtitle?: string };
  /** Onboarding / signature-required banner rendered under the brand plate. */
  banner?: React.ReactNode;
}

/**
 * Presentational navy-rail sidebar. Zero context reads — the layout resolves
 * role/phase and passes everything in. Styled exclusively with sidebar-*
 * tokens (navy rail, yellow active indicator).
 */
export function PortalSidebar({
  nav,
  homeHref,
  brand,
  banner,
}: PortalSidebarProps) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" data-testid="portal-sidebar">
      <SidebarHeader className="gap-1 p-1.5">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              className="hover:bg-sidebar-accent"
            >
              <Link href={homeHref}>
                {/* White plate keeps the mark legible on the navy rail; the
                    866px lockup never goes in the rail (~5px tall). */}
                <div className="flex aspect-square size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white shadow-sm">
                  <Image
                    src="/brand/ipa-mark.png"
                    alt="IPA"
                    width={32}
                    height={32}
                  />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
                  <span className="truncate font-semibold text-white">
                    {brand.title}
                  </span>
                  {brand.subtitle ? (
                    <span className="truncate text-xs text-sidebar-foreground/80">
                      {brand.subtitle}
                    </span>
                  ) : null}
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {banner ? (
        <div className="border-t border-sidebar-border px-2 py-1.5 group-data-[collapsible=icon]:hidden">
          {banner}
        </div>
      ) : null}

      <SidebarContent className="gap-0">
        {nav.map((group, index) => (
          <SidebarGroup
            key={group.title}
            className={cn("px-2 py-1", index === 0 ? "pt-1.5" : "pt-0")}
          >
            <SidebarGroupLabel className="h-7 px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-sidebar-foreground/60">
              {group.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {group.items.map((item) => {
                  const active = isNavItemActive(pathname, item);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.title}
                        className={cn(
                          "relative transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                          active &&
                            "!bg-sidebar-accent !text-white data-[active=true]:!bg-sidebar-accent data-[active=true]:!text-white",
                        )}
                      >
                        <Link
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                        >
                          {/* Yellow 2px active indicator bar. */}
                          {active ? (
                            <span
                              aria-hidden
                              className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-sidebar-primary"
                            />
                          ) : null}
                          <item.icon className="shrink-0" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}

/**
 * Standard banner body for the navy rail (onboarding / signature-required).
 * White-tinted card that stays legible on navy.
 */
export function PortalSidebarBanner({
  icon,
  title,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-white/15 bg-white/10 p-2.5">
      <div className="flex items-start gap-2">
        {icon}
        <div className="text-xs">
          <p className="font-medium text-white">{title}</p>
          <p className="mt-1 text-sidebar-foreground/90">{children}</p>
        </div>
      </div>
    </div>
  );
}
