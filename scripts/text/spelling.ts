// Frequent misspellings, found without a model. This is language data.
const COMMON_ERRORS: Record<string, Record<string, string>> = {
  tr: {
    herkez: "herkes",
    yanlız: "yalnız",
    yalnış: "yanlış",
    birşey: "bir şey",
    herşey: "her şey",
    hiçbirşey: "hiçbir şey",
    hergün: "her gün",
    birgün: "bir gün",
    birsürü: "bir sürü",
    şuan: "şu an",
    orjinal: "orijinal",
    tabiki: "tabii ki",
    yada: "ya da",
    makina: "makine",
    süpriz: "sürpriz",
    kiprik: "kirpik",
    traş: "tıraş",
    egzos: "egzoz",
  },
};

export type SpellingNote = {
  type: "language.spelling";
  check: "objective";
  result: "fail";
  severity: "low";
  certainty: "definite";
  paragraph: number;
  quote: string;
  wrong: string;
  right: string;
  verification: { method: "script"; verified_by: "spelling-list" };
};

export function findSpellingErrors(paragraphs: string[], language: string): SpellingNote[] {
  const errors = COMMON_ERRORS[language];
  if (!errors) return [];
  return paragraphs.flatMap((text, index) =>
    (text.match(/\p{L}+/gu) ?? []).flatMap((word) => {
      const right = errors[word.toLocaleLowerCase(language)];
      if (!right) return [];
      return [
        {
          type: "language.spelling" as const,
          check: "objective" as const,
          result: "fail" as const,
          severity: "low" as const,
          certainty: "definite" as const,
          paragraph: index + 1,
          quote: word,
          wrong: word,
          right,
          verification: { method: "script" as const, verified_by: "spelling-list" as const },
        },
      ];
    }),
  );
}
