import { words } from "./canonical";

// Common words per language. This is language data used to recognise a manuscript.
const COMMON: Record<string, string[]> = {
  en: "the and of to in that was with for his her had not but".split(" "),
  tr: "bir ve bu için ile gibi ama çok daha olarak değil sonra kadar".split(" "),
  de: "der die und das nicht ist ein eine mit auf für sich dem".split(" "),
  fr: "le la les et des une dans que pour pas sur est avec".split(" "),
  es: "el la los las y una que por para con pero del se".split(" "),
};
const MIN_SHARE = 0.04;

/** Returns a language tag, or "und" when the text does not clearly match one. */
export function detectLanguage(text: string): string {
  const all = words(text).map((w) => w.toLowerCase());
  if (all.length === 0) return "und";
  const scored = Object.entries(COMMON).map(([tag, list]) => {
    const set = new Set(list);
    return { tag, share: all.filter((w) => set.has(w)).length / all.length };
  });
  const best = scored.sort((a, b) => b.share - a.share)[0];
  return best && best.share >= MIN_SHARE ? best.tag : "und";
}
