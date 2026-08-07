import { describe, it, expect } from "vitest";

import { STEP_SCHEMAS } from "@/components/franchise-application-modal";

/**
 * The public franchise-application wizard validates one step at a time, and
 * several of its rules are `else if` chains — one slot shows one message, in a
 * fixed priority order. Those chains moved from an imperative switch into zod
 * superRefine blocks, so they are pinned here: the priority is the behaviour,
 * not an implementation detail.
 */
type Errors = Record<string, string>;

function validate(step: number, data: unknown): Errors {
  const result = STEP_SCHEMAS[step]!.safeParse(data);
  if (result.success) return {};
  const errors: Errors = {};
  for (const problem of result.error.issues) {
    const key = String(problem.path[0]);
    if (!(key in errors)) errors[key] = problem.message;
  }
  return errors;
}

const base = () => ({
  franchisee: {
    name: "",
    dob: null as unknown,
    city: "",
    state: "",
    pincode: "",
    phone: "",
    mail: "",
  },
  franchise: {
    name: "",
    type: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    programIds: [] as number[],
  },
});

describe("step 1 — identity", () => {
  it("requires name and date of birth", () => {
    expect(validate(1, base())).toEqual({
      name: "Name is required",
      dob: "Date of birth is required",
    });
  });

  it("passes when both are present", () => {
    const d = base();
    d.franchisee.name = "Asha";
    d.franchisee.dob = new Date("2000-01-01");
    expect(validate(1, d)).toEqual({});
  });
});

describe("step 2 — franchisee location priority", () => {
  it("reports state first, in the shared city slot", () => {
    expect(validate(2, base())).toEqual({ franchiseeCity: "State is required" });
  });

  it("reports city only once state is set", () => {
    const d = base();
    d.franchisee.state = "Kerala";
    expect(validate(2, d)).toEqual({ franchiseeCity: "City is required" });
  });

  it("reports pincode only once state and city are set", () => {
    const d = base();
    d.franchisee.state = "Kerala";
    d.franchisee.city = "Kochi";
    expect(validate(2, d)).toEqual({
      franchiseePincode: "Pincode is required",
    });
  });

  it("passes when all three are set", () => {
    const d = base();
    d.franchisee.state = "Kerala";
    d.franchisee.city = "Kochi";
    d.franchisee.pincode = "682001";
    expect(validate(2, d)).toEqual({});
  });
});

describe("step 3 — contact", () => {
  it("requires phone and email", () => {
    expect(validate(3, base())).toEqual({
      phone: "Phone number is required",
      mail: "Email is required",
    });
  });

  it("rejects a malformed email", () => {
    const d = base();
    d.franchisee.phone = "9999999999";
    d.franchisee.mail = "not-an-email";
    expect(validate(3, d)).toEqual({
      mail: "Please enter a valid email address",
    });
  });

  it("accepts a well-formed email", () => {
    const d = base();
    d.franchisee.phone = "9999999999";
    d.franchisee.mail = "asha@example.com";
    expect(validate(3, d)).toEqual({});
  });
});

describe("step 4 — franchise", () => {
  it("requires every field, reporting state before city", () => {
    expect(validate(4, base())).toEqual({
      franchiseName: "Franchise name is required",
      franchiseType: "Franchise type is required",
      programIds: "Select exactly one program",
      address: "Centre address is required",
      centerCity: "State is required",
    });
  });

  it("requires EXACTLY one program, not at least one", () => {
    const d = base();
    d.franchise.programIds = [1, 2];
    expect(validate(4, d).programIds).toBe("Select exactly one program");
  });

  it("passes with exactly one program and all fields set", () => {
    const d = base();
    d.franchise.name = "Kochi Centre";
    d.franchise.type = "School";
    d.franchise.address = "12 MG Road";
    d.franchise.state = "Kerala";
    d.franchise.city = "Kochi";
    d.franchise.pincode = "682001";
    d.franchise.programIds = [1];
    expect(validate(4, d)).toEqual({});
  });
});
