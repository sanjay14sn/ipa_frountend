import { api } from "@/lib/axios";
import { unwrapData } from "@/lib/unwrap-api";

/**
 * Eager-uniqueness probes backing `useUniquenessCheck`. Each resolves to
 * `true` when the value is free. All endpoints are authenticated — there is
 * deliberately no public variant (enumeration oracle, audit F16).
 */

export interface UniquenessCheckOpts {
  /** Exclude this record (self) when editing. */
  excludeId?: number | string;
  signal?: AbortSignal;
}

async function fetchAvailability(
  url: string,
  params: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<boolean> {
  const response = await api.get(url, { params, signal });
  return unwrapData<{ available: boolean }>(response).available;
}

/** Franchisee (owner) email/phone — admin franchise-setup wizard. */
export function checkFranchiseeAvailability(
  field: "email" | "phone",
  value: string,
  opts: UniquenessCheckOpts = {},
): Promise<boolean> {
  return fetchAvailability(
    "/admin/franchise/franchisee/check-availability",
    { field, value, excludeId: opts.excludeId },
    opts.signal,
  );
}

/**
 * Franchise name (admin or franchisee session). `anyStatus` matches the
 * admin wizard's stricter any-status pre-check; default mirrors the DB
 * partial index (rejected franchises release their name).
 */
export function checkFranchiseNameAvailability(
  name: string,
  opts: UniquenessCheckOpts & { anyStatus?: boolean } = {},
): Promise<boolean> {
  return fetchAvailability(
    "/franchise/check-availability",
    { name, excludeId: opts.excludeId, anyStatus: opts.anyStatus },
    opts.signal,
  );
}

/** Course-instructor email; realm picks the admin or franchisee route. */
export function checkCourseInstructorEmail(
  realm: "admin" | "franchisee",
  value: string,
  opts: UniquenessCheckOpts = {},
): Promise<boolean> {
  return fetchAvailability(
    realm === "admin"
      ? "/admin/course-instructor/check-availability"
      : "/course-instructor/check-availability",
    { value, excludeId: opts.excludeId },
    opts.signal,
  );
}

/** Admin account emailId/name — super-admin management form. */
export function checkAdminAvailability(
  field: "emailId" | "name",
  value: string,
  opts: UniquenessCheckOpts = {},
): Promise<boolean> {
  return fetchAvailability(
    "/admin/check-availability",
    { field, value, excludeId: opts.excludeId },
    opts.signal,
  );
}

/** Program name — catalog program dialog. */
export function checkProgramName(
  name: string,
  opts: UniquenessCheckOpts = {},
): Promise<boolean> {
  return fetchAvailability(
    "/catalog/program/check-availability",
    { name, excludeId: opts.excludeId },
    opts.signal,
  );
}

/** Level display order within a stream — catalog level dialog. */
export function checkLevelDisplayOrder(
  streamId: number,
  displayOrder: number,
  opts: UniquenessCheckOpts = {},
): Promise<boolean> {
  return fetchAvailability(
    "/catalog/level/check-availability",
    { streamId, displayOrder, excludeId: opts.excludeId },
    opts.signal,
  );
}

/** CI training level code/displayOrder within a program. */
export function checkCiTrainingLevel(
  programId: number,
  field: "code" | "displayOrder",
  value: string,
  opts: UniquenessCheckOpts = {},
): Promise<boolean> {
  return fetchAvailability(
    "/catalog/ci-training-level/check-availability",
    { programId, field, value, excludeId: opts.excludeId },
    opts.signal,
  );
}

/** Stream-transition (programId, fromStreamId) pair. */
export function checkStreamTransition(
  programId: number,
  fromStreamId: number,
  opts: UniquenessCheckOpts = {},
): Promise<boolean> {
  return fetchAvailability(
    "/catalog/stream-transition/check-availability",
    { programId, fromStreamId, excludeId: opts.excludeId },
    opts.signal,
  );
}
