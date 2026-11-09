/** Interface text for the dashboard. English is the source; other languages come from a saved file. */
export type Strings = Record<string, string>;
export type Interface = { lang: string; strings: Strings };

const BRAND = "Publishify Masthead";
const PAGE_START = "<body>";
const PAGE_END = '<script id="dashboard-data"';

/** Every English string the template shows, read from the template itself. */
export function templateStrings(template: string): string[] {
  const page = template.slice(template.indexOf(PAGE_START), template.indexOf(PAGE_END));
  const texts = [...page.matchAll(/>([^<>]+)</g)].map((m) => String(m[1]).trim());
  const labels = [...page.matchAll(/aria-label="([^"]+)"/g)].map((m) => String(m[1]));
  const script = template.slice(template.indexOf(PAGE_END));
  const calls = [...script.matchAll(/\bt\("((?:[^"\\]|\\.)*)"/g)].map(
    (m) => JSON.parse(`"${m[1]}"`) as string,
  );
  return [...texts, ...labels, ...calls].filter((s) => /\p{L}/u.test(s) && s !== BRAND);
}

const values = (node: unknown): string[] => {
  if (typeof node === "string") return [node];
  if (typeof node === "object" && node !== null) return Object.values(node).flatMap(values);
  return [];
};

/** Fixed English text that arrives with the report data. Notes written by the board are excluded. */
export function dataStrings(data: unknown): string[] {
  const d = data as {
    labels?: unknown;
    method?: unknown;
    analysis?: {
      maps?: Record<string, { name: string; function: string }[]>;
      stages_localized?: boolean;
      modules?: { findings?: { label: string }[] }[];
      decisions?: { label: string }[];
    };
  };
  const a = d.analysis ?? {};
  return [
    ...values(d.labels),
    ...values(d.method),
    ...(a.stages_localized
      ? []
      : Object.values(a.maps ?? {}).flatMap((stages) =>
          stages.flatMap((s) => [s.name, s.function]),
        )),
    ...(a.modules ?? []).flatMap((m) => (m.findings ?? []).map((f) => f.label)),
    ...(a.decisions ?? []).map((x) => x.label),
  ];
}

export const catalog = (template: string, data: unknown): string[] =>
  [...new Set([...templateStrings(template), ...dataStrings(data)])].sort();

const slots = (s: string) =>
  [...s.matchAll(/\{(\w+)\}/g)]
    .map((m) => m[1])
    .sort()
    .join();

/** Keeps only translations that are text and carry the same {slots} as the English. */
export function cleanStrings(raw: unknown): { strings: Strings; rejected: string[] } {
  const strings: Strings = {};
  const rejected: string[] = [];
  for (const [key, value] of Object.entries((raw ?? {}) as Record<string, unknown>)) {
    if (typeof value === "string" && value.trim() && slots(key) === slots(value)) {
      strings[key] = value;
    } else {
      rejected.push(key);
    }
  }
  return { strings, rejected };
}

/** Returns the standard form of a language tag and throws on a malformed one. */
export const normalizeLang = (lang: string): string => Intl.getCanonicalLocales(lang)[0] ?? "en";
