import * as T from "./types";

const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;

const renderDiffs = (diff: T.TraceDiff): string => {
  const lines: string[] = [];

  lines.push(
    bold("╭─ Agent Trace Diff ─────────────────────────────────────╮"),
    `│ A: ${diff.traceIdA.padEnd(50)}│`,
    `│ B: ${diff.traceIdB.padEnd(50)}│`,
    bold("╰────────────────────────────────────────────────────────╯"),
    "",
  );

  renderModel(diff.model, lines);
  renderPrompts(diff.prompts, lines);
  renderPlanning(diff.planning, lines);
  renderTools(diff.tools, lines);
  renderOutcome(diff.outcome, lines);

  return lines.join("\n");
};

const renderModel = (model: T.ModelDiff, lines: string[]) => {
  lines.push(bold("MODEL"));

  if (!model.changed) {
    lines.push(`  ${green("= No change")}`, "");
    return;
  }

  lines.push(`  ${yellow("~ Model changed")}`);

  for (const field of model.changedFields) {
    const before = model.before[field];
    const after = model.after[field];
    lines.push(`    ${field}: ${String(before)} → ${String(after)}`);
  }

  lines.push("");
};

const renderPrompts = (prompts: T.PromptDiff, lines: string[]) => {
  lines.push(bold("PROMPTS"));
  lines.push(`  ${green("+ Added:")}   ${prompts.added.length}`);
  lines.push(`  ${red("- Removed:")} ${prompts.removed.length}`);
  lines.push(`  = Same:    ${prompts.unchanged.length}`);
  lines.push("");
};

const renderPlanning = (planning: T.PlanningDiff, lines: string[]) => {
  lines.push(bold("PLANNING"));
  lines.push(`  ${green("+ Steps added:")}   ${planning.added.length}`);
  lines.push(`  ${red("- Steps removed:")} ${planning.removed.length}`);
  lines.push(`  = Unchanged:     ${planning.unchanged.length}`);
  lines.push("");
};

const renderTools = (tools: T.ToolDiff, lines: string[]) => {
  lines.push(bold("TOOLS"));
  lines.push(`  Calls: ${tools.before.totalCalls} → ${tools.after.totalCalls}`);

  if (tools.addedTools.length > 0)
    lines.push(`  ${green("+ Added tools:")}   ${tools.addedTools.join(", ")}`);

  if (tools.removedTools.length > 0)
    lines.push(`  ${red("- Removed tools:")} ${tools.removedTools.join(", ")}`);

  if (tools.addedTools.length === 0 && tools.removedTools.length === 0)
    lines.push(`  = Tool set unchanged`);

  lines.push("");
};

const renderOutcome = (outcome: T.OutcomeDiff, lines: string[]) => {
  lines.push(bold("OUTCOME"));

  if (!outcome.changed) {
    lines.push(`  ${green("✓ Unchanged")}`, "");
    return;
  }

  lines.push(`  ${red("✗ Changed")}`);
  lines.push(`    ${outcome.before.status} → ${outcome.after.status}`);

  if (outcome.before.reason || outcome.after.reason)
    lines.push(
      `    reason: "${outcome.before.reason ?? ""}" → "${outcome.after.reason ?? ""}"`,
    );

  lines.push("");
};

export default renderDiffs;
