import { expect, test, describe } from "bun:test";
import { baseTrace } from "../fixtures";
import diffTraces from "@src/diff";
import type { PromptRole } from "@src/types";

describe("[diffTraces()]: prompt diffs", () => {
  test("identical prompts are unchanged", () => {
    const prompts = [
      {
        id: "p1",
        role: "system" as PromptRole,
        content: "You are a helpful agent",
        order: 1,
      },
    ];

    const a = baseTrace({ traceId: "a", prompts });
    const b = baseTrace({ traceId: "b", prompts });

    const diff = diffTraces(a, b);

    expect(diff.prompts.added).toHaveLength(0);
    expect(diff.prompts.removed).toHaveLength(0);
    expect(diff.prompts.unchanged).toHaveLength(1);
  });

  test("added prompt is detected", () => {
    const a = baseTrace({ traceId: "a", prompts: [] });
    const b = baseTrace({
      traceId: "b",
      prompts: [
        {
          id: "p1",
          role: "system",
          content: "You are a helpful agent",
          order: 1,
        },
      ],
    });

    const diff = diffTraces(a, b);

    expect(diff.prompts.added).toHaveLength(1);
    expect(diff.prompts.added[0]!.id).toBe("p1");
  });

  test("removed prompt is detected", () => {
    const a = baseTrace({
      traceId: "a",
      prompts: [
        {
          id: "p1",
          role: "system",
          content: "You are a helpful agent",
          order: 1,
        },
      ],
    });

    const b = baseTrace({ traceId: "b", prompts: [] });

    const diff = diffTraces(a, b);

    expect(diff.prompts.removed).toHaveLength(1);
    expect(diff.prompts.removed[0]!.id).toBe("p1");
  });

  test("same prompt id with different content is not unchanged", () => {
    const a = baseTrace({
      traceId: "a",
      prompts: [
        {
          id: "p1",
          role: "system",
          content: "Be concise",
          order: 1,
        },
      ],
    });

    const b = baseTrace({
      traceId: "b",
      prompts: [
        {
          id: "p1",
          role: "system",
          content: "Be extremely concise",
          order: 1,
        },
      ],
    });

    const diff = diffTraces(a, b);

    expect(diff.prompts.unchanged).toHaveLength(0);
    expect(diff.prompts.added).toHaveLength(1);
    expect(diff.prompts.removed).toHaveLength(1);
  });

  test("role or order change is treated as change", () => {
    const a = baseTrace({
      traceId: "a",
      prompts: [
        {
          id: "p1",
          role: "system",
          content: "You are a helpful agent",
          order: 1,
        },
      ],
    });

    const b = baseTrace({
      traceId: "b",
      prompts: [
        {
          id: "p1",
          role: "developer",
          content: "You are a helpful agent",
          order: 2,
        },
      ],
    });

    const diff = diffTraces(a, b);
    expect(diff.prompts.unchanged).toHaveLength(0);
  });
});
