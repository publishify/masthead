// Passages likely to hold checkable facts. These word lists are language data.
const FACTS = new RegExp(
  [
    "\\d",
    "yaşında|yıl|hafta|saat|ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim|kasım|aralık",
    "pazartesi|salı|çarşamba|perşembe|cuma|cumartesi|pazar|sabah|akşam|gece|kış|yaz|bahar|sonbahar",
    "anne|baba|abla|ağabey|kardeş|eş|oğul|kız|öl|gömdü|mezar",
    "years?|weeks?|hours?|monday|tuesday|wednesday|thursday|friday|saturday|sunday",
    "january|february|march|april|may|june|july|august|september|october|november|december",
    "morning|evening|night|winter|summer|spring|autumn|mother|father|sister|brother|wife|husband|son|daughter|dead|died|grave",
  ].join("|"),
  "iu",
);

export const holdsFacts = (paragraph: string) => FACTS.test(paragraph);
