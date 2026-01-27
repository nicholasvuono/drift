import * as T from "./types";

interface RenderOptions {
  // color?: boolean // Maybe implement this later, I think rendering needs refactor in general
  // Show per-tool call deltas (top N). Default 5.
  toolDeltaLimit?: number;
}

const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;

const renderDiffs = (diff: T.TraceDiff, options: RenderOptions): string => {
  const limit = options.toolDeltaLimit ?? 20;
  const lines: string[] = [];

  const aLabel = diff.agentA
    ? `${diff.agentA}/${diff.model.before.model}`
    : diff.model.before.model;
  const bLabel = diff.agentB
    ? `${diff.agentB}/${diff.model.after.model}`
    : diff.model.after.model;

  lines.push(
    bold("╭─ Agent Trace Diff ─────────────────────────────────────╮"),
    `│ A: ${aLabel.padEnd(50)}│`,
    `│ B: ${bLabel.padEnd(50)}│`,
    bold("╰────────────────────────────────────────────────────────╯"),
    "",
  );

  renderModel(diff.model, lines);
  renderPrompts(diff.prompts, lines, {
    a: diff.model.before.model,
    b: diff.model.after.model,
  });
  renderPlanning(diff.planning, lines, {
    a: diff.model.before.model,
    b: diff.model.after.model,
  });

  renderTools(
    diff.tools,
    lines,
    limit,
    {
      a: diff.model.before.model,
      b: diff.model.after.model,
    },
    diff.tools.before.uniqueTools,
    diff.tools.after.uniqueTools,
  );
  renderOutcome(diff.outcome, lines, {
    a: diff.model.before.model,
    b: diff.model.after.model,
  });

  return lines.join("\n");
};

const renderModel = (model: T.ModelDiff, lines: string[]) => {
  lines.push(bold("MODEL"));

  // Always show the transition
  lines.push(`  ${model.before.model} → ${model.after.model}`);

  // Status line
  if (model.changed) {
    lines.push(`  ${yellow("~ Changed")}`);
  } else {
    lines.push(`  ${green("✓ Unchanged")}`);
  }

  lines.push("");
};

const truncate = (s: string, max = 100) => {
  const clean = s.replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max) + "…" : clean;
};

const renderPrompts = (
  prompts: T.PromptDiff,
  lines: string[],
  labels: { a: string; b: string } = { a: "A", b: "B" },
) => {
  lines.push(bold("PROMPTS"));

  const getFirstPromptText = (ps: T.Prompt[]) =>
    ps.find((p) => p.role === "user")?.content ?? ps[0]?.content ?? "";

  const aPrompt = getFirstPromptText(prompts.removed ?? []);
  const bPrompt = getFirstPromptText(prompts.added ?? []);

  if (aPrompt)
    lines.push(`  ${labels.a}: ${truncate(aPrompt.replace(/\n/g, " "))}`);
  if (bPrompt)
    lines.push(`  ${labels.b}: ${truncate(bPrompt.replace(/\n/g, " "))}`);

  lines.push(
    `  ${green("+ Added:")}   ${prompts.added.length}`,
    `  ${red("- Removed:")} ${prompts.removed.length}`,
    `  = Same:    ${prompts.unchanged.length}`,
    "",
  );
};

const renderPlanning = (
  planning: T.PlanningDiff,
  lines: string[],
  labels: { a: string; b: string } = { a: "A", b: "B" },
) => {
  lines.push(bold("PLANNING"));

  const truncate = (s: string, max = 100) => {
    const clean = s.replace(/\s+/g, " ").trim();
    return clean.length > max ? clean.slice(0, max) + "…" : clean;
  };

  const renderSteps = (label: string, steps: T.PlanSteps) => {
    lines.push(`  ${label}:`);
    if (steps.length === 0) {
      lines.push(`     (no steps)`);
      return;
    }
    for (const step of steps) {
      lines.push(`     - ${truncate(step.text)}`);
    }
  };

  // Per-model steps
  renderSteps(labels.a, planning.removed ?? []);
  renderSteps(labels.b, planning.added ?? []);

  // Diff summary
  lines.push(
    `  + Steps added:   ${planning.added.length}`,
    `  - Steps removed: ${planning.removed.length}`,
    `  = Unchanged:     ${planning.unchanged.length}`,
    `  Similarity:      ${
      planning.similarity === null ? "N/A" : planning.similarity.toFixed(2)
    }`,
    "",
  );
};

const renderTools = (
  tools: T.ToolDiff,
  lines: string[],
  limit: number,
  labels: { a: string; b: string } = { a: "A", b: "B" },
  beforeUniqueTools: string[] = [],
  afterUniqueTools: string[] = [],
) => {
  lines.push(bold("TOOLS"));

  const renderList = (label: string, list: string[]) => {
    lines.push(`  ${label} (unique tools):`);
    if (!list || list.length === 0) {
      lines.push(`     (no tools)`);
      return;
    }
    for (const t of list.slice(0, limit)) {
      lines.push(`     - ${t}`);
    }
    if (list.length > limit) {
      lines.push(`     … (${list.length - limit} more)`);
    }
  };

  // Per-model unique tool lists
  renderList(labels.a, beforeUniqueTools);
  renderList(labels.b, afterUniqueTools);

  // Existing summary
  lines.push(`  Calls: ${tools.before.totalCalls} → ${tools.after.totalCalls}`);

  if (tools.addedTools.length > 0)
    lines.push(`  ${green("+ Added tools:")}   ${tools.addedTools.join(", ")}`);

  if (tools.removedTools.length > 0)
    lines.push(`  ${red("- Removed tools:")} ${tools.removedTools.join(", ")}`);

  if (tools.addedTools.length === 0 && tools.removedTools.length === 0)
    lines.push(`  = Tool set unchanged`);

  lines.push("");
};

const renderOutcome = (
  outcome: T.OutcomeDiff,
  lines: string[],
  labels: { a: string; b: string } = { a: "A", b: "B" },
) => {
  lines.push(bold("OUTCOME"));

  const fmtStatus = (s: string) =>
    s === "success" ? green("✓ Successful") : red("✗ Failed");

  const fmtLine = (label: string, o: T.Outcome) => {
    const status = fmtStatus(o.status);
    const reason = o.reason ? ` (reason: ${o.reason})` : "";
    const source = o.source ? ` (source: ${o.source})` : "";
    lines.push(`  ${label}: ${status}${reason}${source}`);
  };

  // Show each outcome explicitly
  fmtLine(labels.a, outcome.before);
  fmtLine(labels.b, outcome.after);

  // Result at the bottom
  if (!outcome.changed) {
    lines.push(`  Result: ${green("✓ Unchanged")}`, "");
    return;
  }

  lines.push(`  Result: ${red("✗ Changed")}`);
  lines.push(`    ${outcome.before.status} → ${outcome.after.status}`);

  if (outcome.before.reason || outcome.after.reason) {
    lines.push(
      `    reason: "${outcome.before.reason ?? ""}" → "${outcome.after.reason ?? ""}"`,
    );
  }

  if (outcome.before.source || outcome.after.source) {
    lines.push(
      `    source: "${outcome.before.source ?? "unknown"}" → "${outcome.after.source ?? "unknown"}"`,
    );
  }

  lines.push("");
};

export default renderDiffs;
