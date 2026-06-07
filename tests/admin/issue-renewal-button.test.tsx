import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IssueRenewalButton } from "@/components/agreements/IssueRenewalButton";
import type { AgreementRecord } from "@/services/agreement.service";

const renewMock = vi.fn().mockResolvedValue({ id: 100 });
vi.mock("@/services/agreement.service", async (orig) => {
  const actual = await orig<typeof import("@/services/agreement.service")>();
  return { ...actual, renewProgramAgreementAdmin: (...a: unknown[]) => renewMock(...a) };
});
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient();
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

function agreement(over: Partial<AgreementRecord> = {}): AgreementRecord {
  return {
    id: 50, type: "NEW_PROGRAM", status: "Expired", franchiseFee: 10000,
    monthlyFee: 0, royalty: 0, materialCost: 0, kitCost: 0, ciShare: 0,
    franchiseShare: 0, gstFranchiseFee: false, gstRoyalty: false,
    gstMaterialCost: false, installment: false, tenure: 12,
    programName: "Abacus L1", dateOfSigning: null, franchiseId: "F-1",
    franchiseeId: 7, paymentId: null, franchiseeSignature: null,
    franchiseeSignedAt: null, franchiseeSignatureUrl: null, title: "Abacus L1",
    notes: null, metadata: null, referenceCode: null, createdAt: "", updatedAt: "",
    ...over,
  } as AgreementRecord;
}

beforeEach(() => renewMock.mockClear());

describe("IssueRenewalButton", () => {
  it("renders the trigger for an expired agreement", () => {
    wrap(<IssueRenewalButton agreement={agreement()} />);
    expect(screen.getByRole("button", { name: /issue renewal/i })).toBeInTheDocument();
  });

  it("renders nothing for a non-expired agreement", () => {
    const { container } = wrap(<IssueRenewalButton agreement={agreement({ status: "Valid" })} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("submits the renewal with the entered fee", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    wrap(<IssueRenewalButton agreement={agreement()} />);
    await userEvent.click(screen.getByRole("button", { name: /issue renewal/i }));
    const fee = await screen.findByLabelText(/renewal fee/i);
    await userEvent.clear(fee);
    await userEvent.type(fee, "5000");
    await userEvent.click(screen.getByRole("button", { name: /^issue$/i }));
    expect(renewMock).toHaveBeenCalledWith(
      50,
      expect.objectContaining({ franchiseFee: 5000, tenure: 12 }),
    );
  });
});
