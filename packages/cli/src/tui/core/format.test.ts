import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatBytes, formatPercent, formatUptime, truncate } from "../core/format.js";
import { wrapText } from "../render/wrap.js";

describe("format utilities", () => {
  it("formats bytes", () => {
    assert.match(formatBytes(1536), /KB|1\.5/);
  });

  it("formats percent", () => {
    assert.equal(formatPercent(50.5, undefined, 0), "51%");
  });

  it("formats uptime", () => {
    assert.match(formatUptime(86400), /d|day/);
  });

  it("truncates long strings", () => {
    assert.equal(truncate("hello world", 8).length, 8);
  });
});

describe("wrapText", () => {
  it("wraps at width", () => {
    const lines = wrapText("one two three four five", 10);
    assert.ok(lines.length >= 2);
  });

  it("preserves empty lines between paragraphs", () => {
    const lines = wrapText("a\n\nb", 20);
    assert.ok(lines.includes(""));
  });
});
