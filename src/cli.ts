import diffTraces from "./diff";
import renderDiffs from "./render";
import type { AgentTrace } from "./types";
import { captureTrace } from "./adapters/opencode/capture";

const usage = () => {
  console.log(`Usage:
  drift capture --agent <name> --message "<prompt>" [--model provider/model] [--out trace.json]
  drift diff <traceA.json> <traceB.json> [--json]

Examples:
  drift capture --agent opencode --message "Fix the failing tests" --model openai/gpt-4.1 --out run-a.json
  drift diff run-a.json run-b.json
`);
  process.exit(1);
};

const args = Bun.argv.slice(2);
if (args.length === 0) usage();

const cmd = args[0];

//TODO: refactor this to be more robust
const main = async () => {
  if (cmd === "diff") {
    const aPath = args[1];
    const bPath = args[2];
    if (!aPath || !bPath) usage();

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
    const getFlag = (name: string): string | undefined => {
      const i = args.indexOf(name);
      if (i === -1) return undefined;
      return args[i + 1];
    };

    const agent = getFlag("--agent");
    const message = getFlag("--message");
    if (!agent || !message) usage();

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

  usage();
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
