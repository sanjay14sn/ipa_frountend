import { describe, it, expect } from "vitest";
import { mapApiNotificationRow } from "./notification-content";

describe("mapApiNotificationRow", () => {
  it("maps backend notification title, body, and action metadata", () => {
    const mapped = mapApiNotificationRow({
      id: 42,
      recipientId: 7,
      recipientType: "admin",
      type: "ORDER_SHIPPED",
      title: "Order shipped",
      body: "Order ORD-100 is on the way.",
      metadata: {
        action: {
          label: "View order",
          href: "/admin/operations?tab=orders&orderId=100",
        },
      },
      isRead: false,
      createdAt: "2026-05-15T10:00:00.000Z",
    });

    expect(mapped.title).toBe("Order shipped");
    expect(mapped.message).toBe("Order ORD-100 is on the way.");
    expect(mapped.action?.href).toBe(
      "/admin/operations?tab=orders&orderId=100",
    );
    expect(mapped.userType).toBe("admin");
  });
});
