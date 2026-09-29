const SLUG_MAX_LENGTH = 64;

/**
 * Turn a natural-language prompt into a filesystem-safe slug.
 * "A low-poly treasure chest!" -> "a-low-poly-treasure-chest"
 */
export function slugify(input: string): string {
  const slug = input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/g, "");

  return slug.length > 0 ? slug : "model";
}

/** Download filename for a generated model, e.g. forge3d-treasure-chest.glb */
export function modelFileName(prompt: string, format: string = "glb"): string {
  const ext = format.replace(/[^a-z0-9]/gi, "").toLowerCase() || "glb";
  return `forge3d-${slugify(prompt)}.${ext}`;
}
