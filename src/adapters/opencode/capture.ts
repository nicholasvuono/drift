/**
 * This file holds logic for capturing JSONL events from stdout.
 * [CMD]: opencode run --format json [message..]
 *
 * Then tries to enrich metadata with exported session JSON.
 * [CMD]: opencode export <sessionID>
 */

import * as T from "@types";
import { parseJsonl, firstSessionId } from "./parseEvents";
import { eventsToAgentTrace } from "./agentTrace";
import { stat } from "node:fs/promises";

type Args = {
  message: string;
  model?: string;
  agent?: string;
  cwd?: string;
};

type Captured = { trace: T.AgentTrace; rawJsonl: string; sessionID?: string };

const startSpinner = (label: string) => {
  if (!process.stderr.isTTY) return () => {};

  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let i = 0;
  const started = Date.now();

  const timer = setInterval(() => {
    const s = frames[i++ % frames.length];
    const secs = Math.floor((Date.now() - started) / 1000);
    process.stderr.write(`\r${s} ${label} (${secs}s)`);
  }, 80);

  return () => {
    clearInterval(timer);
    process.stderr.write(`\r✓ ${label}\n`);
  };
};

const captureTrace = async (args: Args): Promise<Captured> => {
  const ocArgs = ["run", "--format", "json"];
  if (args.model) ocArgs.push("--model", args.model);
  if (args.agent) ocArgs.push("--agent", args.agent);
  ocArgs.push(args.message); // ✅ keep prompt intact

  const started = Date.now();

  let cwd = args.cwd ?? process.cwd();
  try {
    const st = await stat(cwd);
    if (!st.isDirectory()) throw new Error();
  } catch {
    cwd = process.env.HOME ?? "/";
  }

  const stop = startSpinner("Capturing trace");

  let stdout = "";
  let stderr = "";
  let exitCode = 0;

  try {
    const proc = Bun.spawn({
      cmd: ["opencode", ...ocArgs],
      cwd,
      stdout: "pipe",
      stderr: "pipe",
    });

    stdout = await new Response(proc.stdout).text();
    stderr = await new Response(proc.stderr).text();
    exitCode = await proc.exited;
  } finally {
    stop();
  }

  const finished = Date.now();

  const events = parseJsonl(stdout);
  const sessionID = firstSessionId(events);

  let exportJson: unknown | undefined;
  if (sessionID) {
    const stopExport = startSpinner("Exporting session metadata");
    try {
      exportJson = await runExport(sessionID, cwd);
    } catch {
      // ignore
    } finally {
      stopExport();
    }
  }

  const trace = eventsToAgentTrace(events, {
    userPrompt: args.message,
    modelFlag: args.model,
    exitCode,
    stderr: stderr.trim() || undefined,
    startedMs: started,
    finishedMs: finished,
    exportJson,
  });

  return { trace, rawJsonl: stdout, sessionID };
};

const runExport = async (
  sessionID: string,
  cwd: string,
): Promise<Record<string, unknown>> => {
  const proc = Bun.spawn({
    cmd: ["opencode", "export", sessionID],
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  if (exitCode !== 0) throw new Error(stderr || "opencode export failed");

  return JSON.parse(stdout);
};

export { captureTrace, runExport };
