export const PROMPT_MAX_LENGTH = 500;
const TASK_ID_PATTERN = /^task_[A-Za-z0-9_-]+$/;
const API_KEY_PATTERN = /^tsk_[A-Za-z0-9_-]{16,}$/;
const API_KEY_MAX_LENGTH = 256;

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

export type ApiKeyValidation =
  | { ok: true; apiKey: string }
  | { ok: false; message: string };

/**
 * Validate a visitor-provided API key (bring-your-own-key mode).
 * Only checks shape so paste mistakes fail fast with a clear message;
 * the provider verifies the key against the upstream API.
 */
export function validateApiKey(raw: unknown): ApiKeyValidation {
  if (typeof raw !== "string") {
    return { ok: false, message: "API key must be a string." };
  }
  const key = raw.trim();
  if (key.length === 0) {
    return { ok: false, message: "API key cannot be empty." };
  }
  if (key.length > API_KEY_MAX_LENGTH) {
    return { ok: false, message: "API key is too long." };
  }
  if (!API_KEY_PATTERN.test(key)) {
    return {
      ok: false,
      message: 'That doesn\'t look like a Tripo API key (they start with "tsk_").',
    };
  }
  return { ok: true, apiKey: key };
}
