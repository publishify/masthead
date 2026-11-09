import { readFileSync } from "node:fs";
import { extname, posix } from "node:path";
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

const normalize = (path: string) => posix.normalize(path);
const attr = (tag: string, name: string) =>
  new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, "i").exec(tag)?.[1];

/** Reads an EPUB in spine order. Each spine file starts a new section. */
export function readEpub(data: Uint8Array): RawText {
  const files = unzipSync(data);
  const read = (name: string) => (files[name] ? strFromU8(files[name]) : undefined);
  const encryption = read("META-INF/encryption.xml");
  if (encryption && !/obfuscation|font/i.test(encryption)) {
    throw new TextError("FORMAT_UNSUPPORTED", "This EPUB is protected and cannot be read.");
  }
  const root = attr(read("META-INF/container.xml") ?? "", "full-path");
  const opf = root ? read(root) : undefined;
  if (!root || !opf) throw new TextError("FORMAT_UNSUPPORTED", "The EPUB could not be read.");
  const base = root.includes("/") ? root.slice(0, root.lastIndexOf("/") + 1) : "";
  const items = new Map<string, string>();
  for (const [tag] of opf.matchAll(/<item\s[^>]*>/gi)) {
    const id = attr(tag, "id");
    const href = attr(tag, "href");
    if (id && href && !/\bnav\b/i.test(attr(tag, "properties") ?? "")) items.set(id, href);
  }
  const ps: string[] = [];
  const headings: number[] = [];
  for (const [tag] of opf.matchAll(/<itemref\s[^>]*>/gi)) {
    if (attr(tag, "linear") === "no") continue;
    const href = items.get(attr(tag, "idref") ?? "");
    const page = href ? read(normalize(base + decodeURIComponent(href))) : undefined;
    if (!page) continue;
    const body = page.replace(/<(head|script|style)\b[\s\S]*?<\/\1>/gi, "");
    const first = ps.length;
    let hasHeading = false;
    for (const m of body.matchAll(/<(h[1-6]|p|li|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
      const text = decode(
        String(m[2])
          .replace(/<br\s*\/?>/gi, "\n")
          .replace(/<[^>]+>/g, ""),
      ).trim();
      if (!text) continue;
      if (/^h[1-6]$/i.test(String(m[1]))) {
        headings.push(ps.length);
        hasHeading = true;
      }
      ps.push(text);
    }
    if (!hasHeading && ps.length > first) headings.push(first);
  }
  if (ps.length === 0) throw new TextError("FORMAT_UNSUPPORTED", "The EPUB has no readable text.");
  return { text: ps.join("\n\n"), headings, extractor: "epub@1" };
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
  if (extension === ".epub") return readEpub(readFileSync(path));
  throw new TextError("FORMAT_UNSUPPORTED", `This file format is not supported yet: ${extension}`);
}
