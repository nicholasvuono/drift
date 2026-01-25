import { expect, test, describe } from "bun:test";
import diffTraces from "@src/diff";
import renderDiff from "@src/render";
import { baseTrace } from "../fixtures";

describe("[CLI]: diff renderer (snapshot)", () => {
  test("renders a full diff correctly", () => {
    const traceA = baseTrace({
      traceId: "trace-a",
      model: {
        provider: "anthropic",
        model: "claude-3.5-sonnet",
        temperature: 0.2,
      },
      prompts: [
        {
          id: "p1",
          role: "system",
          content: "You are a helpful agent",
          order: 1,
        },
        { id: "p2", role: "user", content: "Fix the failing tests", order: 2 },
      ],
      planning: [
        { index: 1, text: "Inspect failing tests" },
        { index: 2, text: "Apply fix" },
      ],
      toolCalls: [
        {
          id: "t1",
          toolName: "read_file",
          args: { path: "test.spec.ts" },
          startTime: "2026-01-01T00:00:00Z",
          endTime: "2026-01-01T00:00:01Z",
        },
        {
          id: "t2",
          toolName: "search_repo",
          args: { query: "foo" },
          startTime: "2026-01-01T00:00:02Z",
          endTime: "2026-01-01T00:00:03Z",
        },
      ],
      outcome: { status: "success", reason: "All tests passing" },
    });

    const traceB = baseTrace({
      traceId: "trace-b",
      model: {
        provider: "openai",
        model: "gpt-4.1",
        temperature: 0.7,
      },
      prompts: [
        {
          id: "p1",
          role: "system",
          content: "You are a helpful agent",
          order: 1,
        },
        { id: "p3", role: "developer", content: "Be concise", order: 2 },
      ],
      planning: [{ index: 1, text: "Inspect failing tests" }],
      toolCalls: [
        {
          id: "t3",
          toolName: "read_file",
          args: { path: "test.spec.ts" },
          startTime: "2026-01-01T00:00:00Z",
          endTime: "2026-01-01T00:00:01Z",
        },
      ],
      outcome: { status: "failure", reason: "Lint error" },
    });

    const diff = diffTraces(traceA, traceB);
    const output = renderDiff(diff, {});

    expect(output).toMatchSnapshot();
  });
});
