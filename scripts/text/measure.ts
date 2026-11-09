import { paragraphs, words } from "./canonical";

export type Measurement = {
  words: number;
  sentences: number;
  long_sentences: number;
  paragraphs: number;
  dialogue_ratio: number;
  frequent_words: { word: string; count: number }[];
  repetition_candidates: { phrase: string; count: number }[];
};

// Turkish function words, left out of the content word list.
const FUNCTION_WORDS = new Set(
  "bir ve ile de da ki bu şu o için gibi ama daha çok en ne mi mı mu mü ya hem ise değil var yok".split(
    " ",
  ),
);
const lower = (s: string) => s.toLocaleLowerCase("tr");
const DIALOGUE = /^["“«‘'—–-]|["“«].+?["”»]/u;

const tally = (items: Iterable<string>) => {
  const counts = new Map<string, number>();
  for (const k of items) counts.set(k, (counts.get(k) ?? 0) + 1);
  return counts;
};

/** Measured entirely by code. Repetition candidates are counts, not errors. */
export function measure(text: string): Measurement {
  const ps = paragraphs(text);
  const sentences = text.split(/[.!?…]+(?=\s|$)/u).filter((s) => words(s).length > 0);
  const all = words(text).map(lower);
  const content = all.filter((w) => w.length > 2 && !FUNCTION_WORDS.has(w));
  const frequent = [...tally(content)]
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([word, count]) => ({ word, count }));

  const grams: string[] = [];
  for (const p of ps) {
    const w = words(p).map(lower);
    for (let n = 3; n <= 6; n++) {
      for (let i = 0; i + n <= w.length; i++) grams.push(w.slice(i, i + n).join(" "));
    }
  }
  const candidates = [...tally(grams)].filter(
    ([phrase, count]) => count >= (phrase.split(" ").length === 3 ? 3 : 2),
  );
  const repetition = candidates
    .filter(([phrase]) => !candidates.some(([other]) => other !== phrase && other.includes(phrase)))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([phrase, count]) => ({ phrase, count }));

  return {
    words: all.length,
    sentences: sentences.length,
    long_sentences: sentences.filter((s) => words(s).length > 35).length,
    paragraphs: ps.length,
    dialogue_ratio: ps.length ? ps.filter((p) => DIALOGUE.test(p)).length / ps.length : 0,
    frequent_words: frequent,
    repetition_candidates: repetition,
  };
}
