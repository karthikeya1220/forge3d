"use client";

import { RotateCcw } from "lucide-react";

export interface ViewerControlsProps {
  onResetCamera: () => void;
}

export function ViewerControls({ onResetCamera }: ViewerControlsProps) {
  return (
    <div className="absolute right-3 top-3 z-10">
      <button
        type="button"
        onClick={onResetCamera}
        aria-label="Reset camera"
        title="Reset camera"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-hairline-strong bg-panel/80 text-muted backdrop-blur transition-colors hover:border-amber/60 hover:text-amber-soft"
      >
        <RotateCcw className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
