import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("check command", () => {
  const run = (args: string[], cwd: string) =>
    JSON.parse(
      spawnSync("node", [join(process.cwd(), "scripts/bin/masthead.mjs"), ...args], {
        cwd,
        encoding: "utf-8",
      }).stdout,
    );

  it("marks proven quotes and leaves the rest for the Evidence Checker", () => {
    const dir = mkdtempSync(join(tmpdir(), "masthead-"));
    writeFileSync(join(dir, "book.md"), "The door opened.\n\nHe waited for hours.\n");
    run(["prepare", "book.md", "--genre", "short-story"], dir);
    mkdirSync(join(dir, ".masthead/out"), { recursive: true });
    const note = { type: "continuity.time", check: "objective", result: "fail" };
    writeFileSync(
      join(dir, ".masthead/out/a.json"),
      JSON.stringify({
        notes: [
          { ...note, quote: "He waited", evidence: [{ unit: 1, quote: "The door opened." }] },
          { ...note, quote: "He waited", evidence: [{ unit: 1, quote: "Not in the book." }] },
          { ...note, quote: "Invented." },
          { type: "evidence.quote", check: "objective", note_no: 1, result: "pass" },
        ],
        stages: [{ scheme: "vogler", no: 1, state: "strong" }],
      }),
    );
    const { notes, stages } = run(["check", ".masthead/out/a.json", "--unit", "1"], dir);
    expect(notes[0].verification).toEqual({ method: "script", verified_by: "text-tool" });
    expect(notes[0].unit).toBe(1);
    expect(notes[0].unit_hash).toMatch(/^sha256:/);
    expect(notes[1].verification.method).toBe("model");
    expect(notes[2].verification.method).toBe("model");
    expect(notes[3].verification).toBeUndefined();
    expect(stages).toHaveLength(1);
  });

  it("finds the section itself for book-level notes", () => {
    const dir = mkdtempSync(join(tmpdir(), "masthead-"));
    writeFileSync(join(dir, "book.md"), "The door opened.\n\nHe waited for hours.\n");
    run(["prepare", "book.md", "--genre", "short-story"], dir);
    mkdirSync(join(dir, ".masthead/out"), { recursive: true });
    writeFileSync(
      join(dir, ".masthead/out/b.json"),
      JSON.stringify({
        notes: [
          {
            type: "continuity.time",
            check: "objective",
            result: "fail",
            quote: "He waited",
            evidence: [{ quote: "The door opened." }],
          },
        ],
      }),
    );
    const [note] = run(["check", ".masthead/out/b.json"], dir).notes;
    expect(note.unit).toBe(1);
    expect(note.evidence[0].unit).toBe(1);
    expect(note.verification.method).toBe("script");
  });

  it("keeps manuscripts in one folder apart", () => {
    const dir = mkdtempSync(join(tmpdir(), "masthead-"));
    writeFileSync(join(dir, "a.md"), "First book.\n");
    writeFileSync(join(dir, "b.md"), "Second book.\n");
    const summary = join(dir, ".masthead/summaries/1.json");
    const prepare = (file: string) => run(["prepare", file, "--genre", "other"], dir);

    expect(prepare("a.md").book_id).toBeUndefined();
    writeFileSync(join(dir, ".masthead/book.json"), JSON.stringify({ book_id: "book-a" }));
    mkdirSync(join(dir, ".masthead/summaries"), { recursive: true });
    writeFileSync(summary, "{}");

    expect(prepare("a.md").book_id).toBe("book-a");
    expect(existsSync(summary)).toBe(true);

    expect(prepare("b.md").book_id).toBeUndefined();
    expect(existsSync(summary)).toBe(false);
    expect(existsSync(join(dir, ".masthead/book.json"))).toBe(false);

    expect(prepare("a.md").book_id).toBe("book-a");
  });

  it("recognises the language of a manuscript", () => {
    const dir = mkdtempSync(join(tmpdir(), "masthead-"));
    writeFileSync(join(dir, "en.md"), "The man and the dog went to the sea with his son.\n");
    writeFileSync(join(dir, "tr.md"), "Bu bir kitap ve çok güzel bir kitap gibi ama değil.\n");
    expect(run(["prepare", "en.md", "--genre", "other"], dir).language).toBe("en");
    expect(run(["prepare", "tr.md", "--genre", "other"], dir).language).toBe("tr");
  });
});
