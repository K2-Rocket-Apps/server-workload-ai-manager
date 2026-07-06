import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hostCpuToPercent, vmCpuFromCluster, vmCpuToPercent } from "../src/metrics.js";

describe("PVE CPU metrics", () => {
  it("converts host CPU fraction to percent", () => {
    assert.equal(hostCpuToPercent(0.15), 15);
    assert.equal(hostCpuToPercent(0.004), 0);
  });

  it("does not divide host CPU by maxcpu", () => {
    assert.equal(hostCpuToPercent(0.15), 15);
  });

  it("converts VM status/current CPU fraction to percent", () => {
    assert.equal(vmCpuToPercent(0.48), 48);
    assert.equal(vmCpuToPercent(0.01, 1), 1);
    assert.equal(vmCpuToPercent(1, 1), 100);
    assert.equal(vmCpuToPercent(undefined), undefined);
  });

  it("converts cluster/resources VM CPU with maxcpu", () => {
    assert.equal(vmCpuFromCluster(0.36, 2), 18);
    assert.equal(vmCpuFromCluster(1, 1), 100);
  });
});
