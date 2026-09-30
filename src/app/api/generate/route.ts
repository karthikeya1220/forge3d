import { errorResponse, jsonError, readRequestApiKey } from "@/lib/3d-generation/http";
import { getProvider, validatePrompt } from "@/lib/3d-generation";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "invalid_json", "Request body must be JSON.");
  }

  const parsed = validatePrompt((body as { prompt?: unknown } | null)?.prompt);
  if (!parsed.ok) {
    return jsonError(400, "invalid_prompt", parsed.message);
  }

  const key = readRequestApiKey(request);
  if (!key.ok) {
    return jsonError(400, "invalid_api_key", key.message);
  }

  try {
    const created = await getProvider().createGeneration(parsed.prompt, key.apiKey);
    return Response.json({
      success: true,
      taskId: created.taskId,
      format: created.format,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
