import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderHtml } from "../scripts/dashboard/render";

const template = readFileSync("scripts/dashboard/template.html", "utf-8");
const sample = JSON.parse(readFileSync("test/fixtures/dashboard-sample.json", "utf-8"));

describe("dashboard", () => {
  it("places the data into the template", () => {
    const html = renderHtml(sample, template);
    expect(html).not.toContain("__MASTHEAD_DATA__");
    expect(html).toContain("Publishify Masthead");
  });

  it("always produces the same output for the same data", () => {
    expect(renderHtml(sample, template)).toBe(renderHtml(sample, template));
  });

  it("does not run markup found in the text", () => {
    const hostile = structuredClone(sample);
    hostile.project.title = "</script><script>alert(1)</script>";
    expect(renderHtml(hostile, template)).not.toContain("<script>alert(1)");
  });

  it("rejects a verdict field", () => {
    const withVerdict = structuredClone(sample);
    withVerdict.analysis.verdict = "Ready";
    expect(() => renderHtml(withVerdict, template)).toThrow("verdict");
  });

  it("rejects incomplete data", () => {
    expect(() => renderHtml({ project: {} }, template)).toThrow("Missing dashboard field");
  });

  it("carries no verdict in the template", () => {
    expect(template).not.toMatch(/A\.verdict/);
  });
});
