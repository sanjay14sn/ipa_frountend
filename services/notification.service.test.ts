import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/__mocks__/server";
import { API_BASE_URL } from "@/lib/config";
import { markAllAsRead } from "./notification.service";

describe("markAllAsRead", () => {
  it("resolves when the backend returns a void body (no data key)", async () => {
    // PATCH /notification/read-all returns Promise<void>, so the wrapped
    // response is `{ success, requestId }` with no `data` key at all —
    // the axios interceptor never remaps it to `result`.
    server.use(
      http.patch(`${API_BASE_URL}/notification/read-all`, () =>
        HttpResponse.json({ success: true, requestId: "test-req" }),
      ),
    );

    await expect(markAllAsRead("franchisee")).resolves.toBe(0);
  });

  it("returns the count when the backend provides one", async () => {
    server.use(
      http.patch(`${API_BASE_URL}/admin/notification/read-all`, () =>
        HttpResponse.json({
          success: true,
          data: { count: 7 },
          requestId: "test-req",
        }),
      ),
    );

    await expect(markAllAsRead("admin")).resolves.toBe(7);
  });
});
