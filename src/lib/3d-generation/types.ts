export type GenerationPhase = "generating" | "success" | "failed";

export interface CreatedGeneration {
  taskId: string;
  format: "glb";
}

export interface GenerationTask {
  taskId: string;
  phase: GenerationPhase;
  /** 0-100 when the provider reports real progress, otherwise null. */
  progress: number | null;
  /** Present when phase === "success". Expires quickly on some providers. */
  modelUrl?: string;
  error?: { code: string; message: string };
}
