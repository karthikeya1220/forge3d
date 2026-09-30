import { ProviderError } from "./provider";
import { validateApiKey } from "./validation";

export interface ApiErrorBody {
  error: { code: string; message: string };
}

export function jsonError(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } } satisfies ApiErrorBody, { status });
}

/**
 * Read the visitor's bring-your-own-key from the `x-api-key` header.
 * Absent → `apiKey: undefined` (provider falls back to the server key).
 * Present → must be well-shaped, otherwise a 400-ready error. The key itself
 * is never logged or echoed back.
 */
export function readRequestApiKey(
  request: Request,
): { ok: true; apiKey?: string } | { ok: false; message: string } {
  const raw = request.headers.get("x-api-key");
  if (raw === null) return { ok: true };
  return validateApiKey(raw);
}

/** Map any thrown error to a safe JSON error response. Never leaks internals. */
export function errorResponse(err: unknown): Response {
  if (err instanceof ProviderError) {
    return jsonError(err.statusCode, err.code, err.message);
  }
  console.error("[api] unhandled generation error:", err);
  return jsonError(
    500,
    "internal",
    "Something went wrong. Please try again.",
  );
}
