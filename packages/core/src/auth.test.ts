import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword, createSessionToken, verifySessionToken } from "../src/auth.js";

describe("auth", () => {
  it("hashes and verifies password", () => {
    const hash = hashPassword("testpassword123");
    assert.ok(verifyPassword("testpassword123", hash));
    assert.equal(verifyPassword("wrong", hash), false);
  });

  it("creates valid session token", () => {
    const secret = "abc123";
    const token = createSessionToken(secret);
    assert.ok(verifySessionToken(token, secret));
    assert.equal(verifySessionToken(token, "wrong"), false);
  });
});
