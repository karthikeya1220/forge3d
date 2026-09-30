import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProviderError } from "../provider";
import { tripoProvider } from "./tripo";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const originalKey = process.env.TRIPO_API_KEY;

beforeEach(() => {
  process.env.TRIPO_API_KEY = "test-key";
});

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalKey === undefined) delete process.env.TRIPO_API_KEY;
  else process.env.TRIPO_API_KEY = originalKey;
});

describe("tripoProvider.createGeneration", () => {
  it("submits the prompt and returns the task id", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ code: 0, data: { task_id: "task_abc123" } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await tripoProvider.createGeneration("a treasure chest");

    expect(result).toEqual({ taskId: "task_abc123", format: "glb" });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/generation/text-to-model");
    expect(init.method).toBe("POST");
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer test-key");
    const body = JSON.parse(String(init.body)) as { prompt: string };
    expect(body.prompt).toBe("a treasure chest");
  });

  it("maps rate limiting to a friendly rate_limited error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({ code: 1007, message: "Rate limit exceeded" }, 429),
      ),
    );

    const error = await tripoProvider.createGeneration("a cat").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ProviderError);
    expect((error as ProviderError).code).toBe("rate_limited");
    expect((error as ProviderError).statusCode).toBe(429);
    expect((error as ProviderError).message).not.toMatch(/1007|stack|test-key/);
  });

  it("maps out-of-credits (HTTP 403, code 2010) to insufficient_credits, not generic unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          { code: 2010, message: "You don't have enough credit to create this task" },
          403,
        ),
      ),
    );

    const error = await tripoProvider.createGeneration("a cat").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ProviderError);
    expect((error as ProviderError).code).toBe("insufficient_credits");
    expect((error as ProviderError).statusCode).toBe(402);
    expect((error as ProviderError).message).toMatch(/out of credits/i);
  });

  it("fails cleanly when the API key is missing", async () => {
    delete process.env.TRIPO_API_KEY;
    const error = await tripoProvider.createGeneration("a cat").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ProviderError);
    expect((error as ProviderError).code).toBe("unavailable");
  });

  it("rejects a response without a task id", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ code: 0, data: {} })),
    );
    const error = await tripoProvider.createGeneration("a cat").catch((e: unknown) => e);
    expect((error as ProviderError).code).toBe("bad_response");
  });
});

describe("tripoProvider.getStatus", () => {
  it("normalizes queued and running states", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ code: 0, data: { task_id: "task_x", status: "queued", progress: 0 } }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ code: 0, data: { task_id: "task_x", status: "running", progress: 42 } }),
      );
    vi.stubGlobal("fetch", fetchMock);

    expect(await tripoProvider.getStatus("task_x")).toMatchObject({
      phase: "generating",
      progress: 0,
    });
    expect(await tripoProvider.getStatus("task_x")).toMatchObject({
      phase: "generating",
      progress: 42,
    });
  });

  it("extracts the model url on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          code: 0,
          data: {
            task_id: "task_x",
            status: "success",
            progress: 100,
            output: { model_url: "https://cdn.tripo3d.ai/out/model.glb" },
          },
        }),
      ),
    );

    expect(await tripoProvider.getStatus("task_x")).toMatchObject({
      phase: "success",
      modelUrl: "https://cdn.tripo3d.ai/out/model.glb",
    });
  });

  it("treats success without a model url as a bad response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({ code: 0, data: { task_id: "task_x", status: "success", output: {} } }),
      ),
    );
    const error = await tripoProvider.getStatus("task_x").catch((e: unknown) => e);
    expect((error as ProviderError).code).toBe("bad_response");
  });

  it("maps failure states to friendly messages", async () => {
    const cases: Array<[string, RegExp]> = [
      ["failed", /failed/i],
      ["cancelled", /cancelled/i],
      ["banned", /blocked/i],
      ["expired", /expired/i],
    ];
    for (const [status, pattern] of cases) {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          jsonResponse({ code: 0, data: { task_id: "task_x", status } }),
        ),
      );
      const task = await tripoProvider.getStatus("task_x");
      expect(task.phase).toBe("failed");
      expect(task.error?.message).toMatch(pattern);
      vi.unstubAllGlobals();
    }
  });
});

describe("tripoProvider.openModelStream", () => {
  it("passes through a successful upstream response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(new Uint8Array([1, 2, 3]))),
    );
    const res = await tripoProvider.openModelStream("https://cdn.tripo3d.ai/x.glb");
    expect(res.ok).toBe(true);
  });

  it("reports an expired link when upstream fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("gone", { status: 404 })));
    const error = await tripoProvider
      .openModelStream("https://cdn.tripo3d.ai/x.glb")
      .catch((e: unknown) => e);
    expect((error as ProviderError).code).toBe("failed");
    expect((error as ProviderError).message).toMatch(/expired/i);
  });
});
