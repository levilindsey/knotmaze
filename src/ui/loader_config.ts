// K828: what the loading trefoil wears, as one small record the boot
// script can read before the app bundle exists. The design's own look
// params drive it (gap, threadWidth, pathColor, backgroundBase) plus the
// two loader-only params (loaderSpeed, loaderMove); the app rewrites the
// localStorage mirror on every param application, and the boot script
// reads it at first paint (and takes live updates over the adopted
// handle's setConfig). Pure: the boot bundle and the tests share it.

import type { LoaderMove } from "./url_state";

export type { LoaderMove };

export interface LoaderWireCfg {
  // Lap duration divisor (1 = today's 14 s lap).
  speed: number;
  // "maze": the knot slides/turns under a centered player marker.
  // "head": the knot holds still and the marker travels the strand.
  move: LoaderMove;
  // World units of curve cut either side of an under crossing.
  gapSamples: number;
  threadW: number;
  casingW: number;
  thread: string;
  bg: string;
}

export const LOADER_MIRROR_KEY = "knotmaze.loader";

// Today's loader drawing, reproduced when every driving param is at its
// default: gap 0.04 -> 0.6 curve units, threadWidth 0.52 -> the 0.42
// stroke (casing 0.6), pathColor's gold on backgroundBase's night.
export const LOADER_CFG_DEFAULTS: LoaderWireCfg = {
  speed: 1,
  move: "maze",
  gapSamples: 0.6,
  threadW: 0.42,
  casingW: 0.6,
  thread: "#eccc41",
  bg: "#151b28",
};

const GAP_DEFAULT = 0.04;
const THREAD_WIDTH_DEFAULT = 0.52;

export function loaderCfgFromParams(p: {
  gap: number;
  threadWidth: number;
  pathColor: string;
  backgroundBase: string;
  loaderSpeed: number;
  loaderMove: LoaderMove;
}): LoaderWireCfg {
  const gapScale = Math.min(4, Math.max(0, p.gap / GAP_DEFAULT));
  const threadW = 0.42 * (p.threadWidth / THREAD_WIDTH_DEFAULT);
  return {
    speed: p.loaderSpeed,
    move: p.loaderMove,
    gapSamples: 0.6 * gapScale,
    threadW,
    casingW: threadW * (0.6 / 0.42),
    thread: p.pathColor,
    bg: p.backgroundBase,
  };
}

// The boot script's read: a stored mirror, or the defaults. Never throws
// (a half-written or foreign record just falls back field by field).
export function readLoaderMirror(raw: string | null): LoaderWireCfg {
  if (!raw) return { ...LOADER_CFG_DEFAULTS };
  try {
    const o = JSON.parse(raw) as Partial<LoaderWireCfg>;
    const d = LOADER_CFG_DEFAULTS;
    return {
      speed: typeof o.speed === "number" && o.speed > 0 ? o.speed : d.speed,
      move: o.move === "head" ? "head" : "maze",
      gapSamples:
        typeof o.gapSamples === "number" && o.gapSamples >= 0 ? o.gapSamples : d.gapSamples,
      threadW: typeof o.threadW === "number" && o.threadW > 0 ? o.threadW : d.threadW,
      casingW: typeof o.casingW === "number" && o.casingW > 0 ? o.casingW : d.casingW,
      thread: typeof o.thread === "string" ? o.thread : d.thread,
      bg: typeof o.bg === "string" ? o.bg : d.bg,
    };
  } catch {
    return { ...LOADER_CFG_DEFAULTS };
  }
}

export function writeLoaderMirror(cfg: LoaderWireCfg): void {
  try {
    localStorage.setItem(LOADER_MIRROR_KEY, JSON.stringify(cfg));
  } catch {
    // Storage unavailable: the boot just uses the defaults next load.
  }
}
