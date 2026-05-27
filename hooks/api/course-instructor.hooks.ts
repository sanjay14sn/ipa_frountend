/**
 * Re-export barrel — keeps existing import paths working.
 * Implementation is split across:
 *   - ci.hooks.ts          (list / detail / CRUD / admin summaries)
 *   - ci-approvals.hooks.ts (approve / reject flows)
 *   - ci-training.hooks.ts  (training sessions, waiting room, bulk-assign)
 */
export * from "@/hooks/api/ci.hooks";
export * from "@/hooks/api/ci-approvals.hooks";
export * from "@/hooks/api/ci-training.hooks";
