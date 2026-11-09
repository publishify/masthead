#!/usr/bin/env node
// Keeps a board worker away from the book and the web. The author's own session is not affected.
import { readFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";

const WORKER = "board-worker";
const WRITE_TOOLS = new Set(["Write", "Edit", "MultiEdit", "NotebookEdit"]);
const WEB_TOOLS = new Set(["WebSearch", "WebFetch"]);
// The text tool's "unit <no>" command, with nothing that could chain another command.
const READ_UNIT =
  /^node\s+("[^"`$]*masthead\.mjs"|[^\s"'`$;|&<>()]*masthead\.mjs)\s+unit\s+\d+\s*$/;

const deny = (message) => {
  process.stderr.write(`${message}\n`);
  process.exit(2);
};

let input;
try {
  input = JSON.parse(readFileSync(0, "utf-8"));
} catch {
  deny("Masthead could not read this tool call, so it was blocked.");
}

if (!String(input.agent_type ?? "").includes(WORKER)) process.exit(0);

const { tool_name: tool, tool_input: args = {}, cwd = process.cwd() } = input;

if (WEB_TOOLS.has(tool)) deny("A board worker may not use the web.");

if (WRITE_TOOLS.has(tool)) {
  const target = args.file_path ?? args.notebook_path;
  const inside = target ? relative(resolve(cwd, ".masthead"), resolve(cwd, target)) : "..";
  if (inside.startsWith("..") || isAbsolute(inside)) {
    deny("A board worker may write only inside .masthead/. The book stays unchanged.");
  }
}

if (tool === "Bash" && !READ_UNIT.test(String(args.command ?? "").trim())) {
  deny("A board worker may run only the text tool's unit command.");
}
