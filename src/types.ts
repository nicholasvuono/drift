type UUID = string;
type Timestamp = string; // ISO-8601

interface ModelConf {
  provider: string;
  model: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  maxTokens?: number;
  extra?: Record<string, unknown>;
}

type PromptRole = "system" | "developer" | "user" | "tool" | "assistant";

interface Prompt {
  id: string;
  role: PromptRole;
  content: string;
  order: number;
}

type Prompts = Prompt[];

interface PlanStep {
  index: number;
  text: string;
}

type PlanSteps = PlanStep[];

interface ToolCall {
  id: string;
  toolName: string;
  args: Record<string, unknown>;
  startTime: Timestamp;
  endTime: Timestamp;
  error?: string;
}

type ToolCalls = ToolCall[];

type OutcomeStatus = "success" | "failure" | "partial" | "unknown";

type OutcomeSource = "agent" | "process_exit" | "external_check" | "unknown";

interface Outcome {
  status: OutcomeStatus;
  reason?: string;
  source?: OutcomeSource;
}

interface AgentTrace {
  traceId: UUID;
  agentName: string;
  agentVersion?: string;

  startedAt: Timestamp;
  finishedAt: Timestamp;

  model: ModelConf;

  prompts: Prompts;
  planning: PlanSteps;
  toolCalls: ToolCalls;

  outcome: Outcome;

  metadata?: Record<string, unknown>;
}

interface ToolUsageSummary {
  totalCalls: number;
  uniqueTools: string[];
  callsByTool: Record<string, number>;
}

interface ToolCallDelta {
  toolName: string;
  beforeCalls: number;
  afterCalls: number;
  delta: number;
}

type ToolCallDeltas = ToolCallDelta[];

type ModelConfKeys = Array<keyof ModelConf>;

interface ModelDiff {
  changed: boolean;
  before: ModelConf;
  after: ModelConf;
  changedFields: ModelConfKeys;
}

interface PromptDiff {
  added: Prompts;
  removed: Prompts;
  unchanged: Prompts;
}

interface PlanningDiff {
  added: PlanStep[];
  removed: PlanStep[];
  unchanged: PlanStep[];
  /** Simple similarity score in [0,1] between concatenated plan texts. */
  similarity: number | null;
}

interface ToolDiff {
  before: ToolUsageSummary;
  after: ToolUsageSummary;
  addedTools: string[];
  removedTools: string[];
  toolCallDeltas: ToolCallDeltas;
}

interface OutcomeDiff {
  before: Outcome;
  after: Outcome;
  changed: boolean;
}

interface TraceDiff {
  traceIdA: UUID;
  traceIdB: UUID;
  agentA?: string;
  agentB?: string;
  model: ModelDiff;
  prompts: PromptDiff;
  planning: PlanningDiff;
  tools: ToolDiff;
  outcome: OutcomeDiff;
}

export type {
  UUID,
  Timestamp,
  ModelConf,
  PromptRole,
  Prompt,
  Prompts,
  PlanStep,
  PlanSteps,
  ToolCall,
  ToolCalls,
  OutcomeStatus,
  OutcomeSource,
  Outcome,
  AgentTrace,
  ToolUsageSummary,
  ToolCallDelta,
  ToolCallDeltas,
  ModelConfKeys,
  ModelDiff,
  PromptDiff,
  PlanningDiff,
  ToolDiff,
  OutcomeDiff,
  TraceDiff,
};
