import { describe, it, expect } from "vitest";
import { mapApiNotificationRow } from "./notification-content";
import {
  safeParseNotification,
} from "./schemas/notification.schema";

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

  // -------------------------------------------------------------------------
  // Schema fix regression: fetched rows keep body / recipientId / recipientType
  // -------------------------------------------------------------------------

  it("preserves body, recipientId, and recipientType through safeParseNotification → mapApiNotificationRow", () => {
    const raw = {
      id: 99,
      title: "Test title",
      body: "Test body",
      recipientId: 5,
      recipientType: "franchisee",
      isRead: false,
      createdAt: "2026-05-15T10:00:00.000Z",
    };

    const parsed = safeParseNotification(raw);
    const mapped = mapApiNotificationRow(parsed);

    // body must survive Zod parse and land in message
    expect(mapped.message).toBe("Test body");
    // recipientId must not be stripped to NaN
    expect(mapped.recipientId).toBe(5);
  });

  // -------------------------------------------------------------------------
  // Optimistic rollback: safeParseNotification with a completely invalid row
  // returns a safe default and does not throw
  // -------------------------------------------------------------------------

  it("returns safe default for a completely invalid row and does not throw", () => {
    let result: ReturnType<typeof safeParseNotification> | undefined;

    expect(() => {
      result = safeParseNotification({});
    }).not.toThrow();

    expect(result).toBeDefined();
    expect(result!.id).toBe(0);
    expect(result!.title).toBe("");
    expect(result!.isRead).toBe(false);
    expect(result!.body).toBe("");
  });
});
