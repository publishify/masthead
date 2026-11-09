/** Runs a whole review with no model in charge. A model is called only to read the book. */
export type Step = {
  job_id: string;
  step_id: string;
  role: string;
  unit: number | null;
  /** Set when the plan covers only part of the book. */
  units?: number[];
  instructions?: string;
  max_notes_per_part?: number;
};

export type Rejection = { code: string; index?: number; field?: string };
export type Reply = {
  error?: string;
  book_id?: string;
  steps?: Step[];
  report_ready?: boolean;
  dashboard?: Dashboard;
  outcome?: string;
  rejections?: Rejection[];
  next?: Reply;
};
type Limited = { read_words: number; total_words: number };
type Dashboard = { analysis?: { decisions?: { text: string }[]; limited?: Limited } };
type Note = Record<string, unknown> & { paragraph?: number; wrong?: string };
type RoleOutput = { summary?: unknown; notes?: Note[]; stages?: unknown[] };

export type ReviewDeps = {
  callTool(name: string, args: object): Promise<Reply>;
  ask(prompt: string, role: string): Promise<{ text: string; costUsd: number }>;
  prepare(file: string, genre: string): Promise<PreparedBook>;
  measureAll(units?: number[]): unknown[];
  sectionText(unit: number): string;
  bookContext(role: string, units?: number[]): string;
  saveSummary(unit: number, summary: unknown): void;
  checkNotes(output: RoleOutput, unit?: number): Promise<{ notes: Note[]; stages: unknown[] }>;
  spellingNotes(unit: number, language: string): Note[];
  saveBookId(id: string): void;
  finish(dashboard: unknown, language: string): Promise<{ html: string; costUsd: number }>;
  log(message: string): void;
};

export type PreparedBook = { manifest: object; language: string; book_id?: string };

const MAX_MODEL_TRIES = 3;
const DEFAULT_PART_SIZE = 25;

export function parseOutput(text: string): RoleOutput {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("The model did not return JSON.");
  return JSON.parse(text.slice(start, end + 1)) as RoleOutput;
}

function ensure(reply: Reply): Reply {
  if (reply.error) throw new Error(reply.error);
  return reply;
}

export async function runReview(
  input: { file: string; genre: string; title: string; language?: string },
  deps: ReviewDeps,
) {
  const started = Date.now();
  let cost = 0;
  let report: Reply | undefined;
  const breakdown: { step: string; seconds: number; cost_usd: number }[] = [];
  const incomplete: string[] = [];
  const prepared = await deps.prepare(input.file, input.genre);
  const saved = ensure(
    await deps.callTool("save_book", {
      ...(prepared.book_id ? { book_id: prepared.book_id } : {}),
      title: input.title,
      genre: input.genre,
      language: prepared.language,
      manifest: prepared.manifest,
    }),
  );
  const bookId = saved.book_id as string;
  deps.saveBookId(bookId);

  const promptFor = (step: Step, feedback: string) => {
    const source = step.unit
      ? deps.sectionText(step.unit)
      : deps.bookContext(step.role, step.units);
    return `${step.instructions}\n# Text\n\n${source}${feedback}`;
  };

  async function readWithModel(step: Step, feedback: string) {
    for (let attempt = 1; ; attempt++) {
      const began = Date.now();
      const answer = await deps.ask(promptFor(step, feedback), step.role);
      cost += answer.costUsd;
      breakdown.push({
        step: `${step.role}${step.unit ? ` ${step.unit}` : ""}`,
        seconds: Math.round((Date.now() - began) / 1000),
        cost_usd: Math.round(answer.costUsd * 1000) / 1000,
      });
      try {
        return parseOutput(answer.text);
      } catch (error) {
        if (attempt >= MAX_MODEL_TRIES) throw error;
      }
    }
  }

  async function send(
    step: Step,
    body: { notes?: Note[]; stages?: unknown[]; measurements?: unknown[] },
  ) {
    const ids = { book_id: bookId, job_id: step.job_id, step_id: step.step_id };
    const size = step.max_notes_per_part ?? DEFAULT_PART_SIZE;
    const notes = body.notes ?? [];
    const lastPart = Math.max(1, Math.ceil(notes.length / size));
    let reply: Reply = {};
    for (let part = 1; part <= lastPart; part++) {
      reply = ensure(
        await deps.callTool("submit_result", {
          ...ids,
          part_no: part,
          last_part: part === lastPart,
          notes: notes.slice((part - 1) * size, part * size),
          ...(part === 1 && body.stages ? { stages: body.stages } : {}),
          ...(part === 1 && body.measurements ? { measurements: body.measurements } : {}),
        }),
      );
      if (reply.outcome === "returned" || reply.outcome === "reported") return reply;
    }
    return reply;
  }

  async function workOn(step: Step, feedback = ""): Promise<void> {
    deps.log(`${step.role}${step.unit ? ` ${step.unit}` : ""}`);
    let reply: Reply;
    if (step.role === "measure") {
      reply = await send(step, { measurements: deps.measureAll(step.units) });
    } else {
      const output = await readWithModel(step, feedback);
      if (step.unit && output.summary !== undefined) deps.saveSummary(step.unit, output.summary);
      const checked = await deps.checkNotes(output, step.unit ?? undefined);
      const found = step.unit ? deps.spellingNotes(step.unit, prepared.language) : [];
      const known = new Set(checked.notes.map((n) => `${n.paragraph}:${n.wrong}`));
      const extra = found.filter((n) => !known.has(`${n.paragraph}:${n.wrong}`));
      reply = await send(step, { notes: [...checked.notes, ...extra], stages: checked.stages });
    }
    if (reply.outcome === "returned") {
      return workOn(
        step,
        `\n\n# Your last answer was refused\n${JSON.stringify(reply.rejections)}`,
      );
    }
    if (reply.outcome === "reported") {
      deps.log(`${step.role} could not be completed: ${JSON.stringify(reply.rejections)}`);
      incomplete.push(`${step.role}${step.unit ? ` ${step.unit}` : ""}`);
    }
    if (reply.next) await handle(reply.next);
  }

  async function handle(reply: Reply): Promise<void> {
    ensure(reply);
    if (reply.report_ready) report = reply;
    await Promise.all((reply.steps ?? []).map((step) => workOn(step)));
  }

  await handle(await deps.callTool("next_step", { book_id: bookId }));
  if (!report?.dashboard) throw new Error("The review ended without a report.");

  const uiLanguage = input.language ?? (prepared.language === "und" ? "en" : prepared.language);
  const done = await deps.finish(report.dashboard, uiLanguage);
  return {
    html: done.html,
    language: uiLanguage,
    cost_usd: Math.round((cost + done.costUsd) * 100) / 100,
    seconds: Math.round((Date.now() - started) / 1000),
    breakdown,
    incomplete,
    limited: report.dashboard.analysis?.limited ?? null,
    translation_usd: Math.round(done.costUsd * 1000) / 1000,
    decisions: (report.dashboard.analysis?.decisions ?? []).map((d) => d.text),
  };
}
