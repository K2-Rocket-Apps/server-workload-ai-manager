import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseMarkdown } from "../render/markdown.js";
import { computeLayout } from "../core/layout.js";
import { getTheme, listThemeNames } from "../core/theme.js";

describe("markdown parser", () => {
  it("parses headings", () => {
    const blocks = parseMarkdown("# Title\n\nBody");
    assert.ok(blocks.some((b) => b.type === "heading"));
    assert.ok(blocks.some((b) => b.type === "paragraph"));
  });

  it("parses code fences", () => {
    const blocks = parseMarkdown("```\ncode\n```");
    assert.ok(blocks.some((b) => b.type === "code"));
  });

  it("parses bullet lists", () => {
    const blocks = parseMarkdown("- one\n- two");
    assert.ok(blocks.some((b) => b.type === "list"));
  });
});

describe("layout", () => {
  it("computes sidebar on wide terminals", () => {
    const layout = computeLayout(120, 40);
    assert.ok(layout.sidebarVisible);
    assert.ok(layout.mainWidth > 40);
  });

  it("hides sidebar on narrow terminals", () => {
    const layout = computeLayout(60, 24);
    assert.equal(layout.sidebarVisible, false);
  });
});

describe("themes", () => {
  it("lists five themes", () => {
    assert.equal(listThemeNames().length, 5);
  });

  it("returns mistral by default", () => {
    assert.equal(getTheme().name, "mistral");
  });
});
