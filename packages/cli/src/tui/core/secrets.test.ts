import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { redactSlashCommand } from "../core/secrets.js";

describe("secret redaction", () => {
  it("redacts apikey values", () => {
    assert.equal(redactSlashCommand("/apikey abc123secret"), "/apikey ****");
  });

  it("leaves status-only apikey visible", () => {
    assert.equal(redactSlashCommand("/apikey"), "/apikey");
  });

  it("leaves normal commands alone", () => {
    assert.equal(redactSlashCommand("/report"), "/report");
  });
});
