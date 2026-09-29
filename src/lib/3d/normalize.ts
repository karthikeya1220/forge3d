import * as THREE from "three";

/** Normalized models are scaled so their largest dimension equals this (world units). */
export const TARGET_SIZE = 2;

export interface FitTransform {
  scale: number;
  /** Offset to apply to the object so it sits centered on X/Z with its base at Y=0. */
  offset: [number, number, number];
}

/**
 * Compute a uniform scale + offset that centers a bounding box on X/Z and rests
 * its lowest point on Y=0, scaling the largest dimension to TARGET_SIZE.
 */
export function fitTransform(box: THREE.Box3): FitTransform {
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = Number.isFinite(maxDim) && maxDim > 0 ? TARGET_SIZE / maxDim : 1;
  const center = box.getCenter(new THREE.Vector3());
  return {
    scale,
    offset: [-center.x * scale, -box.min.y * scale, -center.z * scale],
  };
}
