import { expect, test, describe } from "bun:test";
import { baseTrace } from "../fixtures";
import diffTraces from "@src/diff";

describe("[diffTraces()]: tool usage diffs", () => {
  test("identical tool usage is unchanged", () => {
    const tools = [
      {
        id: "t1",
        tool_name: "read_file",
        args: { path: "a.ts" },
        start_time: "2026-01-01T00:00:00Z",
        end_time: "2026-01-01T00:00:01Z",
      },
    ];

    const a = baseTrace({ trace_id: "a", tool_calls: tools });
    const b = baseTrace({ trace_id: "b", tool_calls: tools });

    const diff = diffTraces(a, b);

    expect(diff.tools.added_tools).toHaveLength(0);
    expect(diff.tools.removed_tools).toHaveLength(0);
    expect(diff.tools.before.total_calls).toBe(1);
    expect(diff.tools.after.total_calls).toBe(1);
  });

  test("added tool is detected", () => {
    const a = baseTrace({ trace_id: "a", tool_calls: [] });
    const b = baseTrace({
      trace_id: "b",
      tool_calls: [
        {
          id: "t1",
          tool_name: "read_file",
          args: { path: "a.ts" },
          start_time: "2026-01-01T00:00:00Z",
          end_time: "2026-01-01T00:00:01Z",
        },
      ],
    });

    const diff = diffTraces(a, b);
    expect(diff.tools.added_tools).toContain("read_file");
  });

  test("removed tool is detected", () => {
    const a = baseTrace({
      trace_id: "a",
      tool_calls: [
        {
          id: "t1",
          tool_name: "search_repo",
          args: { query: "foo" },
          start_time: "2026-01-01T00:00:00Z",
          end_time: "2026-01-01T00:00:01Z",
        },
      ],
    });

    const b = baseTrace({ trace_id: "b", tool_calls: [] });

    const diff = diffTraces(a, b);
    expect(diff.tools.removed_tools).toContain("search_repo");
  });

  test("tool call count change is surfaced", () => {
    const a = baseTrace({
      trace_id: "a",
      tool_calls: [
        {
          id: "t1",
          tool_name: "read_file",
          args: {},
          start_time: "2026-01-01T00:00:00Z",
          end_time: "2026-01-01T00:00:01Z",
        },
      ],
    });

    const b = baseTrace({
      trace_id: "b",
      tool_calls: [
        {
          id: "t1",
          tool_name: "read_file",
          args: {},
          start_time: "2026-01-01T00:00:00Z",
          end_time: "2026-01-01T00:00:01Z",
        },
        {
          id: "t2",
          tool_name: "read_file",
          args: {},
          start_time: "2026-01-01T00:00:02Z",
          end_time: "2026-01-01T00:00:03Z",
        },
      ],
    });

    const diff = diffTraces(a, b);
    expect(diff.tools.before.total_calls).toBe(1);
    expect(diff.tools.after.total_calls).toBe(2);
  });

  test("tool order does not affect diff", () => {
    const a = baseTrace({
      trace_id: "a",
      tool_calls: [
        {
          id: "t1",
          tool_name: "read_file",
          args: {},
          start_time: "2026-01-01T00:00:00Z",
          end_time: "2026-01-01T00:00:01Z",
        },
        {
          id: "t2",
          tool_name: "search_repo",
          args: {},
          start_time: "2026-01-01T00:00:02Z",
          end_time: "2026-01-01T00:00:03Z",
        },
      ],
    });

    const b = baseTrace({
      trace_id: "b",
      tool_calls: [
        {
          id: "t3",
          tool_name: "search_repo",
          args: {},
          start_time: "2026-01-01T00:00:00Z",
          end_time: "2026-01-01T00:00:01Z",
        },
        {
          id: "t4",
          tool_name: "read_file",
          args: {},
          start_time: "2026-01-01T00:00:02Z",
          end_time: "2026-01-01T00:00:03Z",
        },
      ],
    });

    const diff = diffTraces(a, b);
    expect(diff.tools.added_tools).toHaveLength(0);
    expect(diff.tools.removed_tools).toHaveLength(0);
  });
});
