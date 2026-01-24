import type { AgentTrace } from "@types";

export const baseTrace = (overrides: Partial<AgentTrace> = {}): AgentTrace => {
  return {
    traceId: "trace-1",
    agentName: "opencode",
    startedAt: "2026-01-01T00:00:00Z",
    finishedAt: "2026-01-01T00:01:00Z",

    model: {
      provider: "anthropic",
      model: "claude-3.5-sonnet",
    },

    prompts: [],
    planning: [],
    toolCalls: [],

    outcome: {
      status: "unknown",
    },

    ...overrides,
  };
};
