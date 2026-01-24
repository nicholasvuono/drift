import diffTraces from "./diff";
import renderDiffs from "./render";
import type { AgentTrace } from "./types";

const usage = () => {
  console.log("Usage: node dist/cli.js <traceA.json> <traceB.json>");
  process.exit(1);
};

const args = Bun.argv;
if (args.length < 2) usage();

const [aPath, bPath]: string[] = args;

const a: AgentTrace = await Bun.file(aPath!).json();
const b: AgentTrace = await Bun.file(bPath!).json();

const diff = diffTraces(a, b);
console.write(renderDiffs(diff));
