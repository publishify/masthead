import type { Hash } from "../../shared/types";

/** Normalizes line endings to `\n` and Unicode to NFC. Nothing else is cleaned. */
export const canonical = (text: string): string => text.replace(/\r\n?/g, "\n").normalize("NFC");

export async function hash(text: string): Promise<Hash> {
  const data = new TextEncoder().encode(canonical(text));
  const digest = await crypto.subtle.digest("SHA-256", data);
  const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  return `sha256:${hex}`;
}

/** Paragraphs separated by blank lines, with surrounding whitespace removed. */
export const paragraphs = (text: string): string[] =>
  canonical(text)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

export const bookHash = (unitHashes: readonly Hash[]): Promise<Hash> => hash(unitHashes.join("\n"));

/** Number of Unicode code points. */
export const codePoints = (text: string): number => Array.from(text).length;

export const words = (text: string): string[] =>
  text.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) ?? [];
