import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatVmAlert } from "../src/dispatcher.js";

describe("formatVmAlert", () => {
  it("formats subject with vmid and name", () => {
    const alert = formatVmAlert({ vmid: 121, name: "k3s-cp", issues: ["Guest agent unreachable"], cpuPercent: 92 });
    assert.match(alert.subject, /121/);
    assert.match(alert.body, /mistral check/);
  });
});
