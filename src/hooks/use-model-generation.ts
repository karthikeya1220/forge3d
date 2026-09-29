"use client";

import { useEffect, useRef, useState } from "react";
import { modelFileName } from "@/lib/filename";

export type GenerationState =
  | { phase: "idle" }
  | { phase: "generating" }
  | { phase: "success"; modelUrl: string; prompt: string }
  | { phase: "failed"; message: string };

const POLL_INTERVAL_MS = 1_800;
const MAX_WAIT_MS = 5 * 60_000;
const MAX_CONSECUTIVE_POLL_FAILURES = 5;

const GENERIC_FAILURE = "3D generation failed. Please try again.";

export interface UseModelGeneration {
  state: GenerationState;
  /** True while a submission or poll is in flight. */
  isGenerating: boolean;
  /** Filename for the current model, e.g. forge3d-treasure-chest.glb */
  downloadName: string | null;
  submit: (prompt: string) => Promise<void>;
  retry: () => Promise<void>;
  reset: () => void;
  /** Called when the viewer fails to load the generated model. */
  reportLoadError: () => void;
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function useModelGeneration(): UseModelGeneration {
  const [state, setState] = useState<GenerationState>({ phase: "idle" });
  const runIdRef = useRef(0);
  const objectUrlRef = useRef<string | null>(null);
  const lastPromptRef = useRef<string | null>(null);

  function revokeModel() {
    if (objectUrlRef.current !== null) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }

  // Invalidate any in-flight run and release resources on unmount.
  useEffect(() => {
    return () => {
      runIdRef.current += 1;
      if (objectUrlRef.current !== null) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  async function poll(
    taskId: string,
    prompt: string,
    runId: number,
    startedAt: number,
  ): Promise<void> {
    let consecutiveFailures = 0;

    for (;;) {
      if (runIdRef.current !== runId) return;

      if (Date.now() - startedAt > MAX_WAIT_MS) {
        setState({
          phase: "failed",
          message: "Generation timed out. The model took too long — please try again.",
        });
        return;
      }

      let res: Response;
      try {
        res = await fetch(`/api/generate/${taskId}`, { cache: "no-store" });
      } catch {
        consecutiveFailures += 1;
        if (consecutiveFailures >= MAX_CONSECUTIVE_POLL_FAILURES) {
          setState({
            phase: "failed",
            message: "Connection lost while generating. Check your network and try again.",
          });
          return;
        }
        await delay(POLL_INTERVAL_MS);
        continue;
      }

      if (runIdRef.current !== runId) return;
      consecutiveFailures = 0;

      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("model/gltf-binary")) {
        const blob = await res.blob();
        if (runIdRef.current !== runId) return;
        revokeModel();
        const modelUrl = URL.createObjectURL(blob);
        objectUrlRef.current = modelUrl;
        setState({ phase: "success", modelUrl, prompt });
        return;
      }

      let data: {
        status?: string;
        error?: { code?: string; message?: string };
      } | null = null;
      try {
        data = await res.json();
      } catch {
        // fall through to the failure branch below
      }

      if (res.ok && data?.status === "generating") {
        await delay(POLL_INTERVAL_MS);
        continue;
      }

      setState({
        phase: "failed",
        message: data?.error?.message ?? GENERIC_FAILURE,
      });
      return;
    }
  }

  async function submit(prompt: string): Promise<void> {
    const trimmed = prompt.trim();
    if (trimmed.length === 0) return;

    const runId = ++runIdRef.current;
    revokeModel();
    lastPromptRef.current = trimmed;
    setState({ phase: "generating" });

    let res: Response;
    try {
      res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed }),
      });
    } catch {
      if (runIdRef.current === runId) {
        setState({
          phase: "failed",
          message: "Could not reach the server. Check your connection and try again.",
        });
      }
      return;
    }

    if (runIdRef.current !== runId) return;

    let data: { taskId?: string; error?: { message?: string } } | null = null;
    try {
      data = await res.json();
    } catch {
      // fall through
    }

    if (!res.ok || !data?.taskId) {
      setState({
        phase: "failed",
        message: data?.error?.message ?? GENERIC_FAILURE,
      });
      return;
    }

    await poll(data.taskId, trimmed, runId, Date.now());
  }

  async function retry(): Promise<void> {
    const prompt = lastPromptRef.current;
    if (prompt) await submit(prompt);
  }

  function reset(): void {
    runIdRef.current += 1;
    revokeModel();
    setState({ phase: "idle" });
  }

  function reportLoadError(): void {
    runIdRef.current += 1;
    revokeModel();
    setState({
      phase: "failed",
      message: "The model could not be loaded in the viewer. Try generating again.",
    });
  }

  const downloadName =
    state.phase === "success" ? modelFileName(state.prompt, "glb") : null;

  return {
    state,
    isGenerating: state.phase === "generating",
    downloadName,
    submit,
    retry,
    reset,
    reportLoadError,
  };
}
