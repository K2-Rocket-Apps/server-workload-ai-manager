import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hostCpuToPercent, vmCpuToPercent } from "../src/metrics.js";

describe("PVE CPU metrics", () => {
  it("converts host CPU fraction to percent", () => {
    assert.equal(hostCpuToPercent(0.15), 15);
    assert.equal(hostCpuToPercent(0.004), 0);
  });

  it("does not divide host CPU by maxcpu", () => {
    // Bug: 0.15/16*100 ≈ 1% — wrong. Should be 15%.
    assert.equal(hostCpuToPercent(0.15), 15);
  });

  it("converts VM CPU fraction to percent", () => {
    assert.equal(vmCpuToPercent(0.48), 48);
    assert.equal(vmCpuToPercent(undefined), undefined);
  });
});
