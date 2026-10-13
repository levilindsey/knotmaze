// THE DAILY MAZE (K20): one maze per local calendar day (game/
// daily_calendar.ts numbers them), identical for everyone playing that day.
//
// PINNING. A daily's design never comes from today's PARAM_DEFAULTS - Levi
// edits those mid-day, and a player on a stale tab and one on a fresh load
// would then get different mazes. It comes from a frozen, versioned DAILY
// DEFINITION: a codec version whose defaults ARE the design (codec tables
// are frozen literals, pinned by test/ui/param_codec.test.ts - a default
// change there is a new codec version, and the old table stays forever),
// plus optional overrides, plus a seed derived from the day number. A
// param appended to the codec later reads the default it was introduced
// with (codecDefaults), the same rule every old link follows - and a param
// that shapes the maze must default to its old behavior, or every link
// would move.
//
// TO CHANGE THE DAILY (a new look, harder mazes, new defaults): never edit
// a published definition. Append DAILY_V<n+1> with fromDay at least a few
// days ahead - an already-open tab cannot learn about it, so it would build
// the old design for that day until reloaded.
//
// What can still move a daily: a change to the generation CODE (lattice
// grower, maze plan/apply) - that moves every link too. The golden test in
// test/ui/daily_link.test.ts pins dailies #1-#3's mazes to catch it.
//
// LINKS: `?daily` = today's daily (and it stays `?daily` in the address
// bar - see dailyQuery), `?daily=<n>` = daily n, and `?daily=<n>.<delta>`
// = daily n with changed non-maze params (a delta blob, param_codec.ts
// encodeDelta, measured against the day's pinned design) - so a daily with
// a tweaked look still names its day. Legacy key=value pairs may follow
// (`&am=instant`), as after a token. A change that alters the MAZE
// (sameMaze) leaves the daily: the link becomes a normal token.

import {
  codecDefaults,
  decodeDelta,
  encodeDelta,
  numberText,
} from "./param_codec";
import type { ParamValue } from "./param_codec";
import {
  applyLegacyOverrides,
  impliedParams,
  parseParams,
  paramsFromValues,
} from "./url_state";
import type { UrlParams } from "./url_state";

export interface DailyDefinition {
  // The definition's own version (recorded with every daily result).
  readonly version: number;
  // The first daily number it applies to.
  readonly fromDay: number;
  // The codec version whose defaults are the design...
  readonly codecVersion: number;
  // ...with these params changed on top.
  readonly overrides: Readonly<Record<string, ParamValue>>;
  // Seed derivation: dailySeed(n) = mix32(n + salt).
  readonly salt: number;
}

// V1 (2026-10-12): the v3 default design - the one Levi picked as the
// app's defaults on 2026-10-11 (gs 18 braided fabric, segments colors,
// trace + burn intro, music) - on a seed per day.
export const DAILY_V1: DailyDefinition = Object.freeze({
  version: 1,
  fromDay: 1,
  codecVersion: 3,
  overrides: Object.freeze({}),
  salt: 0x6b6e6f74, // "knot"
});

// Every definition ever published, by fromDay (never edit or drop one).
export const DAILY_DEFINITIONS: readonly DailyDefinition[] = Object.freeze([
  DAILY_V1,
]);

// How far past today a ?daily=<n> link may reach: local dates around the
// world differ by up to two days, so a friend's link may be "tomorrow" here.
export const DAILY_MAX_AHEAD = 2;

export function dailyDefinition(n: number): DailyDefinition {
  let def = DAILY_DEFINITIONS[0];
  for (const d of DAILY_DEFINITIONS) if (d.fromDay <= n) def = d;
  return def;
}

// murmur3's 32-bit finalizer: a fixed, well-mixed bijection.
function mix32(x: number): number {
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return (x ^ (x >>> 16)) >>> 0;
}

export function dailySeed(n: number, def = dailyDefinition(n)): number {
  return mix32((Math.round(n) + def.salt) >>> 0);
}

// Daily n's pinned design (a fresh object).
export function dailyParams(n: number): UrlParams {
  const def = dailyDefinition(n);
  return paramsFromValues(dailySeed(n, def), {
    ...codecDefaults(def.codecVersion),
    ...def.overrides,
  });
}

// The params that decide the MAZE - the walk graph, its start/exit and its
// optimal length: the lattice (seed, size, shape, growth), the anchors and
// every maze-plan knob. Everything else (look, sound, physics, path display,
// camera, fog) leaves the maze as it is. deadEndDensity matters only with
// deadEnds on (main.ts passes 0 otherwise).
export const MAZE_PARAM_KEYS = [
  "seed",
  "mazeFabric",
  "gridSize",
  "shape",
  "startAnchor",
  "exitAnchor",
  "weaveDensity",
  "turnBias",
  "branchDensity",
  "fourWayFraction",
  "deadEnds",
  "deadEndDensity",
  "entranceClearance",
  "exitClearance",
  "junctionSpacing",
] as const satisfies readonly (keyof UrlParams)[];

// A design's maze identity as text (numbers at link precision).
export function mazeKey(p: UrlParams): string {
  return MAZE_PARAM_KEYS.map((k) => {
    if (k === "deadEndDensity" && !p.deadEnds) return "-";
    const v = p[k];
    return typeof v === "number" ? (numberText(v) ?? "NaN") : String(v);
  }).join("|");
}

export function sameMaze(a: UrlParams, b: UrlParams): boolean {
  return mazeKey(a) === mazeKey(b);
}

// The address-bar query for daily n showing `params` (no "?"): `daily=<n>`,
// or `daily=<n>.<delta>` when params differ from the day's pinned design
// (only in non-maze params - a changed maze is no longer the daily). Given
// `today` (main.ts passes it while the player came for TODAY's daily -
// `?daily` or the Daily button - not a numbered one), today's daily as
// published stays plain `daily`: that address keeps meaning "today's
// daily", so a bookmark or home-screen shortcut taken from it does not
// freeze on one day (a reload after midnight brings the new daily, as in
// Wordle). Share links always name the day.
export function dailyQuery(
  n: number,
  params: UrlParams,
  today?: number
): string {
  const delta = encodeDelta(
    params as unknown as Record<string, unknown>,
    dailyParams(n) as unknown as Record<string, unknown>,
    impliedParams(params)
  );
  if (delta !== "") return `daily=${n}.${delta}`;
  return n === today ? "daily" : `daily=${n}`;
}

export interface Launch {
  params: UrlParams;
  // The daily on screen, or null for an ordinary design.
  daily: number | null;
  // The link asked for TODAY's daily (`?daily`, or a number out of range)
  // rather than a numbered day: the address bar may keep saying `?daily`.
  floating: boolean;
}

// What a page load shows: a daily link (`?daily...`, first in the query)
// or anything parseParams reads. `today` = todayNumber(); a daily number
// outside [1, today + DAILY_MAX_AHEAD] (or not a number) loads today's.
export function parseLaunch(search: string, today: number): Launch {
  const query = search.startsWith("?") ? search.slice(1) : search;
  const amp = query.indexOf("&");
  const head = amp < 0 ? query : query.slice(0, amp);
  const m = /^daily(?:=(.*))?$/.exec(head);
  if (!m) return { params: parseParams(search), daily: null, floating: false };
  let value = m[1] ?? "";
  try {
    value = decodeURIComponent(value);
  } catch {
    // A stray "%": read the text as it is (it fails the checks below).
  }
  value = value.replace(/\.+$/, "");
  const dot = value.indexOf(".");
  const numText = dot < 0 ? value : value.slice(0, dot);
  const deltaText = dot < 0 ? "" : value.slice(dot + 1);
  let n = today;
  let floating = true;
  if (numText !== "") {
    const asked = /^\d{1,7}$/.test(numText) ? Number(numText) : NaN;
    if (asked >= 1 && asked <= today + DAILY_MAX_AHEAD) {
      n = asked;
      floating = false;
    } else {
      console.warn(
        `KnotMaze: no daily "${numText}" (dailies run 1-${today + DAILY_MAX_AHEAD}); ` +
          `showing today's, #${today}.`
      );
    }
  }
  const base = dailyParams(n);
  let params = base;
  if (deltaText !== "" && n === Number(numText)) {
    const d = decodeDelta(
      deltaText,
      base as unknown as Record<string, ParamValue>
    );
    if (d.error !== null) {
      console.warn(
        `KnotMaze: unreadable daily settings (${d.error}); showing the daily as published.`
      );
    } else {
      params = paramsFromValues(base.seed, d.values);
    }
  }
  if (amp >= 0) params = applyLegacyOverrides(params, query.slice(amp + 1));
  // An override that changes the maze (`&gs=8`) is no longer the daily.
  if (!sameMaze(params, base)) return { params, daily: null, floating: false };
  return { params, daily: n, floating };
}
