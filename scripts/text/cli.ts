import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Genre, Hash, Manifest } from "../../shared/types";
import { GENRES } from "../../shared/types";
import { renderHtml } from "../dashboard/render";
import { catalog, cleanStrings, normalizeLang, type Strings } from "../dashboard/strings";
import template from "../dashboard/template.html";
import { type ReviewDeps, runReview } from "../run/review";
import { askModel, callTool, openInBrowser } from "../run/server";
import { bookHash, hash, paragraphs } from "./canonical";
import { readFile, TextError } from "./formats";
import { detectLanguage } from "./language";
import { measure } from "./measure";
import { findQuote } from "./quote";
import { findSpellingErrors } from "./spelling";
import { split } from "./split";

const WORK_DIR = ".masthead";
const print = (value: unknown) => console.log(JSON.stringify(value));
const unitPath = (no: number) => join(WORK_DIR, "units", `${no}.txt`);
const readManifest = () =>
  JSON.parse(readFileSync(join(WORK_DIR, "manifest.json"), "utf-8")) as Manifest;

type NoteInput = { unit: number; quote: string };

const option = (args: string[], name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
/** An explicit option wins; then the plugin's language setting; then English. */
const languageOf = (args: string[]) =>
  normalizeLang(option(args, "--lang") || process.env.CLAUDE_PLUGIN_OPTION_LANGUAGE || "en");
const stringsDir = () => process.env.CLAUDE_PLUGIN_DATA || WORK_DIR;
const stringsPath = (lang: string) => join(stringsDir(), `strings.${lang}.json`);
const savedStrings = (lang: string): Strings =>
  existsSync(stringsPath(lang)) ? JSON.parse(readFileSync(stringsPath(lang), "utf-8")) : {};

const workFile = (name: string) => join(WORK_DIR, name);
const readJson = <T>(name: string): T | undefined =>
  existsSync(workFile(name)) ? (JSON.parse(readFileSync(workFile(name), "utf-8")) as T) : undefined;

/**
 * A folder can hold several manuscripts. Work files belong to one of them, so they are
 * cleared on a switch; each manuscript keeps its own book id and returns to it later.
 */
function openBook(file: string): string | undefined {
  mkdirSync(WORK_DIR, { recursive: true });
  const current = resolve(file);
  const previous = readJson<{ file: string }>("source.json")?.file;
  const books = readJson<Record<string, string>>("books.json") ?? {};
  const bookId = readJson<{ book_id: string }>("book.json")?.book_id;
  if (previous && bookId) books[previous] = bookId;
  if (previous !== current) {
    for (const name of [
      "units",
      "summaries",
      "out",
      "book.json",
      "dashboard.json",
      "strings.json",
    ]) {
      rmSync(workFile(name), { recursive: true, force: true });
    }
    const known = books[current];
    if (known) writeFileSync(workFile("book.json"), JSON.stringify({ book_id: known }));
  }
  writeFileSync(workFile("source.json"), JSON.stringify({ file: current }));
  writeFileSync(workFile("books.json"), JSON.stringify(books));
  return books[current];
}

async function prepare(file: string, genre: Genre) {
  const raw = readFile(file);
  const { units, confidence } = split(raw, genre);
  const bookId = openBook(file);
  mkdirSync(join(WORK_DIR, "units"), { recursive: true });
  const hashes: Hash[] = [];
  const list: Manifest["units"] = [];
  for (const u of units) {
    const unitHash = await hash(u.text);
    hashes.push(unitHash);
    writeFileSync(unitPath(u.no), u.text);
    list.push({
      no: u.no,
      level: u.level,
      ...(u.title ? { title: u.title } : {}),
      hash: unitHash,
      chars: u.chars,
      words: u.words,
    });
  }
  const manifest: Manifest = {
    source: "core",
    extractor: raw.extractor,
    book_hash: await bookHash(hashes),
    units: list,
  };
  writeFileSync(join(WORK_DIR, "manifest.json"), JSON.stringify(manifest));
  return {
    manifest,
    confidence,
    language: detectLanguage(raw.text),
    ...(bookId ? { book_id: bookId } : {}),
  };
}

async function verify(file: string) {
  const notes = JSON.parse(readFileSync(file, "utf-8")) as NoteInput[];
  const result = [];
  for (const n of notes) {
    const text = readFileSync(unitPath(n.unit), "utf-8");
    result.push({ ...n, match: findQuote(text, n.quote), unit_hash: await hash(text) });
  }
  print(result);
}

type Place = { unit?: number; quote?: string };
type RoleNote = Place & { evidence?: Place[]; [key: string]: unknown };

/** A note is proven only when every quote it relies on is found in the book. */
async function checkNotes(
  output: { notes?: RoleNote[]; stages?: unknown[] },
  defaultUnit?: number,
) {
  const units = readManifest().units.map((u) => u.no);
  const textOf = (unit: number) => readFileSync(unitPath(unit), "utf-8");
  const matches = (unit: number, quote: string) => {
    if (!existsSync(unitPath(unit))) return false;
    const { status } = findQuote(textOf(unit), quote);
    return status === "found" || status === "ambiguous";
  };
  /** Book-level roles may not name a section, so every section is searched. */
  const locate = (place: Place) => {
    const known = place.unit ?? defaultUnit;
    if (known || !place.quote) return known;
    return units.find((unit) => matches(unit, place.quote as string));
  };
  const found = (place: Place, unit?: number) =>
    Boolean(unit && place.quote && matches(unit, place.quote));

  const notes = await Promise.all(
    (output.notes ?? []).map(async (note) => {
      const unit = locate(note);
      const located = unit ? { unit } : {};
      if (!note.quote) return { ...note, ...located };
      const evidence = (note.evidence ?? []).map((place) => {
        const at = locate(place);
        return { place: { ...place, ...(at ? { unit: at } : {}) }, proven: found(place, at) };
      });
      const proven = found(note, unit) && evidence.every((e) => e.proven);
      return {
        ...note,
        ...located,
        ...(note.evidence ? { evidence: evidence.map((e) => e.place) } : {}),
        ...(unit && existsSync(unitPath(unit)) ? { unit_hash: await hash(textOf(unit)) } : {}),
        verification: proven ? { method: "script", verified_by: "text-tool" } : { method: "model" },
      };
    }),
  );
  return { notes, stages: output.stages ?? [] };
}

const FULL_TEXT_WORD_LIMIT = 40_000;
const numbered = (unit: number) =>
  paragraphs(readFileSync(unitPath(unit), "utf-8"))
    .map((text, i) => `[${i + 1}] ${text}`)
    .join("\n\n");
const summaryPath = (unit: number) => join(WORK_DIR, "summaries", `${unit}.json`);

function bookContext(role: string) {
  const { units } = readManifest();
  const summarized = units.filter((u) => existsSync(summaryPath(u.no)));
  const summaries = summarized
    .map((u) => `## Section ${u.no}\n${readFileSync(summaryPath(u.no), "utf-8")}`)
    .join("\n\n");
  const section = (no: number) => `## Section ${no}\n${numbered(no)}`;
  if (role === "reader-panel") {
    const opening = summarized[0];
    return `# Summaries\n${summaries}\n\n# Opening\n${opening ? section(opening.no) : ""}`;
  }
  const total = units.reduce((sum, u) => sum + u.words, 0);
  return total <= FULL_TEXT_WORD_LIMIT
    ? units.map((u) => section(u.no)).join("\n\n")
    : `# Summaries of a long book\n${summaries}`;
}

async function finishReport(dashboard: unknown, lang: string) {
  const language = normalizeLang(lang);
  writeFileSync(join(WORK_DIR, "dashboard.json"), JSON.stringify(dashboard));
  let costUsd = 0;
  const known = savedStrings(language);
  const missing = language === "en" ? [] : catalog(template, dashboard).filter((s) => !known[s]);
  if (missing.length > 0) {
    const answer = await askModel(
      `Translate each string into the language with tag "${language}", naturally, for a book report page. Keep every {slot} unchanged. Return only a JSON object from English to translation.\n\n${JSON.stringify(missing)}`,
      "haiku",
    );
    costUsd = answer.costUsd;
    const start = answer.text.indexOf("{");
    const translated = cleanStrings(
      JSON.parse(answer.text.slice(start, answer.text.lastIndexOf("}") + 1)),
    );
    mkdirSync(stringsDir(), { recursive: true });
    writeFileSync(stringsPath(language), JSON.stringify({ ...known, ...translated.strings }));
  }
  const html = "masthead-dashboard.html";
  writeFileSync(
    html,
    renderHtml(dashboard, template, { lang: language, strings: savedStrings(language) }),
  );
  openInBrowser(html);
  return { html, costUsd };
}

function reviewDeps(): ReviewDeps {
  return {
    callTool,
    ask: (prompt) => askModel(prompt),
    prepare,
    measureAll: () =>
      readManifest().units.map((u) => ({
        no: u.no,
        ...measure(readFileSync(unitPath(u.no), "utf-8")),
      })),
    sectionText: numbered,
    bookContext,
    saveSummary(unit, summary) {
      mkdirSync(join(WORK_DIR, "summaries"), { recursive: true });
      writeFileSync(summaryPath(unit), JSON.stringify(summary));
    },
    checkNotes,
    spellingNotes: (unit, language) =>
      findSpellingErrors(paragraphs(readFileSync(unitPath(unit), "utf-8")), language),
    saveBookId: (id) => writeFileSync(join(WORK_DIR, "book.json"), JSON.stringify({ book_id: id })),
    finish: finishReport,
    log: (message) => console.error(message),
  };
}

async function main([command, ...args]: string[]) {
  if (command === "prepare" && args[0]) {
    const i = args.indexOf("--genre");
    const genre = (i >= 0 ? args[i + 1] : "other") as Genre;
    if (!GENRES.includes(genre)) throw new TextError("MODULE_MISSING", `Unknown genre: ${genre}`);
    return print(await prepare(args[0], genre));
  }
  if (command === "unit" && args[0]) {
    return print(
      paragraphs(readFileSync(unitPath(Number(args[0])), "utf-8")).map((text, i) => ({
        no: i + 1,
        text,
      })),
    );
  }
  if (command === "measure") {
    return print(
      readManifest().units.map((u) => ({
        no: u.no,
        ...measure(readFileSync(unitPath(u.no), "utf-8")),
      })),
    );
  }
  if (command === "verify" && args[0]) return verify(args[0]);
  if (command === "check" && args[0]) {
    const unit = option(args, "--unit");
    return print(
      await checkNotes(JSON.parse(readFileSync(args[0], "utf-8")), unit ? Number(unit) : undefined),
    );
  }
  if (command === "render" && args[0]) {
    const target = option(args, "--output") || "masthead-dashboard.html";
    const lang = languageOf(args);
    const data: unknown = JSON.parse(readFileSync(args[0], "utf-8"));
    const strings = savedStrings(lang);
    writeFileSync(target, renderHtml(data, template, { lang, strings }));
    const untranslated =
      lang === "en" ? 0 : catalog(template, data).filter((s) => !strings[s]).length;
    return print({ html: target, lang, untranslated });
  }
  if (command === "strings" && args[0]) {
    const lang = languageOf(args);
    const strings = savedStrings(lang);
    const all = catalog(template, JSON.parse(readFileSync(args[0], "utf-8")));
    return print({ lang, missing: lang === "en" ? [] : all.filter((s) => !strings[s]) });
  }
  if (command === "save-strings" && args[0]) {
    const lang = languageOf(args);
    const { strings, rejected } = cleanStrings(JSON.parse(readFileSync(args[0], "utf-8")));
    mkdirSync(stringsDir(), { recursive: true });
    const merged = { ...savedStrings(lang), ...strings };
    writeFileSync(stringsPath(lang), JSON.stringify(merged));
    return print({ lang, saved: Object.keys(strings).length, rejected });
  }
  if (command === "run" && args[0]) {
    const file = args[0];
    return print(
      await runReview(
        {
          file,
          genre: option(args, "--genre") || "other",
          title: option(args, "--title") || file.replace(/\.[^.]+$/, ""),
          ...(option(args, "--lang") ? { language: option(args, "--lang") as string } : {}),
        },
        reviewDeps(),
      ),
    );
  }
  if (command === "status") {
    const book = JSON.parse(readFileSync(join(WORK_DIR, "book.json"), "utf-8")) as {
      book_id: string;
    };
    const report = (await callTool("read_report", { book_id: book.book_id })) as {
      created?: string;
      dashboard?: { analysis?: { decisions?: { text: string }[] } };
      error?: string;
    };
    if (report.error) throw new Error(report.error);
    return print({
      created: report.created,
      decisions: (report.dashboard?.analysis?.decisions ?? []).map((d) => d.text),
    });
  }
  throw new Error(
    "Usage: run <file> --genre <genre> [--title <title>] [--lang <tag>] | status | prepare <file> --genre <genre> | unit <no> | measure | verify <file> | check <file> [--unit <no>] | render <data.json> --output <file> [--lang <tag>] | strings <data.json> [--lang <tag>] | save-strings <file> [--lang <tag>]",
  );
}

main(process.argv.slice(2)).catch((e: unknown) => {
  const code = e instanceof TextError ? e.code : "UNKNOWN";
  console.error(
    JSON.stringify({ error: code, message: e instanceof Error ? e.message : String(e) }),
  );
  process.exitCode = 1;
});
