// K325: the "Made by Snoring Cat" link snores. A mouse or pen hovering over
// the link, or a touch (or pen) coming down on it, plays the snore once
// (audio/snore_sfx.ts owns the sound and its "never stacked" rule). A touch
// tap opens the link a beat later, so the snore is heard before the new tab
// takes the screen. The link stays a real <a href target=_blank>: Enter,
// modified clicks, a mouse click and "open in new tab" all take the browser's
// own path with no delay.
//
// SnoreLink is the state machine and traversalDelayMs the rule, both pure so
// the tests drive them with fakes; attachSnoreLink is the thin DOM layer.
// Lore: .claude/rules/gameplay-audio.md (K325).

import type { PlayResult } from "../audio/snore_sfx";

// A touch tap opens the link once the snore has been heard this long (its
// swell to the loud middle is 200-450 ms in)...
export const HEAR_MS = 400;
// ...but never waits longer than this after the click (a tap's click comes
// 60-150 ms after the touch-down, so a typical tap waits about 300 ms).
export const MAX_DELAY_MS = 300;

// What the link needs of the sound.
export interface SnoreDeps {
  play(): PlayResult;
  // ms the sounding snore has been heard, or null when none is sounding.
  sinceStartMs(): number | null;
}

// A pointer with a hover: the snore plays when it arrives over the link.
// A touch has none; its touch-down plays instead.
export function hoverSounds(pointerType: string): boolean {
  return pointerType === "mouse" || pointerType === "pen";
}

// A click that began as a touch or a pen is delayed. A mouse is not: it opens
// a new tab and the page stays alive, so the snore plays on (measured in
// desktop Chrome, probes/K325). Enter, a script, or no pointer at all is not
// either.
export function delaysTraversal(pointerType: string): boolean {
  return pointerType === "touch" || pointerType === "pen";
}

// How long to hold a tap's traversal: until the snore has been heard HEAR_MS,
// at most MAX_DELAY_MS, 0 when no snore is sounding.
export function traversalDelayMs(sinceStartMs: number | null): number {
  if (sinceStartMs === null || !Number.isFinite(sinceStartMs)) return 0;
  const left = HEAR_MS - Math.max(0, sinceStartMs);
  return Math.max(0, Math.min(MAX_DELAY_MS, left));
}

export interface ClickInfo {
  // The browser's own click (a script's link.click() is not).
  trusted: boolean;
  button: number;
  // The click count: 0 for Enter on the focused link and for scripts.
  detail: number;
  // Ctrl, Meta, Shift or Alt was held (the browser's own open-in-tab paths).
  modified: boolean;
}

export type ClickAction =
  | { kind: "native" } // Let the browser navigate.
  | { kind: "swallow" } // Cancel it: a delayed open is already queued.
  | { kind: "delay"; ms: number }; // Cancel it and open again after ms.

const NATIVE: ClickAction = { kind: "native" };
const SWALLOW: ClickAction = { kind: "swallow" };

export class SnoreLink {
  // What the hover's play() did ("none": no hover seen, or it was a touch).
  private hover: PlayResult | "none" = "none";
  // The same for the press.
  private press: PlayResult | "none" = "none";
  // The pointer type of the press this click will belong to.
  private downType = "";
  // A delayed open is queued.
  private pending = false;
  private readonly deps: SnoreDeps;

  constructor(deps: SnoreDeps) {
    this.deps = deps;
  }

  // The pointer arrived over the link.
  enter(pointerType: string): void {
    this.hover = "none";
    if (hoverSounds(pointerType)) this.hover = this.deps.play();
  }

  leave(): void {
    this.hover = "none";
  }

  // A primary press on the link. A touch always snores. A mouse or pen that
  // hovered already got its snore (or one was still sounding): it plays here
  // only if the hover could not (the audio had not unlocked yet).
  down(pointerType: string): void {
    this.downType = pointerType;
    this.press = "none";
    if (
      hoverSounds(pointerType) &&
      (this.hover === "started" || this.hover === "sounding")
    ) {
      return;
    }
    this.press = this.deps.play();
  }

  click(c: ClickInfo): ClickAction {
    const type = this.downType;
    this.downType = "";
    if (!c.trusted) return NATIVE;
    if (this.pending) return SWALLOW; // An impatient second tap.
    if (c.button !== 0 || c.detail < 1 || c.modified) return NATIVE;
    if (!delaysTraversal(type)) return NATIVE;
    // The touch-down could not start the snore (Chrome opens the audio gate
    // at pointerup, not at touch-down): start it now.
    if (this.press === "unavailable") this.deps.play();
    const ms = traversalDelayMs(this.deps.sinceStartMs());
    if (ms <= 0) return NATIVE;
    this.pending = true;
    return { kind: "delay", ms };
  }

  // The delayed open is being made.
  release(): void {
    this.pending = false;
  }
}

// Wires an anchor. The delayed open re-clicks the anchor from a timer: its
// untrusted click goes the browser's way, still inside the tap's 5 s of
// transient user activation, so the new tab is not a blocked popup.
export function attachSnoreLink(
  anchor: HTMLAnchorElement,
  deps: SnoreDeps
): SnoreLink {
  const link = new SnoreLink(deps);
  anchor.addEventListener("pointerenter", (e) => link.enter(e.pointerType));
  anchor.addEventListener("pointerleave", () => link.leave());
  anchor.addEventListener("pointerdown", (e) => {
    if (e.button === 0) link.down(e.pointerType);
  });
  anchor.addEventListener("click", (e) => {
    const action = link.click({
      trusted: e.isTrusted,
      button: e.button,
      detail: e.detail,
      modified: e.ctrlKey || e.metaKey || e.shiftKey || e.altKey,
    });
    if (action.kind === "native") return;
    e.preventDefault();
    if (action.kind === "delay") {
      window.setTimeout(() => {
        link.release();
        anchor.click();
      }, action.ms);
    }
  });
  return link;
}
