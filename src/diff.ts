import type * as T from "./types";

/**
 * Prompt IDs are frequently session-specific (e.g. OpenCode message IDs), so
 * diffing prompts by ID makes "Same" prompts look like 0 across different runs.
 *
 * We instead diff prompts by (role + normalized content) and preserve ordering
 * via an LCS (Longest Common Subsequence) match.
 */

const filterKeys = (a: T.ModelConf, b: T.ModelConf): T.ModelConfKeys =>
  (Object.keys({ ...a, ...b }) as T.ModelConfKeys).filter((k) => a[k] !== b[k]);

const diffModel = (before: T.ModelConf, after: T.ModelConf): T.ModelDiff => {
  const changedFields = filterKeys(before, after);
  const changed = changedFields.length > 0;
  return { changed, before, after, changedFields };
};

const normalizePromptForMatch = (p: T.Prompt): string => {
  const content = (p.content ?? "").trim().replace(/\s+/g, " ").toLowerCase();
  return `${p.role}:${content}`;
};

/**
 * LCS indices for two arrays of comparable keys.
 * Returns [indicesA, indicesB] for the matched subsequence.
 */
const lcsIndices = (a: string[], b: string[]): [number[], number[]] => {
  const n = a.length;
  const m = b.length;
  // dp[i][j] = LCS length for a[i:] and b[j:]
  // Use 2 rows to keep memory smaller.
  const dp: number[][] = [new Array(m + 1).fill(0), new Array(m + 1).fill(0)];
  const nextRow = new Array(m + 1).fill(0);

  // Build DP bottom-up.
  // We'll also keep a full table of decisions for backtracking.
  const dir: number[][] = Array.from({ length: n + 1 }, () =>
    new Array(m + 1).fill(0),
  );
  // dir: 1 = match (diag), 2 = skip a (down), 3 = skip b (right)

  for (let i = n - 1; i >= 0; i--) {
    // swap rows
    dp[1] = dp[0]!;
    dp[0] = nextRow;
    nextRow.fill(0);
    for (let j = m - 1; j >= 0; j--) {
      if (a[i] === b[j]) {
        dp[0][j] = 1 + dp[1][j + 1]!;
        dir[i]![j] = 1;
      } else {
        const skipA = dp[1][j];
        const skipB = dp[0][j + 1];
        if (skipA! >= skipB!) {
          dp[0][j] = skipA!;
          dir[i]![j] = 2;
        } else {
          dp[0][j] = skipB!;
          dir[i]![j] = 3;
        }
      }
    }
  }

  const idxA: number[] = [];
  const idxB: number[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    const d = dir[i]![j];
    if (d === 1) {
      idxA.push(i);
      idxB.push(j);
      i++;
      j++;
    } else if (d === 2) {
      i++;
    } else {
      j++;
    }
  }
  return [idxA, idxB];
};

const diffPrompts = (a: T.Prompts, b: T.Prompts): T.PromptDiff => {
  const aKeys = a.map(normalizePromptForMatch);
  const bKeys = b.map(normalizePromptForMatch);

  const [idxA, idxB] = lcsIndices(aKeys, bKeys);
  const aMatched = new Set(idxA);
  const bMatched = new Set(idxB);

  const unchanged: T.Prompts = idxB.map((i) => b[i]!);
  const added: T.Prompts = b.filter((_, i) => !bMatched.has(i));
  const removed: T.Prompts = a.filter((_, i) => !aMatched.has(i));

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
const normalizeStepForMatch = (s: T.PlanStep): string =>
  s.text.toLowerCase().trim().replace(/\s+/g, " ");

const lcsMatchIndices = (a: string[], b: string[]): Array<[number, number]> => {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    Array(m + 1).fill(0),
  );

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i]![j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1]![j - 1]! + 1
          : Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!);
    }
  }

  const pairs: Array<[number, number]> = [];
  let i = n,
    j = m;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      pairs.push([i - 1, j - 1]);
      i--;
      j--;
    } else if (dp[i - 1]![j]! >= dp[i]![j - 1]!) {
      i--;
    } else {
      j--;
    }
  }

  pairs.reverse();
  return pairs;
};

const diffPlanning = (a: T.PlanSteps, b: T.PlanSteps): T.PlanningDiff => {
  const aKeys = a.map(normalizeStepForMatch);
  const bKeys = b.map(normalizeStepForMatch);

  const matches = lcsMatchIndices(aKeys, bKeys);
  const matchedA = new Set(matches.map(([i]) => i));
  const matchedB = new Set(matches.map(([, j]) => j));

  const unchanged: T.PlanSteps = matches.map(([i]) => a[i]!);
  const removed: T.PlanSteps = a.filter((_, i) => !matchedA.has(i));
  const added: T.PlanSteps = b.filter((_, j) => !matchedB.has(j));

  const beforeText = a.map((s) => s.text).join("\n");
  const afterText = b.map((s) => s.text).join("\n");
  const similarity =
    beforeText.trim() || afterText.trim()
      ? jaccardSimilarity(beforeText, afterText)
      : null;

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

// ---- Prompt extraction helpers ----

type OpenCodeExportMessage = {
  info?: { role?: T.PromptRole };
  parts?: Array<{ type?: string; text?: string }>;
};

const extractPromptsFromOpenCodeExport = (exportJson: unknown): T.Prompts => {
  const msgs = (exportJson as any)?.messages as
    | OpenCodeExportMessage[]
    | undefined;
  if (!Array.isArray(msgs) || msgs.length === 0) return [];

  const prompts: T.Prompts = [];
  let order = 1;
  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i];
    const role = m?.info?.role;
    if (!role) continue;
    const content = (m?.parts ?? [])
      .filter((p) => p?.type === "text" && typeof p?.text === "string")
      .map((p) => p.text!)
      .join("");

    // Include all user prompts; include assistant prompts only if they have text.
    if (role === "user" || (role === "assistant" && content.trim() !== "")) {
      prompts.push({
        id: `opencode_export_${i}`,
        role,
        content,
        order,
      });
      order++;
    }
  }

  return prompts;
};

/**
 * If prompts are empty in the normalized trace, fall back to OpenCode export
 * messages (if present) so prompt diffs don't show up as 0.
 */
const getPromptsForDiff = (t: T.AgentTrace): T.Prompts => {
  if (Array.isArray(t.prompts) && t.prompts.length > 0) return t.prompts;
  const exportJson = (t.metadata as any)?.opencode_export;
  return extractPromptsFromOpenCodeExport(exportJson);
};

const diffTraces = (a: T.AgentTrace, b: T.AgentTrace): T.TraceDiff => ({
  traceIdA: a.traceId,
  traceIdB: b.traceId,
  model: diffModel(a.model, b.model),
  prompts: diffPrompts(getPromptsForDiff(a), getPromptsForDiff(b)),
  planning: diffPlanning(a.planning, b.planning),
  tools: diffTools(a.toolCalls, b.toolCalls),
  outcome: diffOutcome(a.outcome, b.outcome),
});

export default diffTraces;
