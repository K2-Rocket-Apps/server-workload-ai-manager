import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { matchesCron, shouldAlert } from "../src/state.js";

describe("daemon state", () => {
  it("matches cron every minute", () => {
    assert.equal(matchesCron("* * * * *"), true);
  });

  it("detects new guest agent issue", () => {
    const { alert } = shouldAlert(
      { vmid: 121, name: "k3s-cp", status: "running", node: "pve", guestAgentAlive: false, issues: ["Guest agent unreachable"] },
      ["guest_agent_down"],
      { alertedIssues: {}, recentAlerts: [] },
    );
    assert.equal(alert, true);
  });
});
