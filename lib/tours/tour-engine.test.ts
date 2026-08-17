import { beforeEach, describe, expect, it, vi } from "vitest";

import { freezeTour, widgetAnchor } from "./tour-types";
import { isTourActive, startTour, stopTour } from "./tour-engine";

// The engine is tested against a fake driver.js: these tests own the engine's
// logic (step filtering, singleton, teardown routing) — not driver's DOM work.
const driverFactory = vi.fn();
vi.mock("driver.js", () => ({
  driver: (config: unknown) => driverFactory(config),
}));

interface FakeConfig {
  steps: Array<{ element?: string }>;
  onPopoverRender?: (popover: {
    footer: HTMLElement;
  }) => void;
  onDoneClick?: () => void;
  onDestroyed?: () => void;
}

function makeFakeDriver(config: FakeConfig) {
  return {
    drive: vi.fn(),
    destroy: vi.fn(() => config.onDestroyed?.()),
    getActiveIndex: vi.fn(() => 2),
    isActive: vi.fn(() => true),
    refresh: vi.fn(),
  };
}

const TOUR = freezeTour({
  key: "test-tour",
  version: 1,
  page: "/test",
  readyWhen: widgetAnchor("present"),
  steps: [
    { anchor: null, title: "Welcome", body: "w" },
    { anchor: widgetAnchor("present"), title: "Present", body: "p" },
    { anchor: widgetAnchor("absent"), title: "Absent", body: "a" },
    { anchor: widgetAnchor("present-too"), title: "Present too", body: "p2" },
  ],
});

function lastConfig(): FakeConfig {
  return driverFactory.mock.calls.at(-1)![0] as FakeConfig;
}

beforeEach(() => {
  stopTour();
  driverFactory.mockReset();
  driverFactory.mockImplementation(makeFakeDriver);
  document.body.innerHTML = `
    <div data-tour="present"></div>
    <div data-tour="present-too"></div>
  `;
});

describe("startTour", () => {
  it("drops steps whose anchor has no DOM match; keeps centered steps", () => {
    startTour(TOUR, { onFinished: vi.fn(), onSkipRequested: vi.fn() });
    const steps = lastConfig().steps;
    expect(steps).toHaveLength(3);
    expect(steps[0].element).toBeUndefined();
    expect(steps[1].element).toBe(widgetAnchor("present"));
    expect(steps[2].element).toBe(widgetAnchor("present-too"));
  });

  it("is a singleton: a second start while active is a no-op", () => {
    startTour(TOUR, { onFinished: vi.fn(), onSkipRequested: vi.fn() });
    startTour(TOUR, { onFinished: vi.fn(), onSkipRequested: vi.fn() });
    expect(driverFactory).toHaveBeenCalledTimes(1);
    expect(isTourActive()).toBe(true);
  });

  it("does not start when every anchored step is missing and none are centered", () => {
    document.body.innerHTML = "";
    const noCentered = freezeTour({
      ...TOUR,
      steps: [{ anchor: widgetAnchor("absent"), title: "x", body: "y" }],
    });
    startTour(noCentered, { onFinished: vi.fn(), onSkipRequested: vi.fn() });
    expect(driverFactory).not.toHaveBeenCalled();
    expect(isTourActive()).toBe(false);
  });
});

describe("teardown routing", () => {
  it("Finish → onFinished only, and the singleton clears", () => {
    const onFinished = vi.fn();
    const onSkipRequested = vi.fn();
    startTour(TOUR, { onFinished, onSkipRequested });
    lastConfig().onDoneClick!();
    expect(onFinished).toHaveBeenCalledTimes(1);
    expect(onSkipRequested).not.toHaveBeenCalled();
    expect(isTourActive()).toBe(false);
  });

  it("skip button → onSkipRequested with the active step index", () => {
    const onFinished = vi.fn();
    const onSkipRequested = vi.fn();
    startTour(TOUR, { onFinished, onSkipRequested });
    const footer = document.createElement("div");
    lastConfig().onPopoverRender!({ footer });
    const skip = footer.querySelector<HTMLButtonElement>(".ipa-tour-skip");
    expect(skip).not.toBeNull();
    skip!.click();
    expect(onSkipRequested).toHaveBeenCalledWith(2);
    expect(onFinished).not.toHaveBeenCalled();
    expect(isTourActive()).toBe(false);
  });

  it("stopTour → external teardown, no callbacks, restartable", () => {
    const onFinished = vi.fn();
    const onSkipRequested = vi.fn();
    startTour(TOUR, { onFinished, onSkipRequested });
    stopTour();
    expect(onFinished).not.toHaveBeenCalled();
    expect(onSkipRequested).not.toHaveBeenCalled();
    expect(isTourActive()).toBe(false);
    startTour(TOUR, { onFinished, onSkipRequested });
    expect(driverFactory).toHaveBeenCalledTimes(2);
  });

  it("does not duplicate the skip button on re-render of the same footer", () => {
    startTour(TOUR, { onFinished: vi.fn(), onSkipRequested: vi.fn() });
    const footer = document.createElement("div");
    lastConfig().onPopoverRender!({ footer });
    lastConfig().onPopoverRender!({ footer });
    expect(footer.querySelectorAll(".ipa-tour-skip")).toHaveLength(1);
  });
});
