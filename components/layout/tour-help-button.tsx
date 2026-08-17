"use client";

import { CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/dialog";
import { useGuidedTour } from "@/hooks/use-guided-tour";
import type { TourPortal } from "@/hooks/api/tours.hooks";

export interface TourHelpButtonProps {
  portal: TourPortal;
}

/**
 * The "?" beside the profile menu — replays the role's guided tour
 * (docs/guided-tours/). Hidden for ineligible users (funnel states) and on
 * mobile (tours are desktop-only). Also owns the skip-confirm dialog, which
 * opens only after the tour overlay is torn down, so the two never stack.
 */
export function TourHelpButton({ portal }: TourHelpButtonProps) {
  const tour = useGuidedTour(portal);

  if (!tour.available) return null;

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="hidden h-9 w-9 shrink-0 rounded-full text-primary hover:bg-accent hover:text-primary md:inline-flex"
        data-testid="tour-help-button"
        data-tour="header-help"
        onClick={tour.start}
      >
        <CircleHelp className="h-5 w-5" />
        <span className="sr-only">Replay the guided tour</span>
      </Button>
      <ConfirmDialog
        // Fresh AlertDialog per skip request: re-opening the same instance
        // inside its exit animation makes Radix Presence unmount the content
        // while open=true (see GuidedTourControls.skipNonce).
        key={tour.skipNonce}
        open={tour.skipStepIndex !== null}
        onOpenChange={(open) => {
          if (!open) tour.cancelSkip();
        }}
        title="Skip the tour?"
        description="You can replay it anytime from the ? button in the header."
        confirmLabel="Skip tour"
        cancelLabel="Continue tour"
        onConfirm={tour.confirmSkip}
      />
    </>
  );
}
