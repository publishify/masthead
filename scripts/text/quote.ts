import { canonical } from "./canonical";

export type Range = [start: number, end: number];
export type QuoteResult =
  | { status: "found"; range: Range; original: string }
  | { status: "ambiguous"; count: number }
  | { status: "missing" };

const TYPOGRAPHY: Record<string, string> = {
  "“": '"',
  "”": '"',
  "„": '"',
  "‟": '"',
  "«": '"',
  "»": '"',
  "‘": "'",
  "’": "'",
  "‚": "'",
  "‛": "'",
  "—": "-",
  "–": "-",
  "‑": "-",
};

type Relaxed = { chars: string[]; source: number[] };

/** Relaxes typography only; letters and letter case stay exactly as written. */
function relax(chars: readonly string[]): Relaxed {
  const output: string[] = [];
  const source: number[] = [];
  chars.forEach((c, i) => {
    if (/\s/u.test(c)) {
      if (output[output.length - 1] !== " ") {
        output.push(" ");
        source.push(i);
      }
    } else if (c === "…") {
      for (let k = 0; k < 3; k++) {
        output.push(".");
        source.push(i);
      }
    } else {
      output.push(TYPOGRAPHY[c] ?? c);
      source.push(i);
    }
  });
  return { chars: output, source };
}

function positions(haystack: readonly string[], needle: readonly string[]): number[] {
  const found: number[] = [];
  for (let i = 0; i + needle.length <= haystack.length; i++) {
    if (needle.every((c, k) => haystack[i + k] === c)) found.push(i);
  }
  return found;
}

function resolve(
  candidates: Range[],
  chars: readonly string[],
  hint: Range | undefined,
): QuoteResult {
  const chosen =
    candidates.length > 1 && hint
      ? candidates.filter(([s, e]) => s >= hint[0] && e <= hint[1])
      : candidates;
  const only = chosen[0];
  if (chosen.length === 1 && only) {
    return { status: "found", range: only, original: chars.slice(only[0], only[1]).join("") };
  }
  return { status: "ambiguous", count: chosen.length || candidates.length };
}

/** Finds a quote in a unit. The range is expressed in Unicode code points. */
export function findQuote(unit: string, quote: string, hint?: Range): QuoteResult {
  const chars = Array.from(canonical(unit));
  const target = Array.from(canonical(quote).trim());
  if (target.length === 0) return { status: "missing" };

  const exact = positions(chars, target);
  if (exact.length > 0) {
    return resolve(
      exact.map((s): Range => [s, s + target.length]),
      chars,
      hint,
    );
  }

  const text = relax(chars);
  const needle = relax(target).chars;
  const relaxed = positions(text.chars, needle);
  if (relaxed.length === 0) return { status: "missing" };
  const candidates = relaxed.map((s): Range => {
    const start = text.source[s] ?? 0;
    const last = text.source[s + needle.length - 1] ?? start;
    return [start, last + 1];
  });
  return resolve(candidates, chars, hint);
}
