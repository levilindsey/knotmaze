// URL-as-complete-state: every design is fully specified by (seed, params)
// serialized in the query string.

export interface UrlParams {
  seed: number;
  gridSize: number;
  weaveDensity: number;
  turnBias: number;
  slack: number; // [0, 1] rest-state looseness (physics, applies live).
  simSpeed: number; // [0, 10] simulation speed: 0 paused, 5 normal, 10 = 5x.
  drag: number; // [0, 1] wave damping (physics, applies live).
  repulsion: number; // Repulsion distance multiplier (applies live).
  bend: number; // Bending stiffness multiplier (applies live).
  smooth: number; // [0, 1] Laplacian fairing (applies live).
  stiffness: number; // Structural spring multiplier (applies live).
  gridAlign: boolean; // Soft-anchor to lattice positions (applies live).
  threadWidth: number; // Ribbon width in lattice units (applies live).
  gap: number; // Space between an under-thread cut end and the over thread.
}

const DEFAULTS = {
  gridSize: 12,
  weaveDensity: 0.35,
  turnBias: 0.7,
  slack: 0.55,
  simSpeed: 5,
  drag: 0.5,
  repulsion: 1,
  bend: 1,
  smooth: 0.25,
  stiffness: 1,
  threadWidth: 0.42,
  gap: 0.18,
};

export function newSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
}

function readNumber(
  query: URLSearchParams,
  key: string,
  fallback: number
): number {
  const raw = query.get(key);
  if (raw === null) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

export function readParams(): UrlParams {
  const query = new URLSearchParams(window.location.search);
  return {
    seed: Math.floor(readNumber(query, "seed", newSeed())) >>> 0,
    gridSize: readNumber(query, "gs", DEFAULTS.gridSize),
    weaveDensity: readNumber(query, "wd", DEFAULTS.weaveDensity),
    turnBias: readNumber(query, "tb", DEFAULTS.turnBias),
    slack: readNumber(query, "sl", DEFAULTS.slack),
    simSpeed: readNumber(query, "sp", DEFAULTS.simSpeed),
    drag: readNumber(query, "dr", DEFAULTS.drag),
    repulsion: readNumber(query, "rep", DEFAULTS.repulsion),
    bend: readNumber(query, "bd", DEFAULTS.bend),
    smooth: readNumber(query, "sm", DEFAULTS.smooth),
    stiffness: readNumber(query, "st", DEFAULTS.stiffness),
    gridAlign: readNumber(query, "ga", 0) > 0.5,
    threadWidth: readNumber(query, "tw", DEFAULTS.threadWidth),
    gap: readNumber(query, "gap", DEFAULTS.gap),
  };
}

export function writeParams(params: UrlParams): void {
  const query = new URLSearchParams();
  query.set("seed", String(params.seed));
  query.set("gs", String(params.gridSize));
  query.set("wd", String(params.weaveDensity));
  query.set("tb", String(params.turnBias));
  query.set("sl", String(params.slack));
  query.set("sp", String(params.simSpeed));
  query.set("dr", String(params.drag));
  query.set("rep", String(params.repulsion));
  query.set("bd", String(params.bend));
  query.set("sm", String(params.smooth));
  query.set("st", String(params.stiffness));
  query.set("ga", params.gridAlign ? "1" : "0");
  query.set("tw", String(params.threadWidth));
  query.set("gap", String(params.gap));
  history.replaceState(null, "", `?${query.toString()}`);
}
