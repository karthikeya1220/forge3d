"use client";

import { Download } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DownloadButtonProps {
  href: string | null;
  filename: string | null;
}

export function DownloadButton({ href, filename }: DownloadButtonProps) {
  const disabled = href === null || filename === null;

  return (
    <a
      href={disabled ? undefined : href!}
      download={disabled ? undefined : filename!}
      aria-disabled={disabled || undefined}
      onClick={(event) => {
        if (disabled) event.preventDefault();
      }}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-md border border-hairline-strong px-3 py-1.5 text-xs font-medium text-paper transition-colors",
        "hover:border-amber/60 hover:text-amber-soft",
        "disabled:pointer-events-none disabled:opacity-40",
        disabled && "pointer-events-none opacity-40",
      )}
    >
      <Download className="h-3.5 w-3.5" aria-hidden />
      Download GLB
    </a>
  );
}
