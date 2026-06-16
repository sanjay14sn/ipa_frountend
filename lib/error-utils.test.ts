import { describe, it, expect } from "vitest";
import {
  extractErrorMessage,
  extractErrorCode,
  getUserFriendlyMessage,
  getApiFieldErrors,
  resolveApiError,
} from "./error-utils";

/** Build an axios-like error with the backend's structured error body. */
function apiError(
  data: Record<string, unknown>,
  status = 400,
): { response: { status: number; data: Record<string, unknown> } } {
  return { response: { status, data } };
}

describe("getUserFriendlyMessage", () => {
  it("maps auth codes to a consistent anti-enumeration message", () => {
    expect(
      getUserFriendlyMessage(
        apiError({ code: "INVALID_PASSWORD", message: "INVALID_PASSWORD" }, 401),
      ),
    ).toBe("Invalid username or password.");
  });

  it("auth override wins even when the backend sends a specific message", () => {
    // Prevents leaking whether the account exists at login.
    expect(
      getUserFriendlyMessage(
        apiError({ code: "FRANCHISEE_NOT_FOUND", message: "We could not find that franchisee." }, 404),
      ),
    ).toBe("Invalid username or password.");
  });

  it("shows the specific backend message instead of the generic title (core fix)", () => {
    // The backend raises duplicate email as BAD_REQUEST with the generic catalog
    // title but a specific message. The specific message must win.
    expect(
      getUserFriendlyMessage(
        apiError({
          code: "BAD_REQUEST",
          title: "Request could not be completed",
          message: "An account with this email already exists",
        }),
      ),
    ).toBe("This email address is already registered. Please use a different email.");
  });

  it("keeps backend public messages when they are already friendly", () => {
    expect(
      getUserFriendlyMessage(
        apiError({
          code: "UNKNOWN_CODE",
          title: "Upload failed",
          message: "Please upload a CSV file.",
        }),
      ),
    ).toBe("Please upload a CSV file.");
  });

  it("falls back to friendly copy for generic codes with no specific message", () => {
    expect(getUserFriendlyMessage(apiError({ code: "BAD_REQUEST" }))).toBe(
      "Please check the submitted information and try again.",
    );
  });

  it("surfaces specific validation reasons over the generic line", () => {
    expect(
      getUserFriendlyMessage(
        apiError({
          code: "VALIDATION_FAILED",
          message: "Some fields need attention before you can continue.",
          details: { fields: { form: ["phone must be 10 digits", "name should not be empty"] } },
        }),
      ),
    ).toBe("phone must be 10 digits; name should not be empty");
  });
});

describe("duplicate field detection (message-pattern based)", () => {
  it("normalises a duplicate-phone BAD_REQUEST and targets the phone field", () => {
    const err = apiError({
      code: "BAD_REQUEST",
      message: "An account with this phone already exists",
    });
    expect(getUserFriendlyMessage(err)).toBe(
      "This phone number is already registered. Please use a different number.",
    );
    expect(getApiFieldErrors(err)).toEqual({
      phone: "This phone number is already registered. Please use a different number.",
    });
  });

  it("targets the email field for a duplicate email", () => {
    const err = apiError({
      code: "BAD_REQUEST",
      message: "An account with this email already exists",
    });
    expect(getApiFieldErrors(err)).toEqual({
      email: "This email address is already registered. Please use a different email.",
    });
  });

  it("targets the franchiseName field for a duplicate franchise name", () => {
    const err = apiError({ code: "BAD_REQUEST", message: "Franchise name must be unique" });
    expect(getUserFriendlyMessage(err)).toBe(
      "A franchise with this name already exists. Please choose a different name.",
    );
    expect(getApiFieldErrors(err)).toEqual({
      franchiseName: "A franchise with this name already exists. Please choose a different name.",
    });
  });

  it("maps a dedicated backend code to its field", () => {
    expect(getApiFieldErrors(apiError({ code: "EMAIL_ALREADY_EXISTS" }))).toEqual({
      email: "This email address is already registered. Please use a different email.",
    });
  });
});

describe("extractErrorMessage", () => {
  it("does not display raw constant messages", () => {
    expect(extractErrorMessage("STUDENT_NOT_FOUND", "Fallback message")).toBe(
      "Fallback message",
    );
  });

  it("never leaks a raw ORM/DB error to the user", () => {
    expect(
      extractErrorMessage(
        apiError({
          code: "INTERNAL_SERVER_ERROR",
          message: "SequelizeUniqueConstraintError: Validation error",
        }, 500),
      ),
    ).toBe("This record conflicts with existing data. Please review your input and try again.");
  });

  it("reports a friendly message for network errors", () => {
    expect(extractErrorMessage({ isAxiosError: true, code: "ERR_NETWORK", message: "Network Error" })).toBe(
      "Could not reach the server. Please check your connection and try again.",
    );
  });
});

describe("extractErrorCode", () => {
  it("returns the backend error code", () => {
    expect(extractErrorCode(apiError({ code: "PROGRAM_REQUEST_EXISTS" }, 409))).toBe(
      "PROGRAM_REQUEST_EXISTS",
    );
  });
});

describe("resolveApiError", () => {
  it("returns a normalised view with message + field errors", () => {
    const resolved = resolveApiError(
      apiError({
        code: "BAD_REQUEST",
        message: "An account with this email already exists",
        requestId: "req-123",
      }),
    );
    expect(resolved).toMatchObject({
      status: 400,
      code: "BAD_REQUEST",
      message: "This email address is already registered. Please use a different email.",
      fieldErrors: {
        email: "This email address is already registered. Please use a different email.",
      },
      requestId: "req-123",
      isNetworkError: false,
    });
  });
});
