"use client";

import dynamic from "next/dynamic";
import type { ModelCanvasProps } from "./model-canvas";

const ModelCanvas = dynamic(() => import("./model-canvas"), {
  ssr: false,
  loading: () => null,
});

/**
 * Client-only entry point: the Three.js canvas never renders on the server.
 */
export function ModelViewer(props: ModelCanvasProps) {
  return <ModelCanvas {...props} />;
}
