import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Genre, Hash, Manifest } from "../../shared/types";
import { GENRES } from "../../shared/types";
import { renderHtml } from "../dashboard/render";
import { catalog, cleanStrings, normalizeLang, type Strings } from "../dashboard/strings";
import template from "../dashboard/template.html";
import { bookHash, hash, paragraphs } from "./canonical";
import { readFile, TextError } from "./formats";
import { detectLanguage } from "./language";
import { measure } from "./measure";
import { findQuote } from "./quote";
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

async function prepare(file: string, genre: Genre) {
  const raw = readFile(file);
  const { units, confidence } = split(raw, genre);
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
  print({ manifest, confidence, language: detectLanguage(raw.text) });
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
async function checkNotes(file: string, defaultUnit?: number) {
  const output = JSON.parse(readFileSync(file, "utf-8")) as {
    notes?: RoleNote[];
    stages?: Place[];
  };
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

async function main([command, ...args]: string[]) {
  if (command === "prepare" && args[0]) {
    const i = args.indexOf("--genre");
    const genre = (i >= 0 ? args[i + 1] : "other") as Genre;
    if (!GENRES.includes(genre)) throw new TextError("MODULE_MISSING", `Unknown genre: ${genre}`);
    return prepare(args[0], genre);
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
    return print(await checkNotes(args[0], unit ? Number(unit) : undefined));
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
  throw new Error(
    "Usage: prepare <file> --genre <genre> | unit <no> | measure | verify <file> | check <file> [--unit <no>] | render <data.json> --output <file> [--lang <tag>] | strings <data.json> [--lang <tag>] | save-strings <file> [--lang <tag>]",
  );
}

main(process.argv.slice(2)).catch((e: unknown) => {
  const code = e instanceof TextError ? e.code : "UNKNOWN";
  console.error(
    JSON.stringify({ error: code, message: e instanceof Error ? e.message : String(e) }),
  );
  process.exitCode = 1;
});
