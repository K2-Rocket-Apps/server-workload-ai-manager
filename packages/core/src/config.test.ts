import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ConfigSchema, DEFAULT_CONFIG } from "../src/config.js";

describe("ConfigSchema", () => {
  it("parses default config", () => {
    const cfg = ConfigSchema.parse(DEFAULT_CONFIG);
    assert.equal(cfg.pve.node, "pve");
    assert.deepEqual(cfg.daemon.watched_vmids, [121, 122]);
  });
});
