// URL-as-complete-state: every design is fully specified by (seed, params)
// serialized in the query string.

export interface UrlParams {
  seed: number;
  gridSize: number;
  weaveDensity: number;
  turnBias: number;
}

const DEFAULTS = {
  gridSize: 12,
  weaveDensity: 0.35,
  turnBias: 0.7,
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
  };
}

export function writeParams(params: UrlParams): void {
  const query = new URLSearchParams();
  query.set("seed", String(params.seed));
  query.set("gs", String(params.gridSize));
  query.set("wd", String(params.weaveDensity));
  query.set("tb", String(params.turnBias));
  history.replaceState(null, "", `?${query.toString()}`);
}
