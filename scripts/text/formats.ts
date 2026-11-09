import { readFileSync } from "node:fs";
import { extname } from "node:path";
import { strFromU8, unzipSync } from "fflate";
import type { ErrorCode } from "../../shared/types";
import type { RawText } from "./split";

export class TextError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
  }
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const decode = (s: string) =>
  s.replace(/&(#x?[0-9a-f]+|\w+);/gi, (whole, v: string) => {
    if (v.startsWith("#")) {
      const isHex = v[1]?.toLowerCase() === "x";
      return String.fromCodePoint(Number.parseInt(v.slice(isHex ? 2 : 1), isHex ? 16 : 10));
    }
    return ENTITIES[v] ?? whole;
  });

const HEADING_STYLE = /^(?:heading|ba[sş]l[iı]k|title)/iu;

/** Reads the paragraphs of a Word file and keeps heading styles as markers. */
export function readDocx(data: Uint8Array): RawText {
  const file = unzipSync(data)["word/document.xml"];
  if (!file) throw new TextError("FORMAT_UNSUPPORTED", "The Word document could not be read.");
  const xml = strFromU8(file);
  const ps: string[] = [];
  const headings: number[] = [];
  for (const [p] of xml.matchAll(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g)) {
    let text = "";
    for (const m of p.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:tab\/>|<w:br\/>/g)) {
      if (m[1] !== undefined) text += decode(m[1]);
      else text += m[0] === "<w:tab/>" ? "\t" : "\n";
    }
    text = text.trim();
    if (!text) continue;
    const style = p.match(/<w:pStyle\s+w:val="([^"]+)"/)?.[1];
    if (style && HEADING_STYLE.test(style)) headings.push(ps.length);
    ps.push(text);
  }
  return { text: ps.join("\n\n"), headings, extractor: "docx@1" };
}

export function readPlainText(content: string, stripYaml: boolean): RawText {
  let text = content.replace(/^﻿/, "");
  if (stripYaml) text = text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
  return { text, extractor: "text@1" };
}

export function readFile(path: string): RawText {
  const extension = extname(path).toLowerCase();
  if (extension === ".md") return readPlainText(readFileSync(path, "utf-8"), true);
  if (extension === ".txt") return readPlainText(readFileSync(path, "utf-8"), false);
  if (extension === ".docx") return readDocx(readFileSync(path));
  throw new TextError("FORMAT_UNSUPPORTED", `This file format is not supported yet: ${extension}`);
}
