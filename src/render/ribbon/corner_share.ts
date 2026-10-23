// K830: which junction wedges draw rounded, and which keep a sharp
// miter. The choice is made once from build-time arm geometry and then
// addressed by the directed arm pair, so physics settling may move a
// corner but can never flip its style.
//
// Pointiness is the wedge gap: a narrow gap makes the long, pointy
// wedge whose cusp Levi wanted preserved; a broad gap is the blunt
// valley/bend side. At an intermediate share the broadest unpinned
// wedges round first, while the narrowest stay sharp.

import type { CornerPin } from "../../core/types";

export type CornerStyle = "round" | "sharp";

export interface CornerArmRef {
  chain: number;
  slot: number;
  dir: number;
}

export interface CornerCandidate {
  key: string;
  /** Directed wedge angle, radians, in (0, 2π). */
  gap: number;
  pin?: CornerPin;
}

/** Stable directed identity for the wedge leaving arm A toward arm B. */
export function cornerWedgeKey(
  junction: number,
  a: CornerArmRef,
  b: CornerArmRef
): string {
  return `${junction}:${a.chain}:${a.slot}:${a.dir}>${b.chain}:${b.slot}:${b.dir}`;
}

function clampShare(share: number): number {
  return Number.isFinite(share) ? Math.min(1, Math.max(0, share)) : 1;
}

/**
 * Return the keys that draw rounded. The target is a share of every
 * candidate (pins included); builder pins always win, then broad
 * (least pointy) unpinned wedges are rounded until the target is met.
 * Ties use the stable arm-pair key, never frame-dependent geometry.
 */
export function roundedCornerKeys(
  candidates: readonly CornerCandidate[],
  share: number
): ReadonlySet<string> {
  const rounded = new Set<string>();
  for (const candidate of candidates) {
    if (candidate.pin === "round") rounded.add(candidate.key);
  }

  const target = Math.round(clampShare(share) * candidates.length);
  let needed = target - rounded.size;
  if (needed <= 0) return rounded;

  const unpinned = candidates
    .filter((candidate) => candidate.pin === undefined)
    .sort((a, b) => {
      if (b.gap !== a.gap) return b.gap - a.gap;
      return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
    });
  for (const candidate of unpinned) {
    if (needed <= 0) break;
    rounded.add(candidate.key);
    needed--;
  }
  return rounded;
}
