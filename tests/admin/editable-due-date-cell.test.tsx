import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EditableDueDateCell } from "@/components/agreements/record-detail/EditableDueDateCell";
import type { ReceivableSummaryItem } from "@/services/agreement.service";

function item(over: Partial<ReceivableSummaryItem> = {}): ReceivableSummaryItem {
  return {
    receivableItemId: 11,
    label: "EMI 1",
    kind: "installment",
    sequenceNumber: 1,
    amount: 5000,
    status: "due",
    dueAt: "2026-07-15T00:00:00.000Z",
    paidAt: null,
    paymentId: null,
    isInitialPayable: false,
    sortOrder: 1,
    ...over,
  } as ReceivableSummaryItem;
}

describe("EditableDueDateCell", () => {
  it("shows the formatted due date inside an edit button", () => {
    render(<EditableDueDateCell item={item()} onConfirm={vi.fn()} />);
    const btn = screen.getByRole("button", { name: /edit due date/i });
    expect(btn).toHaveTextContent("Jul 15, 2026");
  });

  it("swaps to a date input pre-filled with the current due date when clicked", () => {
    render(<EditableDueDateCell item={item()} onConfirm={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /edit due date/i }));
    expect(screen.getByLabelText("Due date")).toHaveValue("2026-07-15");
  });

  it("opens a confirm dialog and calls onConfirm with an ISO string on Save", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(<EditableDueDateCell item={item()} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole("button", { name: /edit due date/i }));
    fireEvent.change(screen.getByLabelText("Due date"), {
      target: { value: "2026-07-20" },
    });
    const save = await screen.findByRole("button", { name: /^save$/i });
    fireEvent.click(save);
    await waitFor(() =>
      expect(onConfirm).toHaveBeenCalledWith(11, "2026-07-20T00:00:00.000Z"),
    );
  });

  it("does not open the confirm or call onConfirm when the same date is chosen", () => {
    const onConfirm = vi.fn();
    render(<EditableDueDateCell item={item()} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole("button", { name: /edit due date/i }));
    fireEvent.change(screen.getByLabelText("Due date"), {
      target: { value: "2026-07-15" },
    });
    expect(
      screen.queryByRole("button", { name: /^save$/i }),
    ).not.toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("reverts to view without calling onConfirm when the dialog is cancelled", async () => {
    const onConfirm = vi.fn();
    render(<EditableDueDateCell item={item()} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole("button", { name: /edit due date/i }));
    fireEvent.change(screen.getByLabelText("Due date"), {
      target: { value: "2026-07-20" },
    });
    const cancel = await screen.findByRole("button", { name: /^cancel$/i });
    fireEvent.click(cancel);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /edit due date/i }),
      ).toBeInTheDocument(),
    );
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
