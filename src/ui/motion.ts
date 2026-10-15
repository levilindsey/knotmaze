// THE MOTION SETTING (K53, Levi 2026-10-13): how much the page moves -
// follow system (the default: the OS's prefers-reduced-motion, followed
// LIVE), full, or reduced. A VIEWER PREFERENCE (localStorage, like
// showMazeStats), never a design param: links and dailies do not carry it.
//
// The ONE source of truth for every reduced-motion behavior. main.ts reads
// `reduced` each frame (the background's drift, the pluck overlay's still
// plucks - the plucked segment brightens instead of moving (K104) - the
// camera's jump instead of its ease to an edge marker's target), and the
// stylesheets key their reduced variants on the
// root's data-motion attribute (REDUCED_ROOT / whenReduced) instead of on
// `@media (prefers-reduced-motion)`, so the in-app choice reaches CSS too.
//
// Storage may be missing, or throw on any access (blocked storage, private
// modes, quota): every access is wrapped, and the choice then lasts for
// the session only (the daily store's pattern).

import type { StorageLike } from "../game/daily_store";

export type MotionPref = "system" | "full" | "reduced";

export const MOTION_PREFS: readonly MotionPref[] = ["system", "full", "reduced"];
export const MOTION_KEY = "knotmaze.motion";
export const MOTION_QUERY = "(prefers-reduced-motion: reduce)";

// The root attribute's selector for reduced motion, and a rule built on it
// (each selector of a comma list gets the prefix).
export const REDUCED_ROOT = ':root[data-motion="reduced"]';
export function whenReduced(selectors: string, body: string): string {
  return (
    selectors
      .split(",")
      .map((sel) => `${REDUCED_ROOT} ${sel.trim()}`)
      .join(",") + `{${body}}`
  );
}

// A stored value, or "system" for anything else (missing, damaged, or a
// value a newer build might write).
export function parseMotionPref(raw: unknown): MotionPref {
  return raw === "full" || raw === "reduced" ? raw : "system";
}

interface MotionChange {
  matches: boolean;
}
// The slice of MediaQueryList this needs (addListener: older Safari).
export interface MotionQueryLike {
  readonly matches: boolean;
  addEventListener?: (type: "change", fn: (e: MotionChange) => void) => void;
  addListener?: (fn: (e: MotionChange) => void) => void;
}
// The element whose data-motion the stylesheets read (document's root).
export interface MotionRootLike {
  dataset: { motion?: string };
}

export class MotionSetting {
  private readonly storage: StorageLike | null;
  private readonly root: MotionRootLike | null;
  private readonly listeners: Array<() => void> = [];
  private choice: MotionPref = "system";
  private systemReduced = false;

  constructor(
    storage: StorageLike | null,
    query: MotionQueryLike | null,
    root: MotionRootLike | null
  ) {
    this.storage = storage;
    this.root = root;
    try {
      this.choice = parseMotionPref(storage?.getItem(MOTION_KEY));
    } catch {
      // Unreadable storage: follow the system.
    }
    this.systemReduced = query?.matches === true;
    const onChange = (e: MotionChange): void => {
      this.systemReduced = e.matches === true;
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
  get pref(): MotionPref {
    return this.choice;
  }

  // What the OS asks for right now (whatever the choice).
  get system(): boolean {
    return this.systemReduced;
  }

  // The answer every reader uses.
  get reduced(): boolean {
    return (
      this.choice === "reduced" ||
      (this.choice === "system" && this.systemReduced)
    );
  }

  setPref(pref: MotionPref): void {
    this.choice = parseMotionPref(pref);
    try {
      this.storage?.setItem(MOTION_KEY, this.choice);
    } catch {
      // Storage refused (blocked or full): this session only.
    }
    this.changed();
  }

  // K111: told after the answer may have moved (a choice, or the OS
  // flipping), so the panel's Reduced motion box and the scene follow.
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
    if (this.root) this.root.dataset.motion = this.reduced ? "reduced" : "full";
  }
}

// The OS preference's media query, or null where there is none.
export function browserMotionQuery(): MotionQueryLike | null {
  try {
    return typeof globalThis.matchMedia === "function"
      ? globalThis.matchMedia(MOTION_QUERY)
      : null;
  } catch {
    return null;
  }
}
