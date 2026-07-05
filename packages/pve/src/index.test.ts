import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("PveClient types", () => {
  it("exports createPveClient", async () => {
    const mod = await import("../src/index.js");
    assert.equal(typeof mod.createPveClient, "function");
  });
});
