import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import {
  CardListSkeleton,
  PageSkeleton,
  StatCardSkeleton,
  StatGridSkeleton,
  TableSkeleton,
} from "@/components/shared/skeletons";

describe("skeleton primitives", () => {
  it("each primitive renders its data-testid", () => {
    render(
      <>
        <TableSkeleton />
        <PageSkeleton />
        <StatCardSkeleton />
        <StatGridSkeleton />
        <CardListSkeleton />
      </>,
    );
    expect(screen.getByTestId("table-skeleton")).toBeTruthy();
    expect(screen.getByTestId("page-skeleton")).toBeTruthy();
    expect(screen.getAllByTestId("stat-card-skeleton").length).toBeGreaterThan(
      0,
    );
    expect(screen.getByTestId("stat-grid-skeleton")).toBeTruthy();
    expect(screen.getByTestId("card-list-skeleton")).toBeTruthy();
  });

  it("StatGridSkeleton renders `count` stat cards", () => {
    render(<StatGridSkeleton count={3} />);
    expect(screen.getAllByTestId("stat-card-skeleton")).toHaveLength(3);
  });
});
