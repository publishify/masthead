/** Places the dashboard data returned by the server into the template. Uses no model. */
import { cleanStrings, type Interface, normalizeLang } from "./strings";

export type DashboardData = {
  project: { title?: string; demo?: boolean };
  summary: Record<string, unknown>;
  lexical: Record<string, unknown>;
  method: Record<string, unknown>;
  chapters: unknown[];
  analysis: Record<string, unknown>;
  labels: Record<string, unknown>;
  colors: Record<string, string>;
  metrics_sha256: string;
};

const REQUIRED = [
  "project",
  "summary",
  "lexical",
  "method",
  "chapters",
  "analysis",
  "labels",
  "colors",
] as const;
const VERDICT_FIELDS = ["verdict", "ready_to_publish"];
const PLACEHOLDER = "__MASTHEAD_DATA__";

export function validate(data: unknown): asserts data is DashboardData {
  if (typeof data !== "object" || data === null) throw new Error("Invalid dashboard data.");
  const record = data as Record<string, unknown>;
  for (const field of REQUIRED) {
    if (record[field] === undefined) throw new Error(`Missing dashboard field: ${field}`);
  }
  const analysis = record.analysis as Record<string, unknown>;
  for (const field of VERDICT_FIELDS) {
    if (field in analysis) throw new Error(`A report cannot carry a verdict field: ${field}`);
  }
}

/** Embeds the data so that it can never run as markup inside the page. */
const embed = (data: unknown) =>
  JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replaceAll(String.fromCharCode(0x2028), "\\u2028")
    .replaceAll(String.fromCharCode(0x2029), "\\u2029");

export function renderHtml(data: unknown, template: string, ui?: Interface): string {
  validate(data);
  if (!template.includes(PLACEHOLDER)) throw new Error("Data placeholder not found in template.");
  const lang = ui ? normalizeLang(ui.lang) : "en";
  const payload = ui ? { ...data, ui: { lang, strings: cleanStrings(ui.strings).strings } } : data;
  return template.split(PLACEHOLDER).join(embed(payload));
}
