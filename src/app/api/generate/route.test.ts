import { beforeEach, describe, expect, it, vi } from "vitest";
import { getProvider } from "@/lib/3d-generation";
import { ProviderError, type TextTo3DProvider } from "@/lib/3d-generation/provider";
import { POST } from "./route";

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

function post(body: string): Request {
  return new Request("http://localhost/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

beforeEach(() => {
  vi.mocked(getProvider).mockReturnValue(provider);
  vi.mocked(provider.createGeneration).mockReset();
});

describe("POST /api/generate", () => {
  it("rejects a malformed JSON body", async () => {
    const res = await POST(post("not-json"));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: { code: "invalid_json" } });
  });

  it("rejects a missing prompt", async () => {
    const res = await POST(post(JSON.stringify({})));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("invalid_prompt");
  });

  it("rejects an empty prompt", async () => {
    const res = await POST(post(JSON.stringify({ prompt: "   " })));
    expect(res.status).toBe(400);
  });

  it("creates a generation and returns the task id", async () => {
    vi.mocked(provider.createGeneration).mockResolvedValue({
      taskId: "task_abc123",
      format: "glb",
    });

    const res = await POST(post(JSON.stringify({ prompt: "  a treasure chest  " })));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      success: true,
      taskId: "task_abc123",
      format: "glb",
    });
    expect(provider.createGeneration).toHaveBeenCalledWith(
      "a treasure chest",
      undefined,
    );
  });

  it("forwards a visitor's x-api-key header to the provider", async () => {
    vi.mocked(provider.createGeneration).mockResolvedValue({
      taskId: "task_abc123",
      format: "glb",
    });

    const res = await POST(
      new Request("http://localhost/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "tsk_visitor_key_1234567890",
        },
        body: JSON.stringify({ prompt: "a cat" }),
      }),
    );

    expect(res.status).toBe(200);
    expect(provider.createGeneration).toHaveBeenCalledWith(
      "a cat",
      "tsk_visitor_key_1234567890",
    );
  });

  it("rejects a malformed visitor key with 400 and never echoes it", async () => {
    const res = await POST(
      new Request("http://localhost/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "not-a-tripo-key",
        },
        body: JSON.stringify({ prompt: "a cat" }),
      }),
    );

    expect(res.status).toBe(400);
    const text = JSON.stringify(await res.json());
    expect(text).toContain("invalid_api_key");
    expect(text).not.toContain("not-a-tripo-key");
    expect(provider.createGeneration).not.toHaveBeenCalled();
  });

  it("maps provider rate limiting to HTTP 429", async () => {
    vi.mocked(provider.createGeneration).mockRejectedValue(
      new ProviderError("rate_limited", "Too many requests right now. Wait a moment and try again."),
    );

    const res = await POST(post(JSON.stringify({ prompt: "a cat" })));

    expect(res.status).toBe(429);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe("rate_limited");
    expect(body.error.message).toMatch(/too many requests/i);
  });

  it("returns a generic message for unexpected errors", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(provider.createGeneration).mockRejectedValue(
      new Error("secret internal detail with stack"),
    );

    const res = await POST(post(JSON.stringify({ prompt: "a cat" })));

    expect(res.status).toBe(500);
    const text = JSON.stringify(await res.json());
    expect(text).not.toContain("secret internal detail");
    expect(text).toMatch(/something went wrong/i);
    consoleSpy.mockRestore();
  });
});
