import { expect, test, describe } from "bun:test";
import { baseTrace } from "../fixtures";
import diffTraces from "@src/diff";

describe("[diffTraces()]: model & hyperparamater diff tests", () => {
  test("identical model configurations are unchanged", () => {
    const model = {
      provider: "anthropic",
      model: "claude-3.5-sonnet",
      temperature: 0.2,
      maxTokens: 4096,
    };

    const a = baseTrace({ traceId: "a", model });
    const b = baseTrace({ traceId: "b", model });

    const diff = diffTraces(a, b);
    expect(diff.model.changed).toBe(false);
    expect(diff.model.changedFields).toEqual([]);
  });

  test("model name change is detected", () => {
    const a = baseTrace({
      traceId: "a",
      model: {
        provider: "anthropic",
        model: "claude-3.5-sonnet",
      },
    });

    const b = baseTrace({
      traceId: "b",
      model: {
        provider: "anthropic",
        model: "claude-3.5-opus",
      },
    });

    const diff = diffTraces(a, b);
    expect(diff.model.changed).toBe(true);
    expect(diff.model.changedFields).toContain("model");
  });

  test("provider change is detected", () => {
    const a = baseTrace({
      traceId: "a",
      model: {
        provider: "anthropic",
        model: "claude-3.5-sonnet",
      },
    });

    const b = baseTrace({
      traceId: "b",
      model: {
        provider: "openai",
        model: "gpt-4.1",
      },
    });

    const diff = diffTraces(a, b);
    expect(diff.model.changed).toBe(true);
    expect(diff.model.changedFields).toContain("provider");
  });

  test("hyperparameter change is detected (temperature)", () => {
    const a = baseTrace({
      traceId: "a",
      model: {
        provider: "anthropic",
        model: "claude-3.5-sonnet",
        temperature: 0.2,
      },
    });

    const b = baseTrace({
      traceId: "b",
      model: {
        provider: "anthropic",
        model: "claude-3.5-sonnet",
        temperature: 0.7,
      },
    });

    const diff = diffTraces(a, b);
    expect(diff.model.changed).toBe(true);
    expect(diff.model.changedFields).toContain("temperature");
  });

  test("adding a hyperparameter is detected", () => {
    const a = baseTrace({
      traceId: "a",
      model: {
        provider: "anthropic",
        model: "claude-3.5-sonnet",
      },
    });

    const b = baseTrace({
      traceId: "b",
      model: {
        provider: "anthropic",
        model: "claude-3.5-sonnet",
        temperature: 0.4,
      },
    });

    const diff = diffTraces(a, b);
    expect(diff.model.changed).toBe(true);
    expect(diff.model.changedFields).toContain("temperature");
  });

  test("removing a hyperparameter is detected", () => {
    const a = baseTrace({
      traceId: "a",
      model: {
        provider: "anthropic",
        model: "claude-3.5-sonnet",
        maxTokens: 2048,
      },
    });

    const b = baseTrace({
      traceId: "b",
      model: {
        provider: "anthropic",
        model: "claude-3.5-sonnet",
      },
    });

    const diff = diffTraces(a, b);
    expect(diff.model.changed).toBe(true);
    expect(diff.model.changedFields).toContain("maxTokens");
  });

  test("extra provider-specific params are diffed", () => {
    const a = baseTrace({
      traceId: "a",
      model: {
        provider: "anthropic",
        model: "claude-3.5-sonnet",
        extra: {
          thinking: true,
        },
      },
    });

    const b = baseTrace({
      traceId: "b",
      model: {
        provider: "anthropic",
        model: "claude-3.5-sonnet",
        extra: {
          thinking: false,
        },
      },
    });

    const diff = diffTraces(a, b);
    expect(diff.model.changed).toBe(true);
    expect(diff.model.changedFields).toContain("extra");
  });
});
