import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { TourHelpButton } from "./tour-help-button";
import type { GuidedTourControls } from "@/hooks/use-guided-tour";

// The hook owns eligibility/persistence and is covered by the registry and
// engine tests; here it's mocked so the button's rendering contract is tested
// in isolation (kit-style, no providers needed).
const useGuidedTourMock = vi.fn<() => GuidedTourControls>();
vi.mock("@/hooks/use-guided-tour", () => ({
  useGuidedTour: () => useGuidedTourMock(),
}));

function controls(overrides: Partial<GuidedTourControls>): GuidedTourControls {
  return {
    available: true,
    start: vi.fn(),
    skipStepIndex: null,
    skipNonce: 0,
    confirmSkip: vi.fn(),
    cancelSkip: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  useGuidedTourMock.mockReset();
});

describe("TourHelpButton", () => {
  it("renders nothing when no tour is available (funnel users)", () => {
    useGuidedTourMock.mockReturnValue(controls({ available: false }));
    render(<TourHelpButton portal="franchisee" />);
    expect(screen.queryByTestId("tour-help-button")).toBeNull();
  });

  it("renders the ? button and starts the tour on click", () => {
    const start = vi.fn();
    useGuidedTourMock.mockReturnValue(controls({ start }));
    render(<TourHelpButton portal="admin" />);
    fireEvent.click(screen.getByTestId("tour-help-button"));
    expect(start).toHaveBeenCalledTimes(1);
  });

  it("shows the skip confirmation while a skip is pending", () => {
    const confirmSkip = vi.fn();
    useGuidedTourMock.mockReturnValue(
      controls({ skipStepIndex: 3, confirmSkip }),
    );
    render(<TourHelpButton portal="ci" />);
    expect(screen.getByText("Skip the tour?")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Skip tour"));
    expect(confirmSkip).toHaveBeenCalledTimes(1);
  });
});
