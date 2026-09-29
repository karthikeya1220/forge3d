import type { CreatedGeneration, GenerationTask } from "./types";

export type ProviderErrorCode =
  | "invalid_prompt"
  | "rate_limited"
  | "insufficient_credits"
  | "timeout"
  | "unavailable"
  | "failed"
  | "bad_response";

const STATUS_BY_CODE: Record<ProviderErrorCode, number> = {
  invalid_prompt: 400,
  rate_limited: 429,
  insufficient_credits: 402,
  timeout: 504,
  unavailable: 503,
  failed: 502,
  bad_response: 502,
};

/** Error carrying a machine code + a user-safe message. Never contains stack traces or secrets. */
export class ProviderError extends Error {
  readonly code: ProviderErrorCode;
  readonly statusCode: number;

  constructor(code: ProviderErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ProviderError";
    this.code = code;
    this.statusCode = STATUS_BY_CODE[code];
  }
}

export interface TextTo3DProvider {
  readonly name: string;
  /** Submit a prompt for generation. Returns a task id the client polls with. */
  createGeneration(prompt: string): Promise<CreatedGeneration>;
  /** Fetch current task state from the provider. */
  getStatus(taskId: string): Promise<GenerationTask>;
  /**
   * Open a streaming passthrough to the finished model file.
   * Providers own this because output URLs may expire quickly or require headers.
   */
  openModelStream(modelUrl: string): Promise<Response>;
}
