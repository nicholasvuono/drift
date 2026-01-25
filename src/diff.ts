import type * as T from "./types";

const isShallowEqual = (a: T.Prompt, b: T.Prompt): boolean =>
  JSON.stringify(a) === JSON.stringify(b);

const filterKeys = (a: T.ModelConf, b: T.ModelConf): T.ModelConfKeys =>
  (Object.keys({ ...a, ...b }) as T.ModelConfKeys).filter((k) => a[k] !== b[k]);

const diffModel = (before: T.ModelConf, after: T.ModelConf): T.ModelDiff => {
  const changedFields = filterKeys(before, after);
  const changed = changedFields.length > 0;
  return { changed, before, after, changedFields };
};

const mapPrompts = (ps: T.Prompts) => new Map(ps.map((p) => [p.id, p]));

const diffPrompts = (a: T.Prompts, b: T.Prompts): T.PromptDiff => {
  const aMap = mapPrompts(a);
  const bMap = mapPrompts(b);
  const added: T.Prompts = [];
  const removed: T.Prompts = [];
  const unchanged: T.Prompts = [];

  for (const [id, prompt] of bMap) {
    if (!aMap.has(id)) added.push(prompt);
    if (isShallowEqual(prompt, aMap.get(id)!)) unchanged.push(prompt);
  }

  for (const [id, prompt] of aMap) {
    if (!bMap.has(id)) removed.push(prompt);
  }

  return { added, removed, unchanged };
};

// needed?
const normalizeForSimilarity = (s: string): string[] =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

//TODO: potential refactor
const jaccardSimilarity = (a: string, b: string): number => {
  const aTokens = new Set(normalizeForSimilarity(a));
  const bTokens = new Set(normalizeForSimilarity(b));
  if (aTokens.size === 0 && bTokens.size === 0) return 1;
  if (aTokens.size === 0 || bTokens.size === 0) return 0;
  let intersection = 0;
  for (const t of aTokens) if (bTokens.has(t)) intersection++;
  const union = aTokens.size + bTokens.size - intersection;
  return union === 0 ? 1 : intersection / union;
};

const mapPlanSteps = (ps: T.PlanSteps) => new Map(ps.map((s) => [s.index, s]));

const diffPlanning = (a: T.PlanSteps, b: T.PlanSteps): T.PlanningDiff => {
  const aMap = mapPlanSteps(a);
  const bMap = mapPlanSteps(b);
  const added: T.PlanSteps = [];
  const removed: T.PlanSteps = [];
  const unchanged: T.PlanSteps = [];

  for (const [index, step] of bMap) {
    if (!aMap.has(index)) added.push(step);
    if (step.text === aMap.get(index)!.text) unchanged.push(step);
  }

  for (const [index, step] of aMap) {
    if (!bMap.has(index)) removed.push(step);
  }

  const beforeText = a.map((s) => s.text).join("\n");
  const afterText = b.map((s) => s.text).join("\n");
  const similarity = jaccardSimilarity(beforeText, afterText);

  return { added, removed, unchanged, similarity };
};

const summarizeTools = (toolCalls: T.ToolCalls): T.ToolUsageSummary => {
  const tools = new Set<string>();
  const callsByTool: Record<string, number> = {};
  for (const call of toolCalls) tools.add(call.toolName);
  return { totalCalls: toolCalls.length, uniqueTools: [...tools], callsByTool };
};

function computeToolDeltas(
  before: T.ToolUsageSummary,
  after: T.ToolUsageSummary,
): T.ToolCallDeltas {
  const allTools = new Set<string>([
    ...Object.keys(before.callsByTool),
    ...Object.keys(after.callsByTool),
  ]);
  const deltas: T.ToolCallDeltas = [];
  for (const tool of allTools) {
    const b = before.callsByTool[tool] ?? 0;
    const a = after.callsByTool[tool] ?? 0;
    const d = a - b;
    if (d !== 0) {
      deltas.push({
        toolName: tool,
        beforeCalls: b,
        afterCalls: a,
        delta: d,
      });
    }
  }
  deltas.sort(
    (x, y) =>
      Math.abs(y.delta) - Math.abs(x.delta) ||
      x.toolName.localeCompare(y.toolName),
  );
  return deltas;
}

const filterTools = (a: T.ToolUsageSummary, b: T.ToolUsageSummary) =>
  a.uniqueTools.filter((t) => !b.uniqueTools.includes(t));

const diffTools = (aCalls: T.ToolCalls, bCalls: T.ToolCalls): T.ToolDiff => {
  const before = summarizeTools(aCalls);
  const after = summarizeTools(bCalls);

  const addedTools = filterTools(after, before);
  const removedTools = filterTools(before, after);

  const toolCallDeltas = computeToolDeltas(before, after);

  return { before, after, addedTools, removedTools, toolCallDeltas };
};

const getChangedOutcomes = (a: T.Outcome, b: T.Outcome) =>
  (Object.keys(a) as (keyof T.Outcome)[]).some((k) => a[k] !== b[k]);

const diffOutcome = (before: T.Outcome, after: T.Outcome): T.OutcomeDiff => {
  return {
    before,
    after,
    changed: getChangedOutcomes(before, after),
  };
};

const diffTraces = (a: T.AgentTrace, b: T.AgentTrace): T.TraceDiff => ({
  traceIdA: a.traceId,
  traceIdB: b.traceId,
  model: diffModel(a.model, b.model),
  prompts: diffPrompts(a.prompts, b.prompts),
  planning: diffPlanning(a.planning, b.planning),
  tools: diffTools(a.toolCalls, b.toolCalls),
  outcome: diffOutcome(a.outcome, b.outcome),
});

export default diffTraces;
