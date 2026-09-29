import { describe, expect, it } from "vitest";
import { modelFileName, slugify } from "./filename";

describe("slugify", () => {
  it("lowercases and hyphenates words", () => {
    expect(slugify("A Low Poly Treasure Chest")).toBe("a-low-poly-treasure-chest");
  });

  it("collapses punctuation and whitespace", () => {
    expect(slugify("  Hello,   world!!  ")).toBe("hello-world");
  });

  it("strips diacritics", () => {
    expect(slugify("café RÜCKE")).toBe("cafe-rucke");
  });

  it("falls back to 'model' when nothing survives", () => {
    expect(slugify("***")).toBe("model");
    expect(slugify("   ")).toBe("model");
  });

  it("caps the length at 64 characters without a trailing hyphen", () => {
    const slug = slugify("x".repeat(200));
    expect(slug.length).toBeLessThanOrEqual(64);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("modelFileName", () => {
  it("produces a forge3d-prefixed GLB name", () => {
    expect(modelFileName("A friendly robot")).toBe("forge3d-a-friendly-robot.glb");
  });

  it("uses the provided format", () => {
    expect(modelFileName("A cat", "glb")).toBe("forge3d-a-cat.glb");
  });

  it("strips path traversal from a hostile format", () => {
    expect(modelFileName("A cat", "../../evil")).toBe("forge3d-a-cat.evil");
    expect(modelFileName("A cat", "glb/x")).toBe("forge3d-a-cat.glbx");
  });
});
