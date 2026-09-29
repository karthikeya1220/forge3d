import { beforeEach, describe, expect, it, vi } from "vitest";
import { getProvider } from "@/lib/3d-generation";
import { ProviderError, type TextTo3DProvider } from "@/lib/3d-generation/provider";
import type { GenerationTask } from "@/lib/3d-generation/types";
import { GET } from "./route";

vi.mock("@/lib/3d-generation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/3d-generation")>();
  return { ...actual, getProvider: vi.fn() };
});

const provider: TextTo3DProvider = {
  name: "stub",
  createGeneration: vi.fn(),
  getStatus: vi.fn(),
  openModelStream: vi.fn(),
};

function context(taskId: string) {
  return { params: Promise.resolve({ taskId }) } as Parameters<typeof GET>[1];
}

function get(taskId: string): Promise<Response> {
  return GET(new Request(`http://localhost/api/generate/${taskId}`), context(taskId));
}

beforeEach(() => {
  vi.mocked(getProvider).mockReturnValue(provider);
  vi.mocked(provider.getStatus).mockReset();
  vi.mocked(provider.openModelStream).mockReset();
});

describe("GET /api/generate/[taskId]", () => {
  it("404s on a malformed task id (no open proxying)", async () => {
    const res = await get("../../etc/passwd");
    expect(res.status).toBe(404);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe("failed");
    expect(provider.getStatus).not.toHaveBeenCalled();
  });

  it("returns JSON while generating", async () => {
    const task: GenerationTask = {
      taskId: "task_abc",
      phase: "generating",
      progress: 42,
    };
    vi.mocked(provider.getStatus).mockResolvedValue(task);

    const res = await get("task_abc");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(await res.json()).toEqual({ status: "generating", progress: 42 });
  });

  it("returns a failed status with a friendly message", async () => {
    vi.mocked(provider.getStatus).mockResolvedValue({
      taskId: "task_abc",
      phase: "failed",
      progress: null,
      error: { code: "banned", message: "This prompt was blocked by the content policy." },
    });

    const res = await get("task_abc");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; error: { message: string } };
    expect(body.status).toBe("failed");
    expect(body.error.message).toMatch(/blocked/i);
  });

  it("streams GLB bytes with the right content type on success", async () => {
    const bytes = new Uint8Array([0x67, 0x6c, 0x54, 0x46]); // glTF magic
    vi.mocked(provider.getStatus).mockResolvedValue({
      taskId: "task_abc",
      phase: "success",
      progress: null,
      modelUrl: "https://cdn.example.com/model.glb",
    });
    vi.mocked(provider.openModelStream).mockResolvedValue(
      new Response(bytes, { headers: { "Content-Type": "model/gltf-binary" } }),
    );

    const res = await get("task_abc");

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("model/gltf-binary");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(bytes);
    expect(provider.openModelStream).toHaveBeenCalledWith("https://cdn.example.com/model.glb");
  });

  it("maps provider errors to safe JSON error responses", async () => {
    vi.mocked(provider.getStatus).mockRejectedValue(
      new ProviderError("unavailable", "3D generation is temporarily unavailable. Please try again later."),
    );

    const res = await get("task_abc");
    expect(res.status).toBe(503);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe("unavailable");
    expect(body.error.message).toMatch(/temporarily unavailable/i);
  });
});
