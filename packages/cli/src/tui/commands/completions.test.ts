import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatCompletionRows, mergeCompletions } from "../commands/completions.js";

describe("command completions", () => {
  it("merges static and dynamic without dupes", () => {
    const merged = mergeCompletions(["a", "b"], [
      { value: "b", label: "b2" },
      { value: "c", label: "c" },
    ]);
    assert.deepEqual(merged.map((m) => m.value), ["a", "b", "c"]);
  });

  it("formats rows for palette", () => {
    const rows = formatCompletionRows([
      { value: "121", label: "121 k3s-cp", description: "VM ID" },
    ]);
    assert.match(rows[0]!, /121 k3s-cp/);
  });
});
