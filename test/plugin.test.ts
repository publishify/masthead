import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TOOLS } from "../shared/tools";

describe("plugin package", () => {
  it("carries a valid plugin manifest", () => {
    const manifest = JSON.parse(readFileSync(".claude-plugin/plugin.json", "utf-8"));
    expect(manifest.name).toBe("masthead");
  });

  it("does not contain any role cards", () => {
    expect(existsSync("cards")).toBe(false);
    expect(readdirSync("agents").filter((f) => f.endsWith(".md")).length).toBeLessThanOrEqual(1);
  });

  it("knows the five server tools", () => {
    expect(TOOLS).toHaveLength(5);
  });
});

describe("plugin instructions", () => {
  const files = [
    "agents/board-worker.md",
    "commands/review.md",
    "commands/status.md",
    "skills/editorial-board/SKILL.md",
  ];

  it.each(files)("%s starts with a valid header", (file) => {
    expect(readFileSync(file, "utf-8")).toMatch(/^---\n[a-z-]+: .+\n(?:[\s\S]*?\n)?---\n/);
  });
});
