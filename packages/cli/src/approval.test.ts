import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isApprovalReply, isDenialReply } from "../src/tui/core/approval.js";

describe("approval replies", () => {
  it("detects yes variants", () => {
    assert.equal(isApprovalReply("yes"), true);
    assert.equal(isApprovalReply("Y"), true);
    assert.equal(isApprovalReply("yyy"), true);
    assert.equal(isApprovalReply("go ahead"), true);
  });

  it("detects no variants", () => {
    assert.equal(isDenialReply("no"), true);
    assert.equal(isDenialReply("n"), true);
    assert.equal(isDenialReply("cancel"), true);
  });

  it("rejects normal chat", () => {
    assert.equal(isApprovalReply("please check vms"), false);
    assert.equal(isDenialReply("maybe later"), false);
  });
});
