import type { Genre } from "../../shared/types";
import { codePoints, paragraphs, words } from "./canonical";

export type RawText = {
  text: string;
  /** Paragraph indexes of headings coming from the file format (e.g. Word heading styles). */
  headings?: readonly number[];
  extractor: string;
};

export type UnitDraft = {
  no: number;
  level: string;
  title?: string;
  text: string;
  chars: number;
  words: number;
};

export const MAX_UNIT_CHARS = 40_000;

const LEVEL: Partial<Record<Genre, string>> = {
  novel: "chapter",
  novella: "chapter",
  poetry: "poem",
  "academic-essay": "chapter",
  "academic-article": "chapter",
  "academic-book": "chapter",
  memoir: "chapter",
  biography: "chapter",
  "non-fiction": "chapter",
  "children-ya": "chapter",
  play: "scene",
  screenplay: "scene",
};
const CHAPTERS_EXPECTED: readonly Genre[] = [
  "novel",
  "novella",
  "academic-book",
  "memoir",
  "biography",
];

// Patterns recognize headings written in the book's own language.
const HEADING_PATTERNS = [
  /^#{1,3}\s+\S/u,
  /^(?:\d+\.?\s+)?bölüm\b/iu,
  /^[\p{Lu}]+(?:\s[\p{Lu}]+)?\s+BÖLÜM\b/u,
  /^(?:kısım|perde|sahne)\s+\S/iu,
  /^(?:chapter|part|act|scene)\s+\S/iu,
];
const isHeading = (p: string) => p.length <= 80 && HEADING_PATTERNS.some((r) => r.test(p));

function buildUnit(no: number, level: string, ps: string[], title?: string): UnitDraft {
  const text = ps.join("\n\n");
  return {
    no,
    level,
    ...(title ? { title } : {}),
    text,
    chars: codePoints(text),
    words: words(text).length,
  };
}

/** Splits a unit that exceeds the limit at paragraph boundaries. */
function chunk(ps: string[]): string[][] {
  const chunks: string[][] = [];
  let current: string[] = [];
  let size = 0;
  for (const p of ps) {
    const length = codePoints(p);
    if (current.length > 0 && size + length > MAX_UNIT_CHARS) {
      chunks.push(current);
      current = [];
      size = 0;
    }
    current.push(p);
    size += length + 2;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

export function split(
  raw: RawText,
  genre: Genre,
): {
  units: UnitDraft[];
  confidence: "high" | "low";
} {
  const ps = paragraphs(raw.text);
  const fromFormat = new Set(raw.headings ?? []);
  const level = LEVEL[genre] ?? "text";
  const groups: { title?: string; ps: string[] }[] = [];
  let found = false;

  ps.forEach((p, i) => {
    if (fromFormat.has(i) || isHeading(p)) {
      found = true;
      groups.push({ title: p.replace(/^#{1,3}\s+/u, ""), ps: [] });
      return;
    }
    const last = groups[groups.length - 1];
    if (last) last.ps.push(p);
    else groups.push({ ps: [p] });
  });

  const units: UnitDraft[] = [];
  for (const g of groups) {
    if (g.ps.length === 0) continue;
    const chunks = genre === "poetry" ? [g.ps] : chunk(g.ps);
    chunks.forEach((c, i) => {
      const title = g.title && chunks.length > 1 ? `${g.title} (${i + 1})` : g.title;
      units.push(buildUnit(units.length + 1, level, c, title));
    });
  }
  return { units, confidence: found || !CHAPTERS_EXPECTED.includes(genre) ? "high" : "low" };
}
