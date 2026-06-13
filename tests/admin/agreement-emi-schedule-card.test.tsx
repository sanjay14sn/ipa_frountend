import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AgreementEmiScheduleCard } from "@/components/agreements/record-detail/AgreementEmiScheduleCard";
import type {
  ReceivableInstallmentSummary,
  ReceivableSummaryItem,
} from "@/services/agreement.service";

// The timeline strip needs a fully-populated summary; this test only exercises
// the admin table, so stub the timeline out.
vi.mock("@/components/receivables/EmiTimeline", () => ({
  EmiTimeline: () => null,
}));

function ritem(over: Partial<ReceivableSummaryItem>): ReceivableSummaryItem {
  return {
    receivableItemId: 1,
    label: "EMI",
    kind: "installment",
    sequenceNumber: 1,
    amount: 1000,
    status: "due",
    dueAt: "2026-07-15T00:00:00.000Z",
    paidAt: null,
    paymentId: null,
    isInitialPayable: false,
    sortOrder: 1,
    ...over,
  } as ReceivableSummaryItem;
}

function summary(
  items: ReceivableSummaryItem[],
): ReceivableInstallmentSummary {
  return {
    agreementId: 8,
    items,
    nextDueItem: null,
    initialPayableItem: null,
    standing: "current",
    holdReason: null,
  } as unknown as ReceivableInstallmentSummary;
}

describe("AgreementEmiScheduleCard date editing", () => {
  it("renders an editable due-date control for an unpaid item when onEditDueDate is set", () => {
    render(
      <AgreementEmiScheduleCard
        summary={summary([ritem({ receivableItemId: 1, status: "due" })])}
        onEditDueDate={vi.fn().mockResolvedValue(undefined)}
      />,
    );
    expect(
      screen.getByRole("button", { name: /edit due date/i }),
    ).toBeInTheDocument();
  });

  it("renders the due date as plain text for a paid item", () => {
    render(
      <AgreementEmiScheduleCard
        summary={summary([
          ritem({
            receivableItemId: 2,
            status: "paid",
            paidAt: "2026-07-10T00:00:00.000Z",
          }),
        ])}
        onEditDueDate={vi.fn().mockResolvedValue(undefined)}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /edit due date/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Jul 15, 2026")).toBeInTheDocument();
  });

  it("renders the due date as plain text for a waived item", () => {
    render(
      <AgreementEmiScheduleCard
        summary={summary([ritem({ receivableItemId: 3, status: "waived" })])}
        onEditDueDate={vi.fn().mockResolvedValue(undefined)}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /edit due date/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Jul 15, 2026")).toBeInTheDocument();
  });
});
