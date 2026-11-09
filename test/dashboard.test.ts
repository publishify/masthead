import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderHtml } from "../scripts/dashboard/render";
import { catalog, cleanStrings, normalizeLang } from "../scripts/dashboard/strings";

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

  it("lists the interface text from the template and the data", () => {
    const list = catalog(template, sample);
    expect(list).toContain("Print");
    expect(list).toContain("{name}: not run");
    expect(list).toContain("Key decisions");
    expect(list).toContain("Preference");
    expect(list).toContain("Ordinary World");
    expect(list).not.toContain("Publishify Masthead");
    expect(list).not.toContain("The hero hesitates after the call.");
  });

  it("embeds a saved translation and the language", () => {
    const html = renderHtml(sample, template, { lang: "DE", strings: { Print: "Drucken" } });
    expect(html).toContain('"lang":"de"');
    expect(html).toContain("Drucken");
  });

  it("drops a translation that loses a slot", () => {
    const result = cleanStrings({ "{name}: not run": "not run", Print: "Drucken", Count: "" });
    expect(result.strings).toEqual({ Print: "Drucken" });
    expect(result.rejected).toEqual(["{name}: not run", "Count"]);
  });

  it("rejects a malformed language tag", () => {
    expect(() => normalizeLang("not a language")).toThrow();
  });
});
