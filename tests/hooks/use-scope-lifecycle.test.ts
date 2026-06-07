import { describe, it, expect } from "vitest";
import { toLifecycleStatus } from "@/hooks/use-scope";

describe("toLifecycleStatus", () => {
  it("preserves Expired (regression: previously defaulted to Approved)", () => {
    expect(toLifecycleStatus("Expired")).toBe("Expired");
  });

  it("passes through known statuses", () => {
    expect(toLifecycleStatus("Valid")).toBe("Valid");
    expect(toLifecycleStatus("Approved")).toBe("Approved");
    expect(toLifecycleStatus("Suspended")).toBe("Suspended");
  });

  it("falls back to Approved for unknown values", () => {
    expect(toLifecycleStatus("Whatever")).toBe("Approved");
  });
});
