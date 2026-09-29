import { describe, expect, it } from "vitest";
import { PROMPT_MAX_LENGTH, isValidTaskId, validatePrompt } from "./validation";

describe("validatePrompt", () => {
  it("accepts a normal prompt and trims it", () => {
    const result = validatePrompt("  a treasure chest  ");
    expect(result).toEqual({ ok: true, prompt: "a treasure chest" });
  });

  it("accepts a prompt at the exact max length", () => {
    const result = validatePrompt("x".repeat(PROMPT_MAX_LENGTH));
    expect(result.ok).toBe(true);
  });

  it("rejects non-string values", () => {
    for (const value of [undefined, null, 42, {}, ["a cat"]]) {
      const result = validatePrompt(value);
      expect(result.ok).toBe(false);
    }
  });

  it("rejects empty and whitespace-only prompts", () => {
    expect(validatePrompt("").ok).toBe(false);
    expect(validatePrompt("   \n\t ").ok).toBe(false);
  });

  it("rejects prompts over the max length", () => {
    const result = validatePrompt("x".repeat(PROMPT_MAX_LENGTH + 1));
    expect(result).toMatchObject({ ok: false });
  });
});

describe("isValidTaskId", () => {
  it("accepts Tripo-style task ids", () => {
    expect(isValidTaskId("task_abc123")).toBe(true);
    expect(isValidTaskId("task_aB3-_456")).toBe(true);
  });

  it("rejects malformed or malicious values", () => {
    for (const value of [
      "",
      "abc123",
      "task_",
      "task_../../etc/passwd",
      "task_has space",
      "other_abc",
      42,
      null,
      undefined,
      { taskId: "task_x" },
    ]) {
      expect(isValidTaskId(value)).toBe(false);
    }
  });
});
