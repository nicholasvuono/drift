import { expect, test, describe } from "bun:test";
import { baseTrace } from "../fixtures";
import diffTraces from "@src/diff";

describe("[diffTraces()]: tool usage diffs", () => {
  test("identical tool usage is unchanged", () => {
    const tools = [
      {
        id: "t1",
        toolName: "read_file",
        args: { path: "a.ts" },
        startTime: "2026-01-01T00:00:00Z",
        endTime: "2026-01-01T00:00:01Z",
      },
    ];

    const a = baseTrace({ traceId: "a", toolCalls: tools });
    const b = baseTrace({ traceId: "b", toolCalls: tools });

    const diff = diffTraces(a, b);

    expect(diff.tools.addedTools).toHaveLength(0);
    expect(diff.tools.removedTools).toHaveLength(0);
    expect(diff.tools.before.totalCalls).toBe(1);
    expect(diff.tools.after.totalCalls).toBe(1);
  });

  test("added tool is detected", () => {
    const a = baseTrace({ traceId: "a", toolCalls: [] });
    const b = baseTrace({
      traceId: "b",
      toolCalls: [
        {
          id: "t1",
          toolName: "read_file",
          args: { path: "a.ts" },
          startTime: "2026-01-01T00:00:00Z",
          endTime: "2026-01-01T00:00:01Z",
        },
      ],
    });

    const diff = diffTraces(a, b);
    expect(diff.tools.addedTools).toContain("read_file");
  });

  test("removed tool is detected", () => {
    const a = baseTrace({
      traceId: "a",
      toolCalls: [
        {
          id: "t1",
          toolName: "search_repo",
          args: { query: "foo" },
          startTime: "2026-01-01T00:00:00Z",
          endTime: "2026-01-01T00:00:01Z",
        },
      ],
    });

    const b = baseTrace({ traceId: "b", toolCalls: [] });

    const diff = diffTraces(a, b);
    expect(diff.tools.removedTools).toContain("search_repo");
  });

  test("tool call count change is surfaced", () => {
    const a = baseTrace({
      traceId: "a",
      toolCalls: [
        {
          id: "t1",
          toolName: "read_file",
          args: {},
          startTime: "2026-01-01T00:00:00Z",
          endTime: "2026-01-01T00:00:01Z",
        },
      ],
    });

    const b = baseTrace({
      traceId: "b",
      toolCalls: [
        {
          id: "t1",
          toolName: "read_file",
          args: {},
          startTime: "2026-01-01T00:00:00Z",
          endTime: "2026-01-01T00:00:01Z",
        },
        {
          id: "t2",
          toolName: "read_file",
          args: {},
          startTime: "2026-01-01T00:00:02Z",
          endTime: "2026-01-01T00:00:03Z",
        },
      ],
    });

    const diff = diffTraces(a, b);
    expect(diff.tools.before.totalCalls).toBe(1);
    expect(diff.tools.after.totalCalls).toBe(2);
  });

  test("tool order does not affect diff", () => {
    const a = baseTrace({
      traceId: "a",
      toolCalls: [
        {
          id: "t1",
          toolName: "read_file",
          args: {},
          startTime: "2026-01-01T00:00:00Z",
          endTime: "2026-01-01T00:00:01Z",
        },
        {
          id: "t2",
          toolName: "search_repo",
          args: {},
          startTime: "2026-01-01T00:00:02Z",
          endTime: "2026-01-01T00:00:03Z",
        },
      ],
    });

    const b = baseTrace({
      traceId: "b",
      toolCalls: [
        {
          id: "t3",
          toolName: "search_repo",
          args: {},
          startTime: "2026-01-01T00:00:00Z",
          endTime: "2026-01-01T00:00:01Z",
        },
        {
          id: "t4",
          toolName: "read_file",
          args: {},
          startTime: "2026-01-01T00:00:02Z",
          endTime: "2026-01-01T00:00:03Z",
        },
      ],
    });

    const diff = diffTraces(a, b);
    expect(diff.tools.addedTools).toHaveLength(0);
    expect(diff.tools.removedTools).toHaveLength(0);
  });
});
