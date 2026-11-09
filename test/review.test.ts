import { describe, expect, it } from "vitest";
import {
  parseOutput,
  type Reply,
  type ReviewDeps,
  runReview,
  type Step,
} from "../scripts/run/review";
import { holdsFacts } from "../scripts/text/candidates";
import { findSpellingErrors } from "../scripts/text/spelling";

const step = (id: string, role: string, unit: number | null): Step => ({
  job_id: "j",
  step_id: id,
  role,
  unit,
  instructions: `be ${role}`,
  max_notes_per_part: 2,
});

function fakeDeps(script: Record<string, Reply>, modelText: string) {
  const calls: { name: string; args: Record<string, unknown> }[] = [];
  const prompts: string[] = [];
  const summaries: unknown[] = [];
  let running = 0;
  let peak = 0;
  const deps: ReviewDeps = {
    async callTool(name, args) {
      calls.push({ name, args: args as Record<string, unknown> });
      if (name === "submit_result") {
        const { step_id, last_part } = args as { step_id: string; last_part: boolean };
        return last_part ? (script[step_id] ?? { outcome: "accepted" }) : { outcome: "part_saved" };
      }
      return script[name] ?? {};
    },
    async ask(prompt) {
      running++;
      peak = Math.max(peak, running);
      prompts.push(prompt);
      await new Promise((r) => setTimeout(r, 5));
      running--;
      return { text: modelText, costUsd: 0.01 };
    },
    prepare: async () => ({ manifest: { units: [] }, language: "tr" }),
    measureAll: () => [{ no: 1 }],
    sectionText: (unit) => `section ${unit}`,
    bookContext: (role) => `context for ${role}`,
    saveSummary: (_unit, summary) => summaries.push(summary),
    checkNotes: async (output) => ({ notes: output.notes ?? [], stages: output.stages ?? [] }),
    spellingNotes: () => [],
    saveBookId: () => {},
    finish: async () => ({ html: "out.html", costUsd: 0 }),
    log: () => {},
  };
  return { deps, calls, prompts, summaries, peak: () => peak };
}

const report: Reply = {
  outcome: "accepted",
  next: {
    report_ready: true,
    dashboard: { analysis: { decisions: [{ text: "One" }] } },
  },
};
const input = { file: "a.md", genre: "novel", title: "A" };

describe("review script", () => {
  it("runs a job with no model in charge and keeps summaries local", async () => {
    const script: Record<string, Reply> = {
      save_book: { book_id: "b" },
      next_step: { steps: [step("s1", "measure", null)] },
      s1: { outcome: "accepted", next: { steps: [step("s2", "editor", 1)] } },
      s2: { outcome: "accepted", next: { steps: [step("s3", "auditor", null)] } },
      s3: report,
    };
    const fake = fakeDeps(script, '```json\n{"summary":{"text":"local"},"notes":[]}\n```');
    const result = await runReview(input, fake.deps);

    expect(fake.summaries).toEqual([{ text: "local" }]);
    expect(JSON.stringify(fake.calls)).not.toContain("local");
    expect(fake.prompts[0]).toContain("section 1");
    expect(fake.prompts[1]).toContain("context for auditor");
    expect(result).toMatchObject({ html: "out.html", cost_usd: 0.02, decisions: ["One"] });
  });

  it("runs the sections it is given at the same time", async () => {
    const script: Record<string, Reply> = {
      save_book: { book_id: "b" },
      next_step: {
        steps: [step("a", "editor", 1), step("b", "editor", 2), step("c", "editor", 3)],
      },
      a: { outcome: "accepted", next: { steps: [] } },
      b: { outcome: "accepted", next: { steps: [] } },
      c: report,
    };
    const fake = fakeDeps(script, "{}");
    await runReview(input, fake.deps);
    expect(fake.peak()).toBe(3);
  });

  it("splits notes into parts", async () => {
    const script: Record<string, Reply> = {
      save_book: { book_id: "b" },
      next_step: { steps: [step("s", "editor", 1)] },
      s: report,
    };
    const notes = Array.from({ length: 3 }, (_, i) => ({ type: "structure.x", paragraph: i }));
    const fake = fakeDeps(script, JSON.stringify({ notes }));
    await runReview(input, fake.deps);
    const parts = fake.calls.filter((c) => c.name === "submit_result");
    expect(parts.map((c) => [c.args.part_no, c.args.last_part])).toEqual([
      [1, false],
      [2, true],
    ]);
  });

  it("asks the model again when the server returns its answer", async () => {
    let round = 0;
    const script: Record<string, Reply> = {
      save_book: { book_id: "b" },
      next_step: { steps: [step("s", "editor", 1)] },
      get s() {
        round++;
        return round === 1
          ? ({ outcome: "returned", rejections: [{ code: "QUOTE_TOO_LONG" }] } as Reply)
          : report;
      },
    };
    const fake = fakeDeps(script, "{}");
    await runReview(input, fake.deps);
    expect(fake.prompts).toHaveLength(2);
    expect(fake.prompts[1]).toContain("QUOTE_TOO_LONG");
  });

  it("stops at once without a licence", async () => {
    const script: Record<string, Reply> = {
      save_book: { book_id: "b" },
      next_step: { error: "NO_LICENSE" },
    };
    await expect(runReview(input, fakeDeps(script, "{}").deps)).rejects.toThrow("NO_LICENSE");
  });
});

describe("model output", () => {
  it("reads JSON inside a code fence", () => {
    expect(parseOutput('Here:\n```json\n{"notes":[]}\n```')).toEqual({ notes: [] });
  });

  it("rejects an answer with no JSON", () => {
    expect(() => parseOutput("Sorry.")).toThrow();
  });
});

describe("spelling list", () => {
  it("finds frequent errors without a model", () => {
    const notes = findSpellingErrors(["Herkez geldi.", "Doğru cümle.", "Birşey demedi."], "tr");
    expect(notes.map((n) => [n.paragraph, n.wrong, n.right])).toEqual([
      [1, "Herkez", "herkes"],
      [3, "Birşey", "bir şey"],
    ]);
    expect(notes[0]?.verification.method).toBe("script");
  });

  it("does nothing for a language without a list", () => {
    expect(findSpellingErrors(["herkez"], "en")).toEqual([]);
  });
});

describe("fact scan", () => {
  it("picks passages with checkable facts", () => {
    expect(holdsFacts("Otuz dört yaşındaydı.")).toBe(true);
    expect(holdsFacts("It was a Tuesday morning.")).toBe(true);
    expect(holdsFacts("Rüzgâr hafifçe esti.")).toBe(false);
  });
});
