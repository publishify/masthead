import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TOOLS } from "../shared/tools";

describe("plugin package", () => {
  it("carries a valid plugin manifest", () => {
    const manifest = JSON.parse(readFileSync(".claude-plugin/plugin.json", "utf-8"));
    expect(manifest.name).toBe("masthead");
  });

  it("does not contain any role cards", () => {
    expect(existsSync("cards")).toBe(false);
    const bundle = readFileSync("scripts/bin/masthead.mjs", "utf-8");
    expect(bundle).not.toContain("You read one section of the book once");
  });

  it("knows the five server tools", () => {
    expect(TOOLS).toHaveLength(5);
  });
});

describe("plugin instructions", () => {
  const files = ["commands/review.md", "commands/status.md"];

  it.each(files)("%s starts with a valid header", (file) => {
    expect(readFileSync(file, "utf-8")).toMatch(/^---\n[a-z-]+: .+\n(?:[\s\S]*?\n)?---\n/);
  });
});
