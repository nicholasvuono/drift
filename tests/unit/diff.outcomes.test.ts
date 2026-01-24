import { expect, test, describe } from "bun:test";
import { baseTrace } from "../fixtures";
import diffTraces from "@src/diff";

describe("[diffTraces()]: outcome diffs", () => {
  test("success → success is not a change", () => {
    const a = baseTrace({
      trace_id: "a",
      outcome: { status: "success" },
    });

    const b = baseTrace({
      trace_id: "b",
      outcome: { status: "success" },
    });

    const diff = diffTraces(a, b);
    expect(diff.outcome.changed).toBe(false);
  });

  test("success → failure is a change", () => {
    const a = baseTrace({
      trace_id: "a",
      outcome: { status: "success" },
    });

    const b = baseTrace({
      trace_id: "b",
      outcome: {
        status: "failure",
        reason: "Tests failed",
      },
    });

    const diff = diffTraces(a, b);
    expect(diff.outcome.changed).toBe(true);
    expect(diff.outcome.before.status).toBe("success");
    expect(diff.outcome.after.status).toBe("failure");
  });

  test("failure → success is a change", () => {
    const a = baseTrace({
      trace_id: "a",
      outcome: {
        status: "failure",
        reason: "Lint errors",
      },
    });

    const b = baseTrace({
      trace_id: "b",
      outcome: { status: "success" },
    });

    const diff = diffTraces(a, b);
    expect(diff.outcome.changed).toBe(true);
  });

  test("same status, different reason is a change", () => {
    const a = baseTrace({
      trace_id: "a",
      outcome: {
        status: "failure",
        reason: "Timeout",
      },
    });

    const b = baseTrace({
      trace_id: "b",
      outcome: {
        status: "failure",
        reason: "Permission denied",
      },
    });

    const diff = diffTraces(a, b);
    expect(diff.outcome.changed).toBe(true);
  });

  test("identical outcome including reason is unchanged", () => {
    const a = baseTrace({
      trace_id: "a",
      outcome: {
        status: "partial",
        reason: "Some tests skipped",
      },
    });

    const b = baseTrace({
      trace_id: "b",
      outcome: {
        status: "partial",
        reason: "Some tests skipped",
      },
    });

    const diff = diffTraces(a, b);
    expect(diff.outcome.changed).toBe(false);
  });
});
