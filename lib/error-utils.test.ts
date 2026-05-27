import { describe, it, expect } from "vitest";
import {
  extractErrorMessage,
  getUserFriendlyMessage,
} from "./error-utils";

describe("getUserFriendlyMessage", () => {
  it("maps raw backend error codes to friendly messages", () => {
    const error = {
      response: {
        data: {
          code: "INVALID_PASSWORD",
          message: "INVALID_PASSWORD",
        },
      },
    };
    expect(getUserFriendlyMessage(error)).toBe("Invalid username or password.");
  });

  it("keeps backend public messages when they are already friendly", () => {
    const error = {
      response: {
        data: {
          code: "UNKNOWN_CODE",
          title: "Upload failed",
          message: "Please upload a CSV file.",
        },
      },
    };
    expect(getUserFriendlyMessage(error)).toBe("Upload failed");
  });
});

describe("extractErrorMessage", () => {
  it("does not display raw constant messages", () => {
    expect(extractErrorMessage("STUDENT_NOT_FOUND", "Fallback message")).toBe(
      "Fallback message",
    );
  });
});
