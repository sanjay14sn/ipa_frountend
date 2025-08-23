"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function AbacusHero({
  title = "Abacus learning for the next generation",
  subtitle = "Professional tools to manage your franchise, track enrollments, and support students and instructors.",
  bullets = ["Franchise operations", "Student progress", "Instructor tools"],
  ctaPrimary,
  ctaSecondary,
  className,
}: {
  title?: string;
  subtitle?: string;
  bullets?: string[];
  ctaPrimary?: React.ReactNode;
  ctaSecondary?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "relative grid items-center gap-8 md:grid-cols-2",
        className
      )}
    >
      <div className="space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
          Premium Abacus Network
        </div>
        <h1 className="text-4xl font-semibold leading-tight text-emerald-950">
          {title}
        </h1>
        <p className="text-emerald-800/80">{subtitle}</p>
        <ul className="grid gap-2">
          {bullets.map((b) => (
            <li
              key={b}
              className="flex items-center gap-2 text-sm text-emerald-900"
            >
              <span className="inline-block size-2 rounded-full bg-yellow-500" />
              {b}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-3">
          {ctaPrimary}
          {ctaSecondary}
        </div>
      </div>

      <AbacusIllustration />
    </section>
  );
}

export function BeadDivider({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex items-center gap-2", className)}
      aria-hidden="true"
    >
      <div className="h-px flex-1 bg-gray-200" />
      <div className="flex items-center gap-1">
        <span className="size-1.5 rounded-full bg-yellow-500 border border-gray-200" />
        <span className="size-1.5 rounded-full bg-emerald-600 border border-gray-200" />
        <span className="size-1.5 rounded-full bg-yellow-400 border border-gray-200" />
      </div>
      <div className="h-px flex-1 bg-gray-200" />
    </div>
  );
}

export function BeadBadge({
  children,
  tone = "emerald",
  className,
}: {
  children: React.ReactNode;
  tone?: "emerald" | "yellow";
  className?: string;
}) {
  const styles = tone === "emerald" ? "text-emerald-800" : "text-yellow-800";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-gray-200 px-2.5 py-1 text-xs",
        styles,
        className
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full border border-gray-200",
          tone === "emerald" ? "bg-emerald-600" : "bg-yellow-500"
        )}
      />
      {children}
    </span>
  );
}

function AbacusIllustration() {
  // Abacus with very light borders/rods for a clean, modern look
  const rod = "w-0.5 rounded bg-gray-300";
  const bead = "h-4 w-7 rounded-full border border-gray-100 shadow-sm";
  return (
    <div className="relative mx-auto w-full max-w-[520px]">
      <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white/90 p-5 shadow-sm backdrop-blur">
        {/* Frame */}
        <div
          className="absolute inset-4 rounded-xl border border-gray-200"
          aria-hidden="true"
        />
        {/* Rods */}
        <div className="grid grid-cols-6 gap-8 px-6 py-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="relative flex justify-center">
              <div className={rod} />
            </div>
          ))}
        </div>
        {/* Beads on rods */}
        <div className="pointer-events-none absolute left-0 top-0 h-full w-full">
          <Bead rod={1} offset="20%" tone="yellow" />
          <Bead rod={1} offset="42%" tone="emerald" />
          <Bead rod={2} offset="32%" tone="emerald" />
          <Bead rod={3} offset="58%" tone="yellow" />
          <Bead rod={4} offset="26%" tone="yellow" />
          <Bead rod={4} offset="48%" tone="emerald" />
          <Bead rod={5} offset="35%" tone="emerald" />
          <Bead rod={6} offset="52%" tone="yellow" />
        </div>
        {/* Footer strip */}
        <div className="mt-4 flex items-center justify-between rounded-lg border border-gray-200 bg-yellow-50 px-3 py-2">
          <div className="text-xs font-medium text-yellow-900">
            Live snapshot
          </div>
          <div className="flex items-center gap-2">
            <BeadBadge tone="emerald">Enrollments ↑</BeadBadge>
            <BeadBadge tone="yellow">Sessions</BeadBadge>
          </div>
        </div>
      </div>
    </div>
  );

  function Bead({
    rod,
    offset,
    tone,
  }: {
    rod: number;
    offset: string;
    tone: "emerald" | "yellow";
  }) {
    const colMap = {
      1: "14%",
      2: "30%",
      3: "45%",
      4: "60%",
      5: "75%",
      6: "90%",
    } as const;
    return (
      <div
        className={cn(
          bead,
          tone === "emerald" ? "bg-emerald-50" : "bg-yellow-50"
        )}
        style={{
          position: "absolute",
          left: colMap[rod as keyof typeof colMap],
          top: offset,
          transform: "translate(-50%, -50%)",
        }}
      />
    );
  }
}
