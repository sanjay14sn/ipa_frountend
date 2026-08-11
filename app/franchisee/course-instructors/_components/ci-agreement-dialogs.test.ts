import { describe, expect, it } from "vitest";
import { pickCurrentAgreementPerInstructor } from "./ci-agreement-dialogs";
import type { CIAgreementData } from "@/services/contracting.service";

function row(over: Partial<CIAgreementData>): CIAgreementData {
  return {
    id: 1,
    title: "Course Instructor Agreement",
    status: "ACTIVE" as CIAgreementData["status"],
    phase: "SIGNED" as CIAgreementData["phase"],
    instructorId: 10,
    franchiseId: "FR-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

describe("pickCurrentAgreementPerInstructor", () => {
  it("prefers the live row over a voided predecessor regardless of server order", () => {
    const voided = row({ id: 9, status: "VOID" as CIAgreementData["status"] });
    const approved = row({
      id: 5,
      status: "APPROVED" as CIAgreementData["status"],
    });
    // VOID arrives LAST — the old Map.set last-write-wins picked it.
    const out = pickCurrentAgreementPerInstructor([approved, voided]);
    expect(out.get(10)?.id).toBe(5);
    // …and in the other order too (deterministic, not order-dependent).
    const out2 = pickCurrentAgreementPerInstructor([voided, approved]);
    expect(out2.get(10)?.id).toBe(5);
  });

  it("prefers the ACTIVE successor over its SUPERSEDED predecessor", () => {
    const superseded = row({
      id: 3,
      status: "SUPERSEDED" as CIAgreementData["status"],
    });
    const active = row({ id: 7, status: "ACTIVE" as CIAgreementData["status"] });
    const out = pickCurrentAgreementPerInstructor([active, superseded]);
    expect(out.get(10)?.id).toBe(7);
  });

  it("falls back to the newest row when no live row exists (all expired/void)", () => {
    const older = row({ id: 2, status: "VOID" as CIAgreementData["status"] });
    const newer = row({ id: 6, status: "EXPIRED" as CIAgreementData["status"] });
    const out = pickCurrentAgreementPerInstructor([older, newer]);
    expect(out.get(10)?.id).toBe(6);
  });

  it("picks the newest among several live rows and keys instructors independently", () => {
    const a1 = row({ id: 4, instructorId: 10 });
    const a2 = row({ id: 8, instructorId: 10 });
    const b = row({ id: 5, instructorId: 20 });
    const out = pickCurrentAgreementPerInstructor([a1, a2, b]);
    expect(out.get(10)?.id).toBe(8);
    expect(out.get(20)?.id).toBe(5);
    expect(out.size).toBe(2);
  });
});
