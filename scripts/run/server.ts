/** Signs the author in once and calls the Masthead server without involving a model. */
import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:http";
import { homedir, platform, tmpdir } from "node:os";
import { join } from "node:path";
import type { Reply } from "./review";

const SERVER = "https://mcp.publishify.app";
const AUTH_DIR = join(homedir(), ".config", "masthead");
const AUTH_FILE = join(AUTH_DIR, "auth.json");
const LOGIN_TIMEOUT_MS = 300_000;
const MODEL_TIMEOUT_MS = 600_000;
const NO_TOOLS = "Bash,Read,Write,Edit,Glob,Grep,WebSearch,WebFetch,Agent,Task,Skill";

type Auth = { client_id: string; access_token: string; refresh_token?: string; expires_at: number };
type Tokens = { access_token: string; refresh_token?: string; expires_in?: number };

const base64url = (bytes: Buffer) => bytes.toString("base64url");

export function openInBrowser(target: string) {
  const command =
    platform() === "darwin" ? "open" : platform() === "win32" ? "explorer" : "xdg-open";
  spawn(command, [target], { stdio: "ignore", detached: true })
    .on("error", () => {})
    .unref();
}

function saveAuth(auth: Auth) {
  mkdirSync(AUTH_DIR, { recursive: true });
  writeFileSync(AUTH_FILE, JSON.stringify(auth));
  chmodSync(AUTH_FILE, 0o600);
}

const toAuth = (clientId: string, tokens: Tokens): Auth => ({
  client_id: clientId,
  access_token: tokens.access_token,
  ...(tokens.refresh_token ? { refresh_token: tokens.refresh_token } : {}),
  expires_at: Date.now() + (tokens.expires_in ?? 3600) * 1000,
});

async function requestTokens(fields: Record<string, string>) {
  const response = await fetch(`${SERVER}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields),
  });
  return response.ok ? ((await response.json()) as Tokens) : undefined;
}

function login(): Promise<Auth> {
  return new Promise((done, fail) => {
    const verifier = base64url(randomBytes(32));
    const state = base64url(randomBytes(16));
    let clientId = "";
    let redirect = "";
    const server = createServer(async (request, response) => {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      if (url.pathname !== "/callback") return response.writeHead(404).end();
      const code = url.searchParams.get("code");
      const accepted = code && url.searchParams.get("state") === state;
      response.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
      response.end(accepted ? "Signed in. You can close this tab." : "Sign-in failed.");
      server.close();
      clearTimeout(timer);
      if (!accepted) return fail(new Error("LOGIN_REQUIRED"));
      const tokens = await requestTokens({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        redirect_uri: redirect,
        code_verifier: verifier,
      });
      if (!tokens) return fail(new Error("LOGIN_REQUIRED"));
      const auth = toAuth(clientId, tokens);
      saveAuth(auth);
      done(auth);
    });
    const timer = setTimeout(() => {
      server.close();
      fail(new Error("LOGIN_REQUIRED"));
    }, LOGIN_TIMEOUT_MS);
    server.listen(0, "127.0.0.1", async () => {
      const { port } = server.address() as { port: number };
      redirect = `http://127.0.0.1:${port}/callback`;
      const registered = await fetch(`${SERVER}/oauth/register`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          redirect_uris: [redirect],
          client_name: "Publishify Masthead",
          token_endpoint_auth_method: "none",
        }),
      });
      clientId = ((await registered.json()) as { client_id: string }).client_id;
      const challenge = base64url(createHash("sha256").update(verifier).digest());
      const query = new URLSearchParams({
        response_type: "code",
        client_id: clientId,
        redirect_uri: redirect,
        state,
        code_challenge: challenge,
        code_challenge_method: "S256",
      });
      openInBrowser(`${SERVER}/authorize?${query}`);
    });
  });
}

async function accessToken(forceLogin = false): Promise<string> {
  const saved = existsSync(AUTH_FILE)
    ? (JSON.parse(readFileSync(AUTH_FILE, "utf-8")) as Auth)
    : undefined;
  if (saved && !forceLogin) {
    if (saved.expires_at > Date.now() + 60_000) return saved.access_token;
    if (saved.refresh_token) {
      const tokens = await requestTokens({
        grant_type: "refresh_token",
        refresh_token: saved.refresh_token,
        client_id: saved.client_id,
      });
      if (tokens) {
        const auth = toAuth(saved.client_id, tokens);
        saveAuth(auth);
        return auth.access_token;
      }
    }
  }
  return (await login()).access_token;
}

/** The single sign-in is shared by parallel calls. */
let pendingToken: Promise<string> | undefined;
const sharedToken = (force = false) => {
  if (force || !pendingToken) pendingToken = accessToken(force);
  return pendingToken;
};

export async function callTool(name: string, args: object, retried = false): Promise<Reply> {
  const response = await fetch(`${SERVER}/mcp`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${await sharedToken()}`,
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      "mcp-protocol-version": "2025-06-18",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name, arguments: args },
    }),
  });
  if (response.status === 401 && !retried) {
    await sharedToken(true);
    return callTool(name, args, true);
  }
  const body = await response.text();
  const json = body.includes("data:") ? (body.split("data:")[1]?.split("\n")[0] ?? "{}") : body;
  const text = JSON.parse(json).result?.content?.[0]?.text as string | undefined;
  if (!text) throw new Error(`SERVER_ERROR ${response.status}`);
  try {
    return JSON.parse(text) as Reply;
  } catch {
    throw new Error("SERVER_REFUSED");
  }
}

/** A short, separate conversation with every tool off, on the author's own Claude account. */
export function askModel(prompt: string, model = "sonnet") {
  return new Promise<{ text: string; costUsd: number }>((done, fail) => {
    const env = { ...process.env };
    delete env.CLAUDECODE;
    delete env.CLAUDE_CODE_ENTRYPOINT;
    const child = spawn(
      "claude",
      [
        "-p",
        "--model",
        model,
        "--output-format",
        "json",
        "--strict-mcp-config",
        "--disallowedTools",
        NO_TOOLS,
      ],
      { cwd: mkdtempSync(join(tmpdir(), "masthead-")), env },
    );
    const timer = setTimeout(() => child.kill(), MODEL_TIMEOUT_MS);
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.on("error", () => fail(new Error("CLAUDE_NOT_FOUND")));
    child.on("close", () => {
      clearTimeout(timer);
      try {
        const result = JSON.parse(output) as {
          result?: string;
          is_error?: boolean;
          total_cost_usd?: number;
        };
        if (result.is_error || result.result === undefined) {
          // Claude's own short error, such as a usage limit. It never echoes the book.
          return fail(new Error(`MODEL_FAILED: ${String(result.result).slice(0, 160)}`));
        }
        done({ text: result.result, costUsd: result.total_cost_usd ?? 0 });
      } catch {
        fail(new Error("MODEL_FAILED"));
      }
    });
    child.stdin.end(prompt);
  });
}
