export const PROMPT_MAX_LENGTH = 500;
const TASK_ID_PATTERN = /^task_[A-Za-z0-9_-]+$/;

export type PromptValidation =
  | { ok: true; prompt: string }
  | { ok: false; message: string };

export function validatePrompt(raw: unknown): PromptValidation {
  if (typeof raw !== "string") {
    return { ok: false, message: "Prompt must be a string." };
  }
  const prompt = raw.trim();
  if (prompt.length === 0) {
    return { ok: false, message: "Prompt cannot be empty." };
  }
  if (prompt.length > PROMPT_MAX_LENGTH) {
    return {
      ok: false,
      message: `Prompt must be ${PROMPT_MAX_LENGTH} characters or fewer.`,
    };
  }
  return { ok: true, prompt };
}

/** Tripo-style ids: task_<alphanumeric>. Also guards the status route from open-proxy misuse. */
export function isValidTaskId(value: unknown): value is string {
  return typeof value === "string" && TASK_ID_PATTERN.test(value);
}
