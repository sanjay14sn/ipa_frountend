import { describe, it, expect } from "vitest";
import { toLifecycleStatus } from "@/hooks/use-scope";

describe("toLifecycleStatus", () => {
  it("preserves EXPIRED (regression: previously defaulted to Approved)", () => {
    expect(toLifecycleStatus("EXPIRED")).toBe("EXPIRED");
  });

  it("passes through known UPPER_SNAKE agreement statuses", () => {
    expect(toLifecycleStatus("ACTIVE")).toBe("ACTIVE");
    expect(toLifecycleStatus("APPROVED")).toBe("APPROVED");
    expect(toLifecycleStatus("SUSPENDED")).toBe("SUSPENDED");
    expect(toLifecycleStatus("SUPERSEDED")).toBe("SUPERSEDED");
    expect(toLifecycleStatus("VOID")).toBe("VOID");
    expect(toLifecycleStatus("DRAFT")).toBe("DRAFT");
  });

  it("keeps the request-only Pending value (not recased)", () => {
    expect(toLifecycleStatus("Pending")).toBe("Pending");
  });

  it("falls back to APPROVED for unknown values (incl. dead legacy casings)", () => {
    expect(toLifecycleStatus("Whatever")).toBe("APPROVED");
    expect(toLifecycleStatus("Valid")).toBe("APPROVED");
  });
});
