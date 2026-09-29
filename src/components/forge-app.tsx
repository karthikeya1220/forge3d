"use client";

import { Hexagon } from "lucide-react";
import { useCallback, useState } from "react";
import { DownloadButton } from "./download-button";
import { GenerationStatus } from "./generation-status";
import { ModelViewer } from "./model-viewer";
import { PromptPanel } from "./prompt-panel";
import { ViewerControls } from "./viewer-controls";
import { useModelGeneration } from "@/hooks/use-model-generation";

const GITHUB_URL = "https://github.com/karthikeya1220/forge3d";

function GitHubMark() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-4 w-4"
      fill="currentColor"
      aria-hidden
    >
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

export function ForgeApp() {
  const [prompt, setPrompt] = useState("");
  const [resetSignal, setResetSignal] = useState(0);
  const { state, isGenerating, downloadName, submit, retry, reportLoadError } =
    useModelGeneration();

  const modelUrl = state.phase === "success" ? state.modelUrl : null;

  const handleSubmit = useCallback(() => {
    void submit(prompt);
  }, [prompt, submit]);

  const handleClear = useCallback(() => {
    setPrompt("");
  }, []);

  const handleResetCamera = useCallback(() => {
    setResetSignal((signal) => signal + 1);
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-[52px] shrink-0 items-center justify-between border-b border-hairline bg-panel px-4">
        <div className="flex items-baseline gap-2.5">
          <span className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-paper">
            <Hexagon className="h-4 w-4 text-amber" aria-hidden />
            Forge<span className="text-amber">3D</span>
          </span>
          <span className="hidden font-mono text-[11px] text-faint sm:inline">
            text → model → glb
          </span>
        </div>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:text-paper"
        >
          <GitHubMark />
          GitHub
        </a>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[380px_minmax(0,1fr)] lg:overflow-hidden">
        <PromptPanel
          value={prompt}
          onChange={setPrompt}
          onSubmit={handleSubmit}
          onClear={handleClear}
          disabled={isGenerating}
        />

        <section
          aria-label="3D viewport"
          className="relative h-[55vh] min-h-[340px] lg:h-auto"
        >
          <div className="absolute inset-0">
            <ModelViewer
              modelUrl={modelUrl}
              resetSignal={resetSignal}
              onModelError={reportLoadError}
            />
          </div>

          <ViewerControls onResetCamera={handleResetCamera} />

          {state.phase === "idle" && modelUrl === null ? (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
              <span className="rounded-full border border-hairline-strong px-3 py-1 font-mono text-[11px] text-faint">
                viewport idle
              </span>
              <p className="text-sm text-muted">Your model will appear here</p>
              <p className="text-xs text-faint">
                Describe an object on the left, then press Generate
              </p>
            </div>
          ) : null}

          {state.phase === "generating" ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-viewport/70 backdrop-blur-sm">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-hairline-strong border-t-amber" />
              <p className="text-sm text-paper">Forging your model…</p>
              <p className="font-mono text-[11px] text-faint">
                this usually takes 20–60 seconds
              </p>
            </div>
          ) : null}
        </section>
      </main>

      <footer className="flex h-11 shrink-0 items-center justify-between gap-4 border-t border-hairline bg-panel px-4">
        <GenerationStatus state={state} onRetry={() => void retry()} />
        <DownloadButton href={modelUrl} filename={downloadName} />
      </footer>

      <span className="sr-only" aria-live="polite">
        {state.phase === "success" ? "3D model generated successfully" : ""}
      </span>
    </div>
  );
}
