import * as T from "@types";
import type { Events } from "./parseEvents";

const isoFromMs = (ms: number): string => new Date(ms).toISOString();

const appendId = (prefix: string): string => `${prefix}_${crypto.randomUUID()}`;

// OpenCode to trace options
interface Options {
  userPrompt?: string;
  modelFlag?: string;
  agentVersion?: string;
  exportJson?: unknown;
  exitCode: number;
  stderr?: string;
  startedMs?: number;
  finishedMs?: number;
}

const findSessionId = (events: Events) =>
  events.find((e) => e.sessionID)?.sessionID ??
  events.find((e) => e.part?.sessionID)?.part?.sessionID;

const getModelConf = (opts: Options): T.ModelConf => {
  const flag = (opts.modelFlag ?? "").trim();
  if (!flag || !flag.includes("/"))
    return { provider: "unknown", model: "unknown" };
  const [provider, ...rest] = flag.split("/");
  return { provider: provider!, model: rest.join("/") };
};

const eventsToAgentTrace = (events: Events, opts: Options): T.AgentTrace => {
  const sessionId = findSessionId(events);
  const started = opts.startedMs ?? events[0]?.timestamp ?? Date.now();
  const finished =
    opts.finishedMs ??
    (events.length ? events[events.length - 1]!.timestamp : Date.now());

  const model: T.ModelConf = getModelConf(opts);

  const prompts: T.Prompts = [];
  if (opts.userPrompt)
    prompts.push({
      id: "user_prompt",
      role: "user",
      content: opts.userPrompt,
      order: 1,
    });

  const toolCalls: T.ToolCalls = [];
  for (const e of events) {
    if (e.type !== "tool_use") continue;
    const part = e.part ?? {};
    const state = part.state ?? {};
    const time = state.time ?? {};
    const start =
      typeof time.start === "number"
        ? isoFromMs(time.start)
        : isoFromMs(e.timestamp);
    const end =
      typeof time.end === "number"
        ? isoFromMs(time.end)
        : isoFromMs(e.timestamp);
    toolCalls.push({
      id: part.callID ? String(part.callID) : appendId("tool"),
      toolName: part.tool ? String(part.tool) : "unknown_tool",
      args: state.input && typeof state.input === "object" ? state.input : {},
      startTime: start,
      endTime: end,
      error:
        state.status && state.status !== "completed"
          ? String(state.status)
          : undefined,
    });
  }

  const outcomeStatus = opts.exitCode === 0 ? "success" : "failure";

  return {
    traceId: sessionId ?? appendId("trace"),
    agentName: "opencode",
    agentVersion: opts.agentVersion,
    startedAt: isoFromMs(started),
    finishedAt: isoFromMs(finished),
    model,
    prompts,
    planning: [],
    toolCalls,
    outcome: {
      status: outcomeStatus,
      reason:
        outcomeStatus === "failure"
          ? (opts.stderr ?? "Non-zero exit code")
          : undefined,
      source: "process_exit",
    },
    metadata: {
      opencode_session_id: sessionId,
      ...(opts.exportJson ? { opencode_export: opts.exportJson } : {}),
    },
  };
};

export type { Options };

export { eventsToAgentTrace };
