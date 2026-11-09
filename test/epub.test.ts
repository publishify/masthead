import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { readEpub, TextError } from "../scripts/text/formats";

const container = `<container><rootfiles><rootfile full-path="OEBPS/book.opf"/></rootfiles></container>`;
const opf = `<package><manifest>
  <item id="nav" href="nav.xhtml" properties="nav"/>
  <item id="b" href="b%20two.xhtml"/><item id="a" href="a.xhtml"/><item id="c" href="c.xhtml"/>
</manifest><spine><itemref idref="a"/><itemref idref="b"/><itemref idref="c" linear="no"/></spine></package>`;
const page = (body: string) =>
  `<html><head><title>Ignored</title><style>p{}</style></head><body>${body}</body></html>`;
const book = (extra: Record<string, Uint8Array> = {}) =>
  zipSync({
    "META-INF/container.xml": strToU8(container),
    "OEBPS/book.opf": strToU8(opf),
    "OEBPS/nav.xhtml": strToU8(page("<p>Contents</p>")),
    "OEBPS/a.xhtml": strToU8(page("<h1>One</h1><p>First &amp; <em>best</em>.</p>")),
    "OEBPS/b two.xhtml": strToU8(page("<p>No heading here.</p><p>Second line.</p>")),
    "OEBPS/c.xhtml": strToU8(page("<p>Left out.</p>")),
    ...extra,
  });

describe("EPUB", () => {
  it("reads the spine in order and skips navigation and non-linear pages", () => {
    const result = readEpub(book());
    expect(result.text).toBe("One\n\nFirst & best.\n\nNo heading here.\n\nSecond line.");
    expect(result.extractor).toBe("epub@1");
  });

  it("starts a section at each heading and at each spine file", () => {
    expect(readEpub(book()).headings).toEqual([0, 2]);
  });

  it("refuses a protected book", () => {
    const locked = book({
      "META-INF/encryption.xml": strToU8("<encryption><enc>AES</enc></encryption>"),
    });
    expect(() => readEpub(locked)).toThrow(TextError);
  });

  it("refuses a file that is not an EPUB", () => {
    expect(() => readEpub(zipSync({ "a.txt": strToU8("x") }))).toThrow(TextError);
  });
});
