import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CONFIG } from "@mistral/core";
import { ToolRegistry } from "../src/tools.js";

describe("ToolRegistry", () => {
  it("lists all planned tools", () => {
    const registry = new ToolRegistry(DEFAULT_CONFIG);
    const names = registry.definitions().map((d) => d.function.name);
    assert.ok(names.includes("pve_list_vms"));
    assert.ok(names.includes("pve_migrate_vm"));
    assert.ok(names.includes("alert_send"));
  });

  it("blocks migrate on single node", async () => {
    const registry = new ToolRegistry(DEFAULT_CONFIG);
    const result = await registry.execute("pve_migrate_vm", { vmid: 121, target_node: "pve2", approved: true });
    assert.match(result, /blocked|Single-node/);
  });
});
