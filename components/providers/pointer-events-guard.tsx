"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function PointerEventsGuardInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Radix Dialog/Select/Popover/DropdownMenu set body { pointer-events: none }
    // while open and reset it on close. If the component unmounts mid-close
    // animation (common when switching tabs that conditionally render sections),
    // the cleanup is skipped and the body stays unclickable. Clearing the style
    // after every route/query change unsticks the page without affecting any
    // legitimate open modal (which re-applies the style synchronously).
    document.body.style.pointerEvents = "";
  }, [pathname, searchParams]);

  return null;
}

export function PointerEventsGuard() {
  return (
    <Suspense fallback={null}>
      <PointerEventsGuardInner />
    </Suspense>
  );
}
