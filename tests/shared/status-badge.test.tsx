import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import {
  formatStatusLabel,
  OnFileBadge,
  resolveStatusTone,
  StatusBadge,
} from "@/components/shared/status-badge";

describe("resolveStatusTone", () => {
  it("normalizes trim + case before lookup", () => {
    expect(resolveStatusTone("  PAID ")).toBe("success");
    expect(resolveStatusTone("Pending")).toBe("warning");
  });

  it("maps the new vocabulary", () => {
    expect(resolveStatusTone("received")).toBe("success");
    expect(resolveStatusTone("partially received")).toBe("warning");
    expect(resolveStatusTone("pending signature")).toBe("warning");
    expect(resolveStatusTone("at risk")).toBe("warning");
    expect(resolveStatusTone("invalidated")).toBe("destructive");
    expect(resolveStatusTone("refunded")).toBe("neutral");
    expect(resolveStatusTone("waived")).toBe("neutral");
    expect(resolveStatusTone("not issued")).toBe("neutral");
    expect(resolveStatusTone("ready to ship")).toBe("info");
    expect(resolveStatusTone("confirmed")).toBe("info");
  });

  it("shipped is info (deliberate remap); delivered stays success", () => {
    expect(resolveStatusTone("shipped")).toBe("info");
    expect(resolveStatusTone("delivered")).toBe("success");
  });

  it("supports overrides and falls back to neutral", () => {
    expect(resolveStatusTone("verified", { verified: "info" })).toBe("info");
    expect(resolveStatusTone("some-unknown-status")).toBe("neutral");
  });
});

describe("formatStatusLabel", () => {
  it("turns enum-style values into spaced lowercase", () => {
    expect(formatStatusLabel("READY_TO_SHIP")).toBe("ready to ship");
    expect(formatStatusLabel("  IN__PROGRESS ")).toBe("in progress");
  });
});

describe("StatusBadge rendering", () => {
  it("renders capitalized label with the resolved tone classes", () => {
    render(<StatusBadge label="shipped" />);
    const badge = screen.getByText("Shipped");
    expect(badge.closest("div")?.className ?? "").toContain("bg-info-soft");
  });

  it("OnFileBadge is exported and renders", () => {
    render(<OnFileBadge />);
    expect(screen.getByText("On file")).toBeTruthy();
  });
});
