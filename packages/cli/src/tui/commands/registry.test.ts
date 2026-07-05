import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { filterCommands, resolveCommand, shouldShowPalette } from "./registry.js";

describe("slash command registry", () => {
  it("resolves model alias", () => {
    assert.equal(resolveCommand("model")?.name, "model");
  });

  it("filters partial commands", () => {
    const matches = filterCommands("/mod");
    assert.ok(matches.some((m) => m.name === "model"));
  });

  it("shows model choices after /model ", () => {
    const matches = filterCommands("/model ");
    assert.ok(matches.length >= 3);
    assert.ok(matches.some((m) => m.usage.includes("mistral-small")));
  });

  it("shows palette for bare slash", () => {
    assert.equal(shouldShowPalette("/"), true);
  });

  it("hides palette for complete no-arg command", () => {
    assert.equal(shouldShowPalette("/report"), false);
  });
});
