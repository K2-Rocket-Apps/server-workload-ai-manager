import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { fuzzyFilter, scoreMatch } from "../core/fuzzy.js";

describe("fuzzy search", () => {
  it("scores matching prefix", () => {
    assert.ok(scoreMatch("mod", "model")!.score > 0);
    assert.equal(scoreMatch("xyz", "model"), null);
  });

  it("filters command names", () => {
    const items = ["model", "daemon", "report", "help"];
    const results = fuzzyFilter(items, "rep", (s) => s);
    assert.deepEqual(results.map((r) => r.item), ["report"]);
  });

  it("returns all when query empty", () => {
    const items = ["a", "b", "c"];
    const results = fuzzyFilter(items, "", (s) => s);
    assert.equal(results.length, 3);
  });
});
