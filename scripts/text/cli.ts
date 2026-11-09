import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Genre, Hash, Manifest } from "../../shared/types";
import { GENRES } from "../../shared/types";
import { renderHtml } from "../dashboard/render";
import template from "../dashboard/template.html";
import { bookHash, hash, paragraphs } from "./canonical";
import { readFile, TextError } from "./formats";
import { measure } from "./measure";
import { findQuote } from "./quote";
import { split } from "./split";

const WORK_DIR = ".masthead";
const print = (value: unknown) => console.log(JSON.stringify(value));
const unitPath = (no: number) => join(WORK_DIR, "units", `${no}.txt`);
const readManifest = () =>
  JSON.parse(readFileSync(join(WORK_DIR, "manifest.json"), "utf-8")) as Manifest;

type NoteInput = { unit: number; quote: string };

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
  print({ ...manifest, confidence });
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
  if (command === "render" && args[0]) {
    const i = args.indexOf("--output");
    const target = i >= 0 && args[i + 1] ? args[i + 1] : "masthead-dashboard.html";
    writeFileSync(String(target), renderHtml(JSON.parse(readFileSync(args[0], "utf-8")), template));
    return print({ html: target });
  }
  throw new Error(
    "Usage: prepare <file> --genre <genre> | unit <no> | measure | verify <file> | render <data.json> --output <file>",
  );
}

main(process.argv.slice(2)).catch((e: unknown) => {
  const code = e instanceof TextError ? e.code : "UNKNOWN";
  console.error(
    JSON.stringify({ error: code, message: e instanceof Error ? e.message : String(e) }),
  );
  process.exitCode = 1;
});
