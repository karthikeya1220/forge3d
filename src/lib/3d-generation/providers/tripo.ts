import { ProviderError, type TextTo3DProvider } from "../provider";
import type { CreatedGeneration, GenerationTask } from "../types";

const BASE_URL = "https://openapi.tripo3d.ai/v3";
const MODEL_VERSION = "v3.1-20260211";
const FACE_LIMIT = 60_000; // web/mobile sweet spot per Tripo docs; keeps GLB small

interface TripoEnvelope {
  code?: number;
  message?: string;
  suggestion?: string;
  data?: Record<string, unknown>;
}

interface TripoTaskData {
  task_id?: string;
  status?: string;
  progress?: number;
  output?: { model_url?: string; rendered_image_url?: string };
  error_code?: number;
  error_message?: string;
}

const FAILURE_MESSAGES: Record<string, string> = {
  failed: "Generation failed. Please try again.",
  cancelled: "Generation was cancelled.",
  banned: "This prompt was blocked by the content policy. Try rephrasing it.",
  expired: "This generation expired before it could be downloaded. Try again.",
  unknown: "The generator lost track of this task. Please try again.",
};

function getApiKey(): string {
  const key = process.env.TRIPO_API_KEY;
  if (!key) {
    console.error("[tripo] TRIPO_API_KEY is not set");
    throw new ProviderError(
      "unavailable",
      "3D generation is temporarily unavailable. Please try again later.",
    );
  }
  return key;
}

function mapHttpError(status: number, code: number | undefined, message?: string): ProviderError {
  if (status === 429 || code === 1007 || code === 2000) {
    return new ProviderError(
      "rate_limited",
      "Too many requests right now. Wait a moment and try again.",
    );
  }
  if (status === 401 || status === 403) {
    return new ProviderError(
      "unavailable",
      "3D generation is temporarily unavailable. Please try again later.",
    );
  }
  if (code !== undefined && /credit|balance|insufficient/i.test(message ?? "")) {
    return new ProviderError(
      "insufficient_credits",
      "The generator is out of credits. Please try again later.",
    );
  }
  return new ProviderError(
    "unavailable",
    "3D generation is temporarily unavailable. Please try again later.",
  );
}

async function tripoRequest(path: string, init?: RequestInit): Promise<unknown> {
  // Resolve credentials before the try so a config error isn't masked as a network error.
  const authorization = `Bearer ${getApiKey()}`;

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
  } catch (cause) {
    console.error("[tripo] network error:", cause);
    throw new ProviderError(
      "unavailable",
      "Could not reach the 3D generator. Check your connection and try again.",
    );
  }

  let envelope: TripoEnvelope | null = null;
  try {
    envelope = (await res.json()) as TripoEnvelope;
  } catch {
    if (!res.ok) throw mapHttpError(res.status, undefined);
    throw new ProviderError("bad_response", "The 3D generator returned an unexpected response.");
  }

  if (!res.ok || (envelope.code !== undefined && envelope.code !== 0)) {
    throw mapHttpError(res.status, envelope.code, envelope.message);
  }
  return envelope.data;
}

export const tripoProvider: TextTo3DProvider = {
  name: "tripo",

  async createGeneration(prompt: string): Promise<CreatedGeneration> {
    const data = (await tripoRequest("/generation/text-to-model", {
      method: "POST",
      body: JSON.stringify({
        prompt,
        model: MODEL_VERSION,
        texture: true,
        pbr: true,
        face_limit: FACE_LIMIT,
        texture_quality: "standard",
      }),
    })) as { task_id?: string } | null;

    const taskId = data?.task_id;
    if (typeof taskId !== "string" || !taskId.startsWith("task_")) {
      throw new ProviderError("bad_response", "The 3D generator did not accept this prompt.");
    }
    return { taskId, format: "glb" };
  },

  async getStatus(taskId: string): Promise<GenerationTask> {
    const data = (await tripoRequest(`/tasks/${taskId}`)) as TripoTaskData | null;
    if (!data || typeof data.status !== "string") {
      throw new ProviderError("bad_response", "The 3D generator returned an unexpected response.");
    }

    const base: GenerationTask = { taskId, phase: "generating", progress: null };

    switch (data.status) {
      case "queued":
        return { ...base, progress: typeof data.progress === "number" ? data.progress : 0 };
      case "running":
        return {
          ...base,
          progress: typeof data.progress === "number" ? data.progress : null,
        };
      case "success": {
        const modelUrl = data.output?.model_url;
        if (typeof modelUrl !== "string" || modelUrl.length === 0) {
          throw new ProviderError("bad_response", "The generated model could not be retrieved.");
        }
        return { ...base, phase: "success", modelUrl };
      }
      default:
        return {
          ...base,
          phase: "failed",
          error: {
            code: data.status,
            message: FAILURE_MESSAGES[data.status] ?? "Generation failed. Please try again.",
          },
        };
    }
  },

  async openModelStream(modelUrl: string): Promise<Response> {
    let res: Response;
    try {
      res = await fetch(modelUrl, { cache: "no-store" });
    } catch (cause) {
      throw new ProviderError("failed", "Could not download the generated model. Try generating again.", { cause });
    }
    if (!res.ok) {
      throw new ProviderError(
        "failed",
        "The generated model link expired. Please generate again.",
      );
    }
    return res;
  },
};
