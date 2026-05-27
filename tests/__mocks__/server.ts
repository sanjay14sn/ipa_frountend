/**
 * tests/__mocks__/server.ts — MSW test server.
 *
 * Import and use `server.use(handler)` in individual tests to add or override
 * request handlers for that specific test. Handlers reset after each test
 * (configured in `vitest.setup.ts`).
 *
 * @see https://mswjs.io/docs/getting-started/integrate/node
 */

import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);
