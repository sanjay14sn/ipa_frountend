/**
 * lib/url-utils.test.ts — Unit tests for URL utilities.
 */

import { describe, it, expect } from "vitest";
import { isAbsoluteUrl, getOrigin } from "./url-utils";

describe("isAbsoluteUrl", () => {
  it("returns true for https URLs", () => {
    expect(isAbsoluteUrl("https://example.com/path")).toBe(true);
  });

  it("returns true for http URLs", () => {
    expect(isAbsoluteUrl("http://localhost:5500/api")).toBe(true);
  });

  it("returns false for relative paths", () => {
    expect(isAbsoluteUrl("/api/v1/profile")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isAbsoluteUrl("")).toBe(false);
  });

  it("returns false for null", () => {
    expect(isAbsoluteUrl(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isAbsoluteUrl(undefined)).toBe(false);
  });

  it("returns false for protocol-relative URLs", () => {
    // //example.com is not https:// or http://
    expect(isAbsoluteUrl("//example.com")).toBe(false);
  });
});

describe("getOrigin", () => {
  it("returns origin for absolute URL", () => {
    expect(getOrigin("https://api.example.com/v1/users")).toBe("https://api.example.com");
  });

  it("returns origin with port", () => {
    expect(getOrigin("http://localhost:5500")).toBe("http://localhost:5500");
  });

  it("returns empty string for relative paths", () => {
    expect(getOrigin("/api/proxy")).toBe("");
  });

  it("returns empty string for null", () => {
    expect(getOrigin(null)).toBe("");
  });
});
