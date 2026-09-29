import { ProviderError } from "./provider";

export interface ApiErrorBody {
  error: { code: string; message: string };
}

export function jsonError(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } } satisfies ApiErrorBody, { status });
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
