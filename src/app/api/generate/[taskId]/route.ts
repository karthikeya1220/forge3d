import { errorResponse } from "@/lib/3d-generation/http";
import { getProvider, isValidTaskId } from "@/lib/3d-generation";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/generate/[taskId]">,
) {
  const { taskId } = await context.params;

  if (!isValidTaskId(taskId)) {
    return Response.json(
      { status: "failed", error: { code: "not_found", message: "Unknown generation task." } },
      { status: 404 },
    );
  }

  try {
    const task = await getProvider().getStatus(taskId);

    if (task.phase === "generating") {
      return Response.json(
        { status: "generating", progress: task.progress },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    if (task.phase === "failed") {
      return Response.json(
        { status: "failed", error: task.error },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    // Success: stream the GLB immediately — provider URLs expire within minutes,
    // and streaming sidesteps Vercel's 4.5MB response limit.
    const upstream = await getProvider().openModelStream(task.modelUrl!);
    return new Response(upstream.body, {
      headers: {
        "Content-Type": "model/gltf-binary",
        "Content-Disposition": 'attachment; filename="forge3d-model.glb"',
        "Cache-Control": "no-store",
        "X-Model-Format": "glb",
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
