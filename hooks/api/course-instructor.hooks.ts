/**
 * Re-export barrel — keeps existing import paths working.
 * Implementation is split across:
 *   - ci.hooks.ts          (list / detail / CRUD / admin summaries)
 *   - ci-approvals.hooks.ts (approve / reject flows)
 *   - ci-training.hooks.ts  (training sessions, waiting room, bulk-assign)
 *   - ci-franchises.hooks.ts (multi-franchise attach / detach / transfer)
 */
export * from "@/hooks/api/ci.hooks";
export * from "@/hooks/api/ci-approvals.hooks";
export * from "@/hooks/api/ci-training.hooks";
export * from "@/hooks/api/ci-franchises.hooks";
