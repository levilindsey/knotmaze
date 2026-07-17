// URL-as-complete-state: every design is fully specified by (seed, params)
// serialized in the query string.

export interface UrlParams {
  seed: number;
  gridSize: number;
  weaveDensity: number;
  turnBias: number;
  slack: number; // [0, 1] rest-state looseness (physics, applies live).
  threadWidth: number; // Ribbon width in lattice units (applies live).
  gap: number; // Space between an under-thread cut end and the over thread.
}

const DEFAULTS = {
  gridSize: 12,
  weaveDensity: 0.35,
  turnBias: 0.7,
  slack: 0.55,
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
  query.set("tw", String(params.threadWidth));
  query.set("gap", String(params.gap));
  history.replaceState(null, "", `?${query.toString()}`);
}
