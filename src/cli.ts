import diffTraces from "./diff";
import renderDiffs from "./render";
import type { AgentTrace } from "./types";
import { captureTrace } from "./adapters/opencode/capture";

const renderBanner = () => {
  const blue = "\x1b[38;5;39m"; // cyan/blue
  const reset = "\x1b[0m";

  console.log(`
${blue}
╭───────────────────────────────────────────────────────╮
│                                                       │
│                    🦋 drift                           │
│                                                       │
╰───────────────────────────────────────────────────────╯
${reset}
`);
};

const usage = (exitCode = 1) => {
  renderBanner();
  console.log(`Usage:
  drift <command> [options]

Commands:
  capture   Capture an agent run into a trace JSON
  diff      Diff two traces
  help      Show this help

Options:
  -h, --help       Show help
  -v, --version    Show version

Capture:
  drift capture --agent <name> --message "<prompt>" [--model provider/model] [--out trace.json]

Diff:
  drift diff <traceA.json> <traceB.json> [--json]

Examples:
  drift capture --agent opencode --message "Fix the failing tests" --model openai/gpt-4.1 --out run-a.json
  drift diff run-a.json run-b.json
`);
  process.exit(exitCode);
};

const version = async (): Promise<string> => {
  try {
    const pkgUrl = new URL("../package.json", import.meta.url);
    const pkg = (await Bun.file(pkgUrl).json()) as { version?: string };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
};

const args = Bun.argv.slice(2);
if (args.length === 0) usage(1);

// Global flags
if (args.includes("-h") || args.includes("--help") || args[0] === "help") {
  usage(0);
}

if (
  args.includes("-v") ||
  args.includes("--version") ||
  args[0] === "version"
) {
  console.log(await version());
  process.exit(0);
}

const cmd = args[0];

//TODO: refactor this to be more robust
const main = async () => {
  renderBanner();
  if (cmd === "diff") {
    if (args.includes("-h") || args.includes("--help")) usage(0);
    const aPath = args[1];
    const bPath = args[2];
    if (!aPath || !bPath) usage(1);

    const json = args.includes("--json");

    const a: AgentTrace = await Bun.file(aPath!).json();
    const b: AgentTrace = await Bun.file(bPath!).json();

    const diff = diffTraces(a, b);
    if (json) {
      console.log(JSON.stringify(diff, null, 2));
    } else {
      console.write(renderDiffs(diff, {}));
    }
    return;
  }

  if (cmd === "capture") {
    if (args.includes("-h") || args.includes("--help")) usage(0);
    const getFlag = (name: string): string | undefined => {
      const i = args.indexOf(name);
      if (i === -1) return undefined;
      return args[i + 1];
    };

    const agent = getFlag("--agent");
    const message = getFlag("--message");
    if (!agent || !message) usage(1);

    const model = getFlag("--model");
    const out = getFlag("--out") ?? "trace.json";

    if (agent === "opencode") {
      const { trace } = await captureTrace({ message: message!, model });
      await Bun.write(out, JSON.stringify(trace, null, 2));
      console.log(`Wrote trace: ${out}`);
      return;
    }

    console.error(`Unknown agent: ${agent}`);
    process.exit(1);
  }

  usage(1);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
