/**
 * tests/__mocks__/handlers.ts — Default MSW request handlers.
 *
 * Add handlers for the endpoints your tests depend on. These act as the
 * "happy path" baseline; individual tests can override with `server.use(...)`.
 *
 * Example:
 *   import { http, HttpResponse } from "msw";
 *
 *   http.get("/api/admin/profile", () =>
 *     HttpResponse.json({ result: { id: 1, name: "Test Admin" } })
 *   )
 *
 * @see https://mswjs.io/docs/basics/request-handler
 */

import { http, HttpResponse } from "msw";

export const handlers = [
  // Health check — used by smoke tests to confirm the mock server is running.
  http.get("/api/health", () => HttpResponse.json({ status: "ok" })),
];
