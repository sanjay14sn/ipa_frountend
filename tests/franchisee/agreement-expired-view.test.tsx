import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AgreementExpiredView } from "../../app/franchisee/agreement/_components/AgreementExpiredView";
import type { AgreementRecord } from "@/services/agreement.service";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

function makeAgreement(over: Partial<AgreementRecord> = {}): AgreementRecord {
  return {
    id: 50,
    kind: "PROGRAM",
    origin: "NEW",
    status: "EXPIRED",
    expiresAt: "2026-01-01T00:00:00.000Z",
    programName: "Abacus L1",
    dateOfSigning: null,
    franchiseId: "F-1",
    franchiseeId: 7,
    franchiseeSignedAt: null,
    title: "Abacus L1",
    notes: null,
    metadata: null,
    referenceCode: null,
    createdAt: "",
    ...over,
  } as AgreementRecord;
}

describe("AgreementExpiredView", () => {
  it("shows informational state when no renewal is issued", () => {
    render(
      <AgreementExpiredView agreement={makeAgreement()} renewalAgreementId={null} />,
    );
    expect(screen.getByText("Expired")).toBeInTheDocument();
    expect(screen.getByText(/being prepared/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /pay again/i })).toBeNull();
  });

  it("shows a Pay again button that routes to the renewal when issued", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    render(
      <AgreementExpiredView agreement={makeAgreement()} renewalAgreementId={100} />,
    );
    const btn = screen.getByRole("button", { name: /pay again/i });
    await userEvent.click(btn);
    expect(push).toHaveBeenCalledWith("/franchisee/agreement?agreementId=100");
  });
});
