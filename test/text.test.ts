import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { bookHash, canonical, hash, paragraphs } from "../scripts/text/canonical";
import { readDocx, readPlainText } from "../scripts/text/formats";
import { measure } from "../scripts/text/measure";
import { findQuote } from "../scripts/text/quote";
import { MAX_UNIT_CHARS, split } from "../scripts/text/split";

describe("canonical text and hashing", () => {
  it("normalizes line endings and Unicode form", () => {
    expect(canonical("a\r\nb\rc")).toBe("a\nb\nc");
    expect(canonical("ş")).toBe("ş");
  });

  it("produces the known SHA-256 value", async () => {
    expect(await hash("abc")).toBe(
      "sha256:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("is not affected by CRLF or composed letters", async () => {
    expect(await hash("ş\r\n")).toBe(await hash("ş\n"));
  });

  it("makes the book hash depend on unit order", async () => {
    const [a, b] = [await hash("a"), await hash("b")];
    expect(await bookHash([a, b])).not.toBe(await bookHash([b, a]));
  });

  it("splits paragraphs on blank lines and trims them", () => {
    expect(paragraphs("  one \n\n\n two\n \n three")).toEqual(["one", "two", "three"]);
  });
});

describe("quote matching", () => {
  const text = "Sam “came” home. Ali came too.";

  it("finds exact matches in code points", () => {
    expect(findQuote("😀 Ali", "Ali")).toEqual({
      status: "found",
      range: [2, 5],
      original: "Ali",
    });
  });

  it("relaxes typography only and returns the original text", () => {
    expect(findQuote(text, 'Sam "came" home')).toMatchObject({
      status: "found",
      original: "Sam “came” home",
    });
  });

  it("relaxes ellipses and extra spaces", () => {
    expect(findQuote("Later…  gone", "Later... gone").status).toBe("found");
  });

  it("does not relax letters or letter case", () => {
    expect(findQuote(text, "sam").status).toBe("missing");
    expect(findQuote(text, "Som").status).toBe("missing");
  });

  it("reports ambiguity and resolves it with a hint", () => {
    const repeated = "went and went";
    expect(findQuote(repeated, "went")).toEqual({ status: "ambiguous", count: 2 });
    expect(findQuote(repeated, "went", [5, 13])).toMatchObject({
      status: "found",
      range: [9, 13],
    });
  });

  it("rejects an empty quote", () => {
    expect(findQuote(text, "  ").status).toBe("missing");
  });
});

describe("splitting", () => {
  const raw = (text: string) => ({ text, extractor: "test" });

  it("recognizes Turkish chapter headings", () => {
    const { units, confidence } = split(
      raw("Künye\n\n1. Bölüm: İstanbul\n\nBir.\n\nBİRİNCİ BÖLÜM\n\nİki."),
      "novel",
    );
    expect(confidence).toBe("high");
    expect(units.map((u) => u.title)).toEqual([undefined, "1. Bölüm: İstanbul", "BİRİNCİ BÖLÜM"]);
    expect(units[1]?.text).toBe("Bir.");
  });

  it("recognizes English chapter headings", () => {
    expect(split(raw("Chapter 1\n\nOne."), "novel").units[0]?.title).toBe("Chapter 1");
  });

  it("lowers confidence for a novel without headings", () => {
    expect(split(raw("Only text."), "novel").confidence).toBe("low");
    expect(split(raw("Only text."), "short-story").confidence).toBe("high");
  });

  it("splits an oversized unit at a blank line", () => {
    const p = "a".repeat(MAX_UNIT_CHARS - 10);
    const { units } = split(raw(`# Long\n\n${p}\n\n${p}`), "novel");
    expect(units.map((u) => u.title)).toEqual(["Long (1)", "Long (2)"]);
  });

  it("never splits a poem", () => {
    const p = "a".repeat(MAX_UNIT_CHARS - 10);
    expect(split(raw(`${p}\n\n${p}`), "poetry").units).toHaveLength(1);
  });
});

describe("format readers", () => {
  it("removes the BOM and YAML front matter", () => {
    expect(readPlainText("﻿---\nname: x\n---\nText", true).text).toBe("Text");
    expect(readPlainText("---\nstays", false).text).toBe("---\nstays");
  });

  it("reads Word paragraphs and heading styles", () => {
    const xml = `<w:document><w:body>
      <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Intro</w:t></w:r></w:p>
      <w:p><w:r><w:t xml:space="preserve">Ali &amp; </w:t></w:r><w:r><w:t>Bob</w:t></w:r></w:p>
      <w:p></w:p>
    </w:body></w:document>`;
    const result = readDocx(zipSync({ "word/document.xml": strToU8(xml) }));
    expect(result.text).toBe("Intro\n\nAli & Bob");
    expect(result.headings).toEqual([0]);
  });

  it("clearly rejects a broken Word file", () => {
    expect(() => readDocx(zipSync({ "a.txt": strToU8("x") }))).toThrow("could not be read");
  });
});

describe("measurement", () => {
  it("counts, finds repetition candidates and lowercases Turkish correctly", () => {
    const m = measure(
      "“Nasılsın?” dedi Işık.\n\nKapıyı açtı ve çıktı. Kapıyı açtı ve çıktı.\n\nIŞIK ışık ışık.",
    );
    expect(m.paragraphs).toBe(3);
    expect(m.dialogue_ratio).toBeCloseTo(1 / 3);
    expect(m.frequent_words[0]).toEqual({ word: "ışık", count: 4 });
    expect(m.repetition_candidates).toContainEqual({ phrase: "kapıyı açtı ve çıktı", count: 2 });
  });
});
