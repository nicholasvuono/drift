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

type Args = {
  message: string;
  model?: string;
  agent?: string;
  cwd?: string;
};

type Captured = { trace: T.AgentTrace; rawJsonl: string; sessionID?: string };

const captureTrace = async (args: Args): Promise<Captured> => {
  const cwd = args.cwd ?? import.meta.dir;

  const ocArgs = ["run", "--format", "json"];
  if (args.model) ocArgs.push("--model", args.model);
  if (args.agent) ocArgs.push("--agent", args.agent);
  ocArgs.push(...args.message.split(" "));

  const started = Date.now();

  const proc = Bun.spawn({
    cmd: ["opencode", ...ocArgs],
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  const finished = Date.now();

  const events = parseJsonl(stdout);
  const sessionID = firstSessionId(events);

  let exportJson: unknown | undefined; // look into typing this later.
  if (sessionID) {
    try {
      exportJson = await runExport(sessionID, cwd);
    } catch {}
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
