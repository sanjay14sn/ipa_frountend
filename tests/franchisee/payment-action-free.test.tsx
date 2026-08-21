import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PaymentAction from "../../app/franchisee/agreement/_components/PaymentAction";
import { formatRupees } from "@/lib/currency-utils";

describe("PaymentAction — free activation mode", () => {
  it("renders the no-cost card and activates on click", () => {
    const onSubmit = vi.fn();
    render(
      <PaymentAction
        agreementAccepted
        isProcessingPayment={false}
        onPaymentSubmit={onSubmit}
        variant="final"
        freeActivation
      />,
    );

    expect(screen.getByText("No payment required")).toBeInTheDocument();
    expect(screen.getByText("Activation is immediate")).toBeInTheDocument();
    expect(screen.queryByText(/Razorpay/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^activate$/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("blocks activation until terms are accepted", () => {
    const onSubmit = vi.fn();
    render(
      <PaymentAction
        agreementAccepted={false}
        isProcessingPayment={false}
        onPaymentSubmit={onSubmit}
        variant="final"
        freeActivation
      />,
    );

    const button = screen.getByRole("button", { name: /^activate$/i });
    expect(button).toBeDisabled();
    expect(
      screen.getByText(/accept the terms and conditions/i),
    ).toBeInTheDocument();
  });

  it("still renders the paid card when the agreement has a fee", () => {
    render(
      <PaymentAction
        agreementAccepted
        isProcessingPayment={false}
        onPaymentSubmit={() => {}}
        variant="final"
        payableAmount={59000}
        payablePrincipal={50000}
        payableGst={9000}
        payableLabel="Franchise fee"
      />,
    );

    expect(
      screen.getByRole("button", { name: new RegExp(`Pay`, "i") }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(new RegExp(formatRupees(59000).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))).length).toBeGreaterThan(0);
  });
});
