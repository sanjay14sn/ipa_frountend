import assert from "node:assert/strict";
import test from "node:test";
import {
  extractErrorMessage,
  getUserFriendlyMessage,
} from "./error-utils.ts";

test("maps raw backend error codes to friendly messages", () => {
  const error = {
    response: {
      data: {
        code: "INVALID_PASSWORD",
        message: "INVALID_PASSWORD",
      },
    },
  };

  assert.equal(
    getUserFriendlyMessage(error),
    "Invalid username or password.",
  );
});

test("does not display raw constant messages", () => {
  assert.equal(
    extractErrorMessage("STUDENT_NOT_FOUND", "Fallback message"),
    "Fallback message",
  );
});

test("keeps backend public messages when they are already friendly", () => {
  const error = {
    response: {
      data: {
        code: "UNKNOWN_CODE",
        title: "Upload failed",
        message: "Please upload a CSV file.",
      },
    },
  };

  assert.equal(getUserFriendlyMessage(error), "Upload failed");
});
