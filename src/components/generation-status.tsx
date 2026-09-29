"use client";

import { AlertTriangle, CheckCircle2, CircleDashed, Loader2 } from "lucide-react";
import type { GenerationState } from "@/hooks/use-model-generation";
import { cn } from "@/lib/utils";

export interface GenerationStatusProps {
  state: GenerationState;
  onRetry: () => void;
}

export function GenerationStatus({ state, onRetry }: GenerationStatusProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-w-0 items-center gap-2 text-xs"
    >
      {state.phase === "idle" && (
        <>
          <CircleDashed className="h-3.5 w-3.5 shrink-0 text-faint" aria-hidden />
          <span className="truncate text-faint">Ready — describe an object to begin</span>
        </>
      )}

      {state.phase === "generating" && (
        <>
          <Loader2
            className="h-3.5 w-3.5 shrink-0 animate-spin text-amber"
            aria-hidden
          />
          <span className="truncate text-paper">Generating your 3D model…</span>
        </>
      )}

      {state.phase === "success" && (
        <>
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-ok" aria-hidden />
          <span className="truncate text-ok">Model ready — drag to rotate, scroll to zoom</span>
        </>
      )}

      {state.phase === "failed" && (
        <>
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-danger" aria-hidden />
          <span className="truncate text-danger">{state.message}</span>
          <button
            type="button"
            onClick={onRetry}
            className={cn(
              "ml-1 shrink-0 rounded border border-danger/40 px-2 py-0.5 text-[11px] font-medium",
              "text-danger transition-colors hover:bg-danger/10",
            )}
          >
            Try again
          </button>
        </>
      )}
    </div>
  );
}
