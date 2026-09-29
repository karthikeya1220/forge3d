"use client";

import { Eraser, Sparkles } from "lucide-react";
import { EXAMPLE_PROMPTS } from "./example-prompts";
import { PROMPT_MAX_LENGTH } from "@/lib/3d-generation/validation";
import { cn } from "@/lib/utils";

export interface PromptPanelProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  disabled: boolean;
}

export function PromptPanel({
  value,
  onChange,
  onSubmit,
  onClear,
  disabled,
}: PromptPanelProps) {
  const trimmedEmpty = value.trim().length === 0;

  return (
    <section
      aria-label="Prompt"
      className="flex flex-col gap-6 border-b border-hairline bg-panel p-5 lg:border-b-0 lg:border-r lg:overflow-y-auto"
    >
      <div className="flex flex-col gap-1.5">
        <h1 className="text-lg font-semibold tracking-tight text-paper">
          Create your 3D model
        </h1>
        <p className="text-sm leading-relaxed text-muted">
          Describe an object — its shape, material, style. Forge turns it into a
          real, textured GLB you can rotate and download.
        </p>
      </div>

      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!disabled && !trimmedEmpty) onSubmit();
        }}
      >
        <div className="flex items-baseline justify-between">
          <label htmlFor="prompt" className="text-sm font-medium text-paper">
            Prompt
          </label>
          <span
            className={cn(
              "font-mono text-[11px] tabular-nums",
              value.length >= PROMPT_MAX_LENGTH ? "text-danger" : "text-faint",
            )}
          >
            {value.length}/{PROMPT_MAX_LENGTH}
          </span>
        </div>

        <textarea
          id="prompt"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          maxLength={PROMPT_MAX_LENGTH}
          rows={5}
          spellCheck
          placeholder="A weathered bronze telescope on a wooden tripod…"
          className="w-full resize-none rounded-md border border-hairline-strong bg-viewport px-3 py-2.5 text-sm leading-relaxed text-paper placeholder:text-faint focus:border-amber/60 focus:outline-none"
        />

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={disabled || trimmedEmpty}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-amber px-4 py-2.5 text-sm font-semibold text-[#1a0e05] transition-colors",
              "hover:bg-amber-soft disabled:cursor-not-allowed disabled:opacity-40",
            )}
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            {disabled ? "Generating…" : "Generate"}
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={value.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-hairline-strong px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:border-hairline hover:text-paper disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Eraser className="h-4 w-4" aria-hidden />
            Clear
          </button>
        </div>
      </form>

      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-medium text-faint">
          Try one of these
        </span>
        <ul className="flex flex-col gap-1">
          {EXAMPLE_PROMPTS.map((prompt) => (
            <li key={prompt}>
              <button
                type="button"
                onClick={() => onChange(prompt)}
                disabled={disabled}
                className="group flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left text-[13px] text-muted transition-colors hover:bg-panel-raised hover:text-paper disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="truncate">{prompt}</span>
                <span
                  aria-hidden
                  className="shrink-0 font-mono text-[10px] text-faint opacity-0 transition-opacity group-hover:opacity-100"
                >
                  use
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
