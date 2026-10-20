// THE DAILY MAZE (K20): one maze per local calendar day (game/
// daily_calendar.ts numbers them), identical for everyone playing that day.
//
// A daily's design is TODAY's default design (url_state.ts PARAM_DEFAULTS)
// on a seed derived from the day number, plus the player's stored playback
// preferences. Nothing freezes it (K132, 2026-10-14, before launch, dropped
// the versioned daily definitions): a default edit or a change to the
// generation code (lattice grower, maze plan/apply) moves every daily, a
// tab opened before the deploy keeps the old maze until it reloads, and
// K47's walk fingerprint refuses a saved attempt of the old maze
// (game/daily_attempt.ts); results stay. Within one build a day is one maze
// on every device (K108). The golden test in test/ui/daily_link.test.ts
// pins dailies #1-#3's mazes to catch a move.
//
// THE FRONT DOOR (K56, 2026-10-12). The page with NO query at all is
// today's daily, and the address bar stays bare while it is on screen.
// `?daily` means the same (and is rewritten to the bare address);
// `?daily=<n>` names a day and stays in the bar. Any other query is an
// ordinary design link with no daily treatment: a token, key=value pairs,
// seedless overrides (`?am=instant`). A daily's design is EXACTLY the
// day's design (isDailyDesign) - except DAILY_EXEMPT_KEYS, the player's
// playback preferences (sound, camera, touch and feel, physics on/off),
// which a daily opens with from the stored prefs (main.ts saves the ones
// the player sets while on a daily). Editing anything else - a panel row,
// the seed, `&k=v` overrides after `?daily` - leaves the daily: the page
// becomes an ordinary design link. Text after a dot (`?daily=<n>.<x>`, K20's
// retired look deltas) is ignored with a warning.

import { numberText } from "./param_codec";
import type { ParamValue } from "./param_codec";
import {
  ENUM_OPTIONS,
  PARAM_DEFAULTS,
  applyLegacyOverrides,
  impliedParams,
  parseParams,
  paramsFromValues,
} from "./url_state";
import type { UrlParams } from "./url_state";

// What a daily result or attempt records as `def` (game/daily_store.ts):
// 1 = the frozen DAILY_V1 design (codec v3's defaults plus K74's maze
// values) that every daily used until K132, 2 = today's defaults.
export const DAILY_DEF = 2;

// Seed derivation: dailySeed(n) = mix32(n + DAILY_SALT).
const DAILY_SALT = 0x6b6e6f74; // "knot"

// How far past today a ?daily=<n> link may reach: local dates around the
// world differ by up to two days, so a friend's link may be "tomorrow" here.
export const DAILY_MAX_AHEAD = 2;

// murmur3's 32-bit finalizer: a fixed, well-mixed bijection.
function mix32(x: number): number {
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return (x ^ (x >>> 16)) >>> 0;
}

export function dailySeed(n: number): number {
  return mix32((Math.round(n) + DAILY_SALT) >>> 0);
}

// Daily n's design (a fresh object): today's defaults on the day's seed.
export function dailyTitle(n: number): string {
  return `Daily #${n}`;
}

export function dailyParams(n: number): UrlParams {
  return paramsFromValues(dailySeed(n), PARAM_DEFAULTS);
}

// K552, THE ONE TITLE GATE: the title thread a scene builds with (K115
// stage 3a's SceneParams.title). A daily writes its name only with the
// player's `dailyTitleThread` preference on (Levi, 2026-10-19: off by
// default); an ordinary design never does. Both scene builds read it: the
// worker's prebuild (main.ts) and every createScene (SceneDeps.dailyTitle),
// so the prebuild matches the first build and is adopted. K115 stage 7's
// live titles slot in here.
export function sceneTitle(
  daily: number | null,
  params: Pick<UrlParams, "dailyTitleThread">
): string {
  return daily !== null && params.dailyTitleThread ? dailyTitle(daily) : "";
}

// The params that decide the MAZE - the walk graph, its start/exit and its
// optimal length: the lattice (seed, size, shape, growth), the anchors and
// every maze-plan knob. Everything else (look, sound, physics, path display,
// camera, fog) leaves the maze as it is. deadEndDensity and deadEndLength
// matter only above density 0 (0 is the braided maze).
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
  "deadEndDensity",
  "deadEndLength",
  "hCutShare",
  "exitCorridor",
  "exitFlank",
  "exitTaperRadius",
  "exitTaperStrength",
  "greedyTrap",
  "trapTargetF",
  "trapTargetH",
  "trapMaxF",
  "trapMaxH",
  "trapMaxGrow",
  "trapRadius",
  "trapIters",
  "trapTries",
  "trapSurplus",
  "entranceClearance",
  "exitClearance",
  "junctionSpacing",
  "cartouche",
  "emblem",
  "cartoucheShape",
] as const satisfies readonly (keyof UrlParams)[];

// A design's maze identity as text (numbers at link precision).
export function mazeKey(p: UrlParams): string {
  return MAZE_PARAM_KEYS.map((k) => {
    if (k.startsWith("trap") && p.greedyTrap === "off") return "-";
    if ((k === "deadEndDensity" || k === "deadEndLength") && p.deadEndDensity === 0) {
      return "-";
    }
    const v = p[k];
    return typeof v === "number" ? (numberText(v) ?? "NaN") : String(v);
  }).join("|");
}

export function sameMaze(a: UrlParams, b: UrlParams): boolean {
  return mazeKey(a) === mazeKey(b);
}

// K56 EXEMPT PARAMS: the player's playback preferences. Changing one keeps
// the daily (the daily is the same maze, looking the same, played the same
// way); changing any other param leaves it. Levi named volume, sound mode
// and camera mode (plus the stats readout and the panel, which are not
// params); the rest of the Sound folder, Touch & feel and the physics
// switch are the same kind of choice. The settings outside the link (stats
// readouts, debug overlay, mute, agitation) never leave a daily either.
// Never list a MAZE_PARAM_KEYS param (a test checks).
export const DAILY_EXEMPT_KEYS = [
  // Sound.
  "soundMode",
  "pitchSpace",
  "octaves",
  "rootNote",
  "tonicEmphasis",
  "soundSpeed",
  "volume",
  "reverb",
  "brightness",
  "sustain",
  "shimmer",
  "pickPosition",
  // View.
  "cameraMode",
  // Touch & feel (how threads answer a tap or a drag).
  "pluckSize",
  "pluckGhost",
  "pluckReach",
  "pluckStyle",
  // K180's pluck params (W's amount, how W meets crossings, the glow).
  "pluckWhole",
  "pluckCrossings",
  "pluckGlow",
  // K279's pluck emphasis (ripple, sheen, tug, auto plucks' volume).
  "pluckRipple",
  "rippleStrength",
  "rippleAuto",
  "pluckSheen",
  "pluckTug",
  "tugAuto",
  "autoPluckGain",
  "tugLimit",
  "snapBack",
  // K145's hover glow: how a run under the pointer answers, like the
  // pluck's glow. Proposed for Levi's review with K145.
  "hoverGlow",
  // K111 stage 4: the same glow's width (Levi K264: "personal setting").
  "hoverGlowWidth",
  // K298: its own length and end fade.
  "hoverGlowLength",
  "hoverGlowFade",
  // K298: how near a thread the mouse picks it (Touch & feel).
  "pickMargin",
  "pickChoiceRatio",
  // Physics on/off: a device-speed choice; the settled layout is the same.
  "physics",
  // K147's load settle: the same device-speed kind of choice (how the
  // first settle is paced and how much of it runs before the knot shows).
  // Proposed for Levi's review with K147.
  "settleBudget",
  "loadSettle",
  // K7 stage 3: which thread runs the physics, the same kind of choice.
  "physicsWorker",
  // K140's finish confetti: how a finish celebrates, not what was played.
  // Proposed for Levi's review with K140.
  "confettiAmount",
  // K98's marker size: only the look of the markers. Proposed for Levi's
  // review with K98 (K57).
  "markerSize",
  // K558's pen-order switch: only which stroke of a text crossing is on
  // top, never the maze or its walk (Call C2 of docs/design/K558.md).
  "penReverse",
  // K552's title thread: the daily's name written at its entrance. The
  // maze is the same with or without it (test/core/title_topology.test.ts)
  // and an attempt survives the toggle (daily_attempt.ts, maze form).
  "dailyTitleThread",
] as const satisfies readonly (keyof UrlParams)[];

const EXEMPT: ReadonlySet<string> = new Set(DAILY_EXEMPT_KEYS);
const NOTHING: ReadonlySet<string> = new Set();

// One param value against another, numbers at link precision (slider
// float noise is no change).
function sameValue(a: unknown, b: unknown): boolean {
  if (typeof a === "number" && typeof b === "number") {
    return numberText(a) === numberText(b);
  }
  return a === b;
}

// Is `p` the design `base` - every param but the exempt ones the same? An
// appearance preset (or random, or instant) implies its three values -
// random rolls them anew on every load - so with base's mode they are not
// compared, as a link leaves them out.
export function matchesDesign(p: UrlParams, base: UrlParams): boolean {
  const implied =
    p.appearMode === base.appearMode ? impliedParams(base) : NOTHING;
  const a = p as unknown as Record<string, unknown>;
  const b = base as unknown as Record<string, unknown>;
  for (const k of Object.keys(b)) {
    if (EXEMPT.has(k) || implied.has(k)) continue;
    if (!sameValue(a[k], b[k])) return false;
  }
  return true;
}

// Is `p` daily n's design (but for the player's preferences)?
export function isDailyDesign(p: UrlParams, n: number): boolean {
  return matchesDesign(p, dailyParams(n));
}

// The stored prefs after the player moved exempt params from `before` to
// `after` while daily n was on screen (main.ts: since the daily opened or
// last stored them). A changed param is stored where it differs from the
// day's design and dropped where it is back to it (it follows the daily
// again); an untouched one keeps what was stored - so a link's one-off
// `&vol=0` is never stored, and neither is anything else not chosen.
export function mergeDailyPrefs(
  stored: Readonly<Record<string, unknown>>,
  before: UrlParams,
  after: UrlParams,
  n: number
): Record<string, ParamValue> {
  const base = dailyParams(n) as unknown as Record<string, unknown>;
  const b = before as unknown as Record<string, unknown>;
  const a = after as unknown as Record<string, unknown>;
  const out: Record<string, ParamValue> = {};
  for (const k of DAILY_EXEMPT_KEYS) {
    if (sameValue(a[k], b[k])) {
      if (Object.hasOwn(stored, k)) out[k] = stored[k] as ParamValue;
    } else if (!sameValue(a[k], base[k])) {
      const v = a[k] as ParamValue;
      // At link precision: slider steps leave float noise behind.
      out[k] = typeof v === "number" ? Math.round(v * 1e6) / 1e6 : v;
    }
  }
  return out;
}

// `p` with stored prefs applied (a copy): exempt params only, each a value
// this build can use (its type, a current option), anything else ignored.
export function applyDailyPrefs(
  p: UrlParams,
  prefs: Readonly<Record<string, unknown>>
): UrlParams {
  const out = { ...p } as unknown as Record<string, unknown>;
  const D = PARAM_DEFAULTS as unknown as Record<string, unknown>;
  for (const k of DAILY_EXEMPT_KEYS) {
    if (!Object.hasOwn(prefs, k)) continue;
    const v = prefs[k];
    if (typeof v !== typeof D[k]) continue;
    if (typeof v === "number" && !Number.isFinite(v)) continue;
    const options = ENUM_OPTIONS[k as keyof typeof PARAM_DEFAULTS];
    if (options && !options.includes(v as string)) continue;
    out[k] = v;
  }
  return out as unknown as UrlParams;
}

// The address-bar query for daily n (no "?"): "" - the bare address - for
// TODAY's daily when the player came for today's (the bare page, `?daily`,
// the Daily button; main.ts passes `today` then), else `daily=<n>`. The
// bare address keeps meaning "today's daily", so a bookmark or home-screen
// shortcut never freezes one day (after midnight a reload brings the new
// daily, as in Wordle). Share links always name the day.
export function dailyQuery(n: number, today?: number): string {
  return n === today ? "" : `daily=${n}`;
}

export interface Launch {
  params: UrlParams;
  // The daily on screen, or null for an ordinary design.
  daily: number | null;
  // The link asked for TODAY's daily (no query, `?daily`, or a number out
  // of range) rather than a numbered day: the address bar stays bare.
  floating: boolean;
}

// What a page load shows (K56): no query = today's daily; a daily link
// (`?daily...`, first in the query); else whatever parseParams reads.
// `today` = todayNumber(); a daily number outside [1, today +
// DAILY_MAX_AHEAD] (or not a number) loads today's. `prefs` = the stored
// daily prefs, which a daily opens with (`&k=v` overrides after the link
// still win).
export function parseLaunch(
  search: string,
  today: number,
  prefs: Readonly<Record<string, unknown>> = {}
): Launch {
  const query = search.startsWith("?") ? search.slice(1) : search;
  if (query === "") {
    return {
      params: applyDailyPrefs(dailyParams(today), prefs),
      daily: today,
      floating: true,
    };
  }
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
  if (dot >= 0) {
    console.warn(
      `KnotMaze: ignored "${value.slice(dot)}" after the daily's number ` +
        "(daily links name only the day)."
    );
  }
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
  const overrides = amp >= 0 ? query.slice(amp + 1) : "";
  let params = applyDailyPrefs(dailyParams(n), prefs);
  if (overrides !== "") params = applyLegacyOverrides(params, overrides);
  // An override of anything but a preference (`&gs=8`, `&am=instant`) is
  // an ordinary design: the day's design with that change.
  if (!isDailyDesign(params, n)) return { params, daily: null, floating: false };
  return { params, daily: n, floating };
}

