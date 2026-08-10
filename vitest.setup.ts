/**
 * vitest.setup.ts — Global test setup for IPA-frontend.
 *
 * Runs once per test file before any test is executed.
 *
 * - Extends Vitest's `expect` with @testing-library/jest-dom matchers
 *   (e.g. `expect(element).toBeInTheDocument()`).
 * - Starts MSW server in no-warning mode to intercept fetch calls.
 *   Call `server.use(...)` in individual tests to override handlers.
 *
 * @see https://testing-library.com/docs/ecosystem-jest-dom/
 * @see https://mswjs.io/docs/getting-started
 */

import "@testing-library/jest-dom";
import { server } from "./tests/__mocks__/server";

// jsdom has no ResizeObserver; Radix form controls (Checkbox, Select) observe
// their hidden bubble input through it on mount.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??=
  ResizeObserverStub as unknown as typeof ResizeObserver;

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
