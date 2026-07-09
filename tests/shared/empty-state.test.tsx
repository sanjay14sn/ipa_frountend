import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ShoppingCart } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";

describe("EmptyState", () => {
  it("renders title, hint, and action", () => {
    render(
      <EmptyState
        title="No orders yet"
        hint="Place your first material request"
        action={<button>New order</button>}
      />,
    );
    expect(screen.getByTestId("empty-state")).toBeTruthy();
    expect(screen.getByText("No orders yet")).toBeTruthy();
    expect(screen.getByText("Place your first material request")).toBeTruthy();
    expect(screen.getByRole("button", { name: "New order" })).toBeTruthy();
  });

  it("renders a custom icon and compact density", () => {
    const { container } = render(
      <EmptyState title="No items" icon={ShoppingCart} compact />,
    );
    expect(container.querySelector("svg")).toBeTruthy();
    expect(screen.getByTestId("empty-state").className).toContain("py-6");
  });
});
