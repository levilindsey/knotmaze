// THE ACCESSIBILITY GROUP (K111, Levi 2026-10-13): two master switches at
// the top of the panel, "Reduced motion" and "High contrast". While one is
// on it OVERRIDES every setting relevant to it; off, the viewer's own
// values are back, because an override is a VIEW over the stored params and
// never writes to them. Both are VIEWER PREFERENCES like the Motion setting
// (ui/motion.ts): kept in localStorage, never in a link or a daily, and
// absent from the codec, the daily comparison (K57) and the undo stack.
//
// Pure and testable: the effective-settings functions below take the
// stored params and the two flags and return the values the scene should
// wear. main.ts reads every visual param they cover through them.
//
// - REDUCED MOTION is not a second preference. The checkbox drives the
//   Motion setting (MotionSetting.reduced is still the ONE answer for the
//   background drift, the plucks, the camera ease and the CSS); what this
//   file adds is the flow (the maze's undulation), which that setting did
//   not cover before. The intro animation and the pulses on the runs next
//   to the player are NOT stilled (Levi's note), and the highlight mode
//   (K111 stage 2) stays the viewer's own under reduced motion.
// - HIGH CONTRAST is its own preference, "follow system" by default: the
//   OS's prefers-contrast: more or forced-colors: active turn it on until
//   the viewer chooses.
//
// Storage may be missing, or throw on any access: every access is wrapped
// and the choice then lasts for the session only.

import type { StorageLike } from "../game/daily_store";
import type { MotionPref, MotionQueryLike } from "./motion";

// --- The high-contrast preference ------------------------------------------

export type ContrastPref = "system" | "normal" | "high";

export const CONTRAST_PREFS: readonly ContrastPref[] = [
  "system",
  "normal",
  "high",
];
export const CONTRAST_KEY = "knotmaze.contrast";
// Either OS setting asks for more contrast: prefers-contrast (every
// browser's own setting) or forced-colors (Windows contrast themes). A comma
// is OR in a media query list.
export const CONTRAST_QUERY =
  "(prefers-contrast: more), (forced-colors: active)";

// The root attribute the stylesheets (and the probes) read.
export const HIGH_CONTRAST_ROOT = ':root[data-contrast="high"]';

// A stored value, or "system" for anything else (missing, damaged, or a
// value a newer build might write).
export function parseContrastPref(raw: unknown): ContrastPref {
  return raw === "normal" || raw === "high" ? raw : "system";
}

// The element whose data-contrast the stylesheets read (document's root).
export interface ContrastRootLike {
  dataset: { contrast?: string };
}

export class ContrastSetting {
  private readonly storage: StorageLike | null;
  private readonly root: ContrastRootLike | null;
  private readonly listeners: Array<() => void> = [];
  private choice: ContrastPref = "system";
  private systemHigh = false;

  constructor(
    storage: StorageLike | null,
    query: MotionQueryLike | null,
    root: ContrastRootLike | null
  ) {
    this.storage = storage;
    this.root = root;
    try {
      this.choice = parseContrastPref(storage?.getItem(CONTRAST_KEY));
    } catch {
      // Unreadable storage: follow the system.
    }
    this.systemHigh = query?.matches === true;
    const onChange = (e: { matches: boolean }): void => {
      this.systemHigh = e.matches === true;
      this.changed();
    };
    try {
      if (typeof query?.addEventListener === "function") {
        query.addEventListener("change", onChange);
      } else if (typeof query?.addListener === "function") {
        query.addListener(onChange);
      }
    } catch {
      // No live updates: the state at load stands.
    }
    this.applyRoot();
  }

  // The viewer's choice.
  get pref(): ContrastPref {
    return this.choice;
  }

  // What the OS asks for right now (whatever the choice).
  get system(): boolean {
    return this.systemHigh;
  }

  // The answer every reader uses.
  get high(): boolean {
    return (
      this.choice === "high" || (this.choice === "system" && this.systemHigh)
    );
  }

  setPref(pref: ContrastPref): void {
    this.choice = parseContrastPref(pref);
    try {
      this.storage?.setItem(CONTRAST_KEY, this.choice);
    } catch {
      // Storage refused (blocked or full): this session only.
    }
    this.changed();
  }

  // Called after the answer may have moved (a choice, or the OS flipping).
  subscribe(fn: () => void): void {
    this.listeners.push(fn);
  }

  private changed(): void {
    this.applyRoot();
    for (const fn of this.listeners) {
      try {
        fn();
      } catch {
        // A listener must not break the setting.
      }
    }
  }

  private applyRoot(): void {
    if (this.root) this.root.dataset.contrast = this.high ? "high" : "normal";
  }
}

// The OS preference's media query, or null where there is none.
export function browserContrastQuery(): MotionQueryLike | null {
  try {
    return typeof globalThis.matchMedia === "function"
      ? globalThis.matchMedia(CONTRAST_QUERY)
      : null;
  } catch {
    return null;
  }
}

// --- The checkboxes ----------------------------------------------------------

// What a checkbox sets. ON pins the choice. OFF goes back to following the
// system, except where the system itself asks for the setting: then OFF has
// to pin "the other way", or the box would not clear. So a viewer who ticks
// and unticks a box on a calm system is back to following it.
export function reducedMotionChoice(
  on: boolean,
  systemReduced: boolean
): MotionPref {
  if (on) return "reduced";
  return systemReduced ? "full" : "system";
}

export function highContrastChoice(
  on: boolean,
  systemHigh: boolean
): ContrastPref {
  if (on) return "high";
  return systemHigh ? "normal" : "system";
}

// --- The effective settings --------------------------------------------------

export interface A11yFlags {
  reducedMotion: boolean;
  highContrast: boolean;
}

export const NO_A11Y: Readonly<A11yFlags> = {
  reducedMotion: false,
  highContrast: false,
};

// The design params the overrides touch (UrlParams has all of them; the
// choice types are plain strings here so this file stays dependency-free,
// and a test holds each override value to its param's real options).
export interface A11yTargets {
  flowStrength: number;
  flowSpeed: number;
  background: string;
  backgroundColorMode: string;
  backgroundBase: string;
  palette: string;
  pathColor: string;
  fadeLength: number;
  gap: number;
  markerSize: number;
  highlightMode: string;
}
export type A11yKey = keyof A11yTargets;

// An override maps the stored value to the one to wear. A function, so a
// "raise to at least" rule keeps a viewer's own larger value.
type Override<V> = (stored: V) => V;
type OverrideTable = { [K in A11yKey]?: Override<A11yTargets[K]> };

// REDUCED MOTION: the flow (the maze's undulation) holds still. Zero
// strength is exactly zero displacement, so the speed is moot, but both are
// pinned so nothing reads a moving value.
export const REDUCED_MOTION_OVERRIDES: Readonly<OverrideTable> = {
  flowStrength: () => 0,
  flowSpeed: () => 0,
};

// Floors for "at least" overrides, named so the handoff and the tests quote
// the same numbers.
export const HIGH_CONTRAST_GAP_MIN = 0.12;
export const HIGH_CONTRAST_MARKER_MIN = 1.5;
export const HIGH_CONTRAST_PAGE = "#000000";
export const HIGH_CONTRAST_PATH = "#ffff00";
// The highlight mode High contrast wears (K111 stage 2, one of the
// highlightMode options): white choices with a black center line.
export const HIGH_CONTRAST_HIGHLIGHT = "contrast";

// HIGH CONTRAST: the page is flat black (no backdrop texture behind or
// through the crossing gaps, the fog follows it), the threads wear the
// lightest palette, the gold route is pure yellow, crossings are cut crisp
// with a wider dark gap, the markers are larger, and the choices are lit
// flat white with a black center line, whatever their hue.
export const HIGH_CONTRAST_OVERRIDES: Readonly<OverrideTable> = {
  background: () => "none",
  backgroundColorMode: () => "custom",
  backgroundBase: () => HIGH_CONTRAST_PAGE,
  palette: () => "pastel",
  pathColor: () => HIGH_CONTRAST_PATH,
  fadeLength: () => 0,
  gap: (v) => Math.max(v, HIGH_CONTRAST_GAP_MIN),
  markerSize: (v) => Math.max(v, HIGH_CONTRAST_MARKER_MIN),
  highlightMode: () => HIGH_CONTRAST_HIGHLIGHT,
};

function tablesFor(flags: A11yFlags): Array<Readonly<OverrideTable>> {
  const out: Array<Readonly<OverrideTable>> = [];
  if (flags.reducedMotion) out.push(REDUCED_MOTION_OVERRIDES);
  if (flags.highContrast) out.push(HIGH_CONTRAST_OVERRIDES);
  return out;
}

// The keys a flag set overrides: what the panel dims.
export function overriddenKeys(flags: A11yFlags): A11yKey[] {
  const keys: A11yKey[] = [];
  for (const table of tablesFor(flags)) {
    for (const k of Object.keys(table) as A11yKey[]) {
      if (!keys.includes(k)) keys.push(k);
    }
  }
  return keys;
}

// One param as the scene should wear it. Reads only; `stored` is never
// touched. With both flags off it is `stored[key]` itself.
export function effectiveParam<T extends A11yTargets, K extends A11yKey>(
  stored: T,
  flags: A11yFlags,
  key: K
): T[K] {
  // No allocation: main.ts asks per frame.
  let value: T[K] = stored[key];
  if (flags.reducedMotion) {
    const fn = REDUCED_MOTION_OVERRIDES[key] as Override<T[K]> | undefined;
    if (fn) value = fn(value);
  }
  if (flags.highContrast) {
    const fn = HIGH_CONTRAST_OVERRIDES[key] as Override<T[K]> | undefined;
    if (fn) value = fn(value);
  }
  return value;
}

// The whole params as the scene should wear them: the SAME object when
// nothing is on (so a frame with both boxes off is today's frame), else a
// shallow copy with the overridden keys replaced. Never mutates `stored`.
export function effectiveParams<T extends A11yTargets>(
  stored: T,
  flags: A11yFlags
): T {
  const keys = overriddenKeys(flags);
  if (keys.length === 0) return stored;
  const out: T = { ...stored };
  const write = out as Record<A11yKey, unknown>;
  for (const k of keys) write[k] = effectiveParam(stored, flags, k);
  return out;
}
