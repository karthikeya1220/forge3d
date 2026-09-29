import { ProviderError, type TextTo3DProvider } from "./provider";
import { tripoProvider } from "./providers/tripo";

export * from "./types";
export * from "./provider";
export * from "./validation";

export function getProvider(): TextTo3DProvider {
  const name = process.env.AI_PROVIDER ?? "tripo";
  if (name !== "tripo") {
    throw new ProviderError("unavailable", "3D generation is not configured on this server.");
  }
  return tripoProvider;
}
