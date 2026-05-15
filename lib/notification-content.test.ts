import assert from "node:assert/strict";
import test from "node:test";
import { mapApiNotificationRow } from "./notification-content.ts";

test("maps backend notification title, body, and action metadata", () => {
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

  assert.equal(mapped.title, "Order shipped");
  assert.equal(mapped.message, "Order ORD-100 is on the way.");
  assert.equal(mapped.action?.href, "/admin/operations?tab=orders&orderId=100");
  assert.equal(mapped.userType, "admin");
});
