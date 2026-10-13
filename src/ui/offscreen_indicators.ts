// OFF-SCREEN INDICATORS (K73, Levi 2026-10-12: "an off-screen target
// indicator to show the direction of the finish when the finish is
// offscreen"). Any gameplay element can register a TARGET; while the
// target is off screen, a small disc sits at the screen's edge with the
// target's icon in it and a chevron on the side facing the target. The
// finish is the first client (main.ts); the minotaur (K80) is meant to be
// the next. A target brings:
// - world(out): where it is (world units), or false for "nowhere now";
// - radius(): its own marker's radius (world units), so "on screen" means
//   its whole marker is in view;
// - icon(): its glyph, SVG markup drawn in the glyph box (|x|, |y| <=
//   GLYPH_R - the disc's margin rule already applied);
// - style: the disc and ink colors;
// - visible(): whether it may show at all (clients compose their own
//   conditions; handle.gate() ANDs in more from elsewhere - K76's thread-
//   reveal mode hides the finish's until the exit has been seen);
// - label(): its tooltip and aria-label;
// - onTap: what a tap does (main.ts's finish: pan to frame it) - live
//   only while the environment's tapEnabled() says so (the tap-to-pan
//   preference); otherwise the disc lets every touch through to the maze.
//
// THIS MODULE owns what all targets share: the off-screen test, the edge
// placement, keeping clear of the chrome (the HUD, the mode badge, the
// hamburger, the win banner, the open panel) and of each other, the DOM
// and the per-frame update (main.ts calls update() after every camera
// step, in every ticker branch).
//
// Geometry, all in CSS px of the viewport:
// - OFF SCREEN: the marker disc is not inside the viewport inset by
//   EDGE_MARGIN; once an indicator shows, the marker must come HYSTERESIS
//   further in before it hides again (a marker swaying at the edge with
//   the flow must not flicker it).
// - PLACEMENT: the indicator's center goes on a frame inside the safe
//   area (inset by its half-size), where the ray from the frame's center
//   toward the target leaves it. Wherever that point falls inside a box to
//   avoid (each grown by the indicator's half-size plus a gap), it slides
//   along the frame's edge to the nearest free point. Indicators placed
//   earlier in a frame are boxes to avoid for later ones. The chevron
//   always aims at the target from wherever its disc ends up.

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface Point {
  x: number;
  y: number;
}

// How far inside the viewport edge a marker disc must be to count as on
// screen, and the extra distance it must come in to hide a shown one.
export const EDGE_MARGIN = 6;
export const HYSTERESIS = 14;

// Is a marker (center p, screen radius) off the viewport (vw x vh)?
// `shown` = its indicator shows now (the hysteresis side).
export function offscreen(
  p: Point,
  radius: number,
  vw: number,
  vh: number,
  shown: boolean
): boolean {
  const m = Math.max(0, radius) + EDGE_MARGIN + (shown ? HYSTERESIS : 0);
  return p.x < m || p.y < m || p.x > vw - m || p.y > vh - m;
}

export interface Placement {
  x: number;
  y: number;
  // Screen-space radians from the indicator toward its target (0 =
  // right, pi/2 = down).
  angle: number;
}

// The frame's perimeter as one loop, clockwise from the top-left corner:
// top edge, right edge, bottom edge, left edge.
function pointAt(f: Rect, s: number): Point {
  const w = f.right - f.left;
  const h = f.bottom - f.top;
  const p = 2 * (w + h);
  let t = ((s % p) + p) % p;
  if (t <= w) return { x: f.left + t, y: f.top };
  t -= w;
  if (t <= h) return { x: f.right, y: f.top + t };
  t -= h;
  if (t <= w) return { x: f.right - t, y: f.bottom };
  t -= w;
  return { x: f.left, y: f.bottom - t };
}

// The perimeter intervals [a, b] (a <= b, within [0, P]) where the frame's
// edge lies strictly inside `o`.
function blockedBy(f: Rect, o: Rect): Array<[number, number]> {
  const w = f.right - f.left;
  const h = f.bottom - f.top;
  const out: Array<[number, number]> = [];
  const span = (lo: number, hi: number, a: number, b: number): [number, number] | null => {
    const x0 = Math.max(lo, a);
    const x1 = Math.min(hi, b);
    return x1 > x0 ? [x0, x1] : null;
  };
  // Top edge (y = top, x left -> right).
  if (o.top < f.top && f.top < o.bottom) {
    const r = span(f.left, f.right, o.left, o.right);
    if (r) out.push([r[0] - f.left, r[1] - f.left]);
  }
  // Right edge (x = right, y top -> bottom).
  if (o.left < f.right && f.right < o.right) {
    const r = span(f.top, f.bottom, o.top, o.bottom);
    if (r) out.push([w + (r[0] - f.top), w + (r[1] - f.top)]);
  }
  // Bottom edge (y = bottom, x right -> left).
  if (o.top < f.bottom && f.bottom < o.bottom) {
    const r = span(f.left, f.right, o.left, o.right);
    if (r) out.push([w + h + (f.right - r[1]), w + h + (f.right - r[0])]);
  }
  // Left edge (x = left, y bottom -> top).
  if (o.left < f.left && f.left < o.right) {
    const r = span(f.top, f.bottom, o.top, o.bottom);
    if (r) out.push([2 * w + h + (f.bottom - r[1]), 2 * w + h + (f.bottom - r[0])]);
  }
  return out;
}

// Where an indicator goes (see the header): on `frame`, toward `target`,
// slid clear of `obstacles` (already grown by the indicator's size and
// gap). A frame with no free edge at all keeps the ideal point.
export function placeIndicator(
  frame: Rect,
  target: Point,
  obstacles: readonly Rect[]
): Placement {
  const w = Math.max(0, frame.right - frame.left);
  const h = Math.max(0, frame.bottom - frame.top);
  const cx = frame.left + w / 2;
  const cy = frame.top + h / 2;
  const dx = target.x - cx;
  const dy = target.y - cy;
  // The ray from the center leaves the frame at k * (dx, dy).
  let k = Infinity;
  if (dx > 1e-9) k = Math.min(k, (frame.right - cx) / dx);
  if (dx < -1e-9) k = Math.min(k, (frame.left - cx) / dx);
  if (dy > 1e-9) k = Math.min(k, (frame.bottom - cy) / dy);
  if (dy < -1e-9) k = Math.min(k, (frame.top - cy) / dy);
  let x = Number.isFinite(k) ? cx + dx * k : frame.right;
  let y = Number.isFinite(k) ? cy + dy * k : cy;
  // Its perimeter coordinate (the edge it lies on; corners belong to the
  // edge that comes first clockwise).
  const per = 2 * (w + h);
  const eps = 1e-6;
  let s: number;
  if (Math.abs(y - frame.top) < eps) s = x - frame.left;
  else if (Math.abs(x - frame.right) < eps) s = w + (y - frame.top);
  else if (Math.abs(y - frame.bottom) < eps) s = w + h + (frame.right - x);
  else s = 2 * w + h + (frame.bottom - y);
  if (per > 0 && obstacles.length > 0) {
    // Blocked intervals, merged around the loop.
    const iv: Array<[number, number]> = [];
    for (const o of obstacles) iv.push(...blockedBy(frame, o));
    iv.sort((a, b) => a[0] - b[0]);
    const merged: Array<[number, number]> = [];
    for (const [a, b] of iv) {
      const last = merged[merged.length - 1];
      if (last && a <= last[1]) last[1] = Math.max(last[1], b);
      else merged.push([a, b]);
    }
    // An interval that ends at P and one that starts at 0 are one run
    // across the top-left corner.
    if (merged.length > 1 && merged[0][0] <= 0 && merged[merged.length - 1][1] >= per) {
      const tail = merged.pop()!;
      merged[0] = [tail[0] - per, merged[0][1]];
    }
    const fullyBlocked = merged.some(([a, b]) => b - a >= per);
    // The run holding s (or s one loop around), if any: slide to its
    // nearer end. Runs are disjoint, so that end is free.
    const hit = fullyBlocked
      ? null
      : merged
          .flatMap(([a, b]) => [s, s - per, s + per].map((sv) => ({ a, b, sv })))
          .find(({ a, b, sv }) => sv > a && sv < b);
    if (hit) {
      const p = pointAt(frame, hit.sv - hit.a <= hit.b - hit.sv ? hit.a : hit.b);
      x = p.x;
      y = p.y;
    }
  }
  return { x, y, angle: Math.atan2(target.y - y, target.x - x) };
}

// The element's box (CSS px; the disc at its center), how far the box may
// come to the viewport edge, and the gap kept to the chrome and to the
// other indicators.
export const INDICATOR_SIZE = 50;
export const INDICATOR_EDGE = 6;
export const INDICATOR_GAP = 6;
// The glyph box: icon() markup stays within |x|, |y| <= GLYPH_R of the
// disc's center (stroke included). The disc is 13.5 with a 1.5 ring, so
// this leaves the margin rule's one stroke width (2) inside the ring.
export const GLYPH_R = 10.75;

// One target's state for a frame's layout (layoutIndicators).
export interface Candidate {
  id: string;
  // Its marker's screen position and radius (CSS px).
  at: Point;
  radius: number;
  // Its indicator shows now (the hysteresis side).
  shown: boolean;
}

// A frame's layout (pure): every candidate whose marker is off screen
// gets a placement, in order, each kept clear of `avoid` and of the
// indicators placed before it. `safe` = the safe-area insets. Candidates
// on screen are absent from the result.
export function layoutIndicators(
  candidates: readonly Candidate[],
  vw: number,
  vh: number,
  safe: Rect,
  avoid: readonly Rect[]
): Map<string, Placement> {
  const out = new Map<string, Placement>();
  const half = INDICATOR_SIZE / 2;
  const grow = half + INDICATOR_GAP;
  const frame: Rect = {
    left: safe.left + INDICATOR_EDGE + half,
    top: safe.top + INDICATOR_EDGE + half,
    right: vw - safe.right - INDICATOR_EDGE - half,
    bottom: vh - safe.bottom - INDICATOR_EDGE - half,
  };
  const boxes = [...avoid];
  for (const c of candidates) {
    if (!offscreen(c.at, c.radius, vw, vh, c.shown)) continue;
    const p = placeIndicator(frame, c.at, boxes);
    out.set(c.id, p);
    // The next indicator keeps clear of this one's disc (and its gap).
    boxes.push({ left: p.x - half - grow, top: p.y - half - grow, right: p.x + half + grow, bottom: p.y + half + grow });
  }
  return out;
}

// ---- Styles and glyphs ----------------------------------------------------

export interface IndicatorStyle {
  // The disc's fill, and the ink of its ring, the glyph and the chevron's
  // edge (the chevron itself wears the disc color).
  disc: string;
  ink: string;
}

// Black disc, white ink: the finish's look (Levi, 2026-10-13: the start,
// finish and head markers become black discs with white stroked icons).
export const DARK_DISC: IndicatorStyle = { disc: "#000", ink: "#fff" };

// A waving flag in the glyph box - a placeholder for the finish's icon
// until the markers' own (K83) is shared. A plain flag read as the letter
// P at this size.
export const FLAG_GLYPH =
  '<g fill="none" stroke-width="2" stroke-linecap="round" ' +
  'stroke-linejoin="round"><path d="M-5 8.2V-8.2"/>' +
  '<path d="M-5 -7.4C-1.6 -9.6 1.6 -4.4 6.6 -6.8V-0.6C1.6 1.8 -1.6 -3.4 -5 -1.2"/>' +
  "</g>";

let styled = false;
function ensureStyles(): void {
  if (styled) return;
  styled = true;
  const style = document.createElement("style");
  style.textContent =
    `.km-ind{position:fixed;left:0;top:0;z-index:19;margin:0;padding:0;` +
    `width:${INDICATOR_SIZE}px;height:${INDICATOR_SIZE}px;border:0;` +
    "background:none;cursor:pointer;opacity:0;visibility:hidden;" +
    "transition:opacity .2s,visibility 0s .2s;will-change:transform;" +
    "-webkit-tap-highlight-color:transparent;touch-action:manipulation}" +
    ".km-ind.km-on{opacity:1;visibility:visible;transition:opacity .2s}" +
    // Not interactive (no tap action, or tap-to-pan off): every touch
    // goes through to the maze beneath.
    ".km-ind.km-inert{pointer-events:none;cursor:default}" +
    ".km-ind:focus-visible{outline:2px solid #8fe6ff;outline-offset:-2px;" +
    "border-radius:50%}" +
    ".km-ind .km-ind-b{display:block;width:100%;height:100%;" +
    "animation:km-ind-breathe 2.6s ease-in-out infinite;" +
    "filter:drop-shadow(0 1px 3px #000a)}" +
    ".km-ind svg{display:block;width:100%;height:100%;overflow:visible}" +
    // At most a 2.5% breathe; static under reduced motion.
    "@keyframes km-ind-breathe{0%,100%{transform:scale(1)}" +
    "50%{transform:scale(1.025)}}" +
    "@media (prefers-reduced-motion:reduce){.km-ind,.km-ind.km-on" +
    "{transition:none}.km-ind .km-ind-b{animation:none}}";
  document.head.appendChild(style);
}

// The disc (13.5, a 1.5 ring), the glyph, and the chevron outside the disc
// - pointing at +x before its rotation - in a -25..25 box around the
// disc's center.
function discSvg(style: IndicatorStyle, icon: string): string {
  return (
    '<svg viewBox="-25 -25 50 50" aria-hidden="true">' +
    '<g class="km-ind-chev" transform="rotate(0)">' +
    `<path d="M23.3 0 15.7 -6.8 15.7 6.8z" fill="${style.disc}" ` +
    `stroke="${style.ink}" stroke-width="1.75" stroke-linejoin="round"/></g>` +
    `<circle r="13.5" fill="${style.disc}" stroke="${style.ink}" ` +
    'stroke-opacity=".92" stroke-width="1.5"/>' +
    `<g class="km-ind-icon" stroke="${style.ink}">${icon}</g></svg>`
  );
}

// ---- The registry ------------------------------------------------------------

export interface IndicatorTarget {
  // A stable name (the element's id is `indicator-<id>`).
  id: string;
  // The target's world position into out[0], out[1]; false = nowhere now.
  world: (out: Float32Array) => boolean;
  // Its marker's radius, world units.
  radius: () => number;
  // Its glyph (see GLYPH_R); re-read every frame, redrawn on a change.
  icon: () => string;
  style?: IndicatorStyle;
  // May it show at all (besides being off screen)?
  visible: () => boolean;
  // Its tooltip and aria-label.
  label: () => string;
  // What a tap does (only while the environment's tapEnabled()).
  onTap?: () => void;
}

export interface IndicatorHandle {
  readonly id: string;
  // An extra visibility predicate, ANDed with the target's own; returns
  // its remover. (The hook for modes that hide a target until something
  // happens - K76's thread-reveal mode and the finish.)
  gate: (pred: () => boolean) => () => void;
  remove: () => void;
}

export interface IndicatorEnv {
  // World -> screen: screen = (x + wx * s, y + wy * s).
  view: () => { x: number; y: number; s: number };
  // The viewport, CSS px.
  size: () => { w: number; h: number };
  // The chrome to keep clear of (null / hidden ones are skipped).
  avoid: () => ReadonlyArray<Element | null>;
  // Taps act (the tap-to-pan preference); otherwise indicators are inert.
  tapEnabled: () => boolean;
}

// Why an indicator is not showing, or "shown" (probes).
export type IndicatorStatus =
  | "hidden"
  | "no position"
  | "on screen"
  | "shown";

interface Entry {
  target: IndicatorTarget;
  gates: Array<() => boolean>;
  el: HTMLButtonElement;
  chev: Element | null;
  iconEl: Element | null;
  on: boolean;
  status: IndicatorStatus;
  at: Point | null;
  placed: Placement | null;
  lastX: number;
  lastY: number;
  lastDeg: number;
  lastTip: string;
  lastIcon: string;
  inert: boolean | null;
}

// Re-read the chrome's boxes every this many frames while anything shows
// (they move rarely; also at once on resize or when one appears).
const AVOID_REFRESH_FRAMES = 10;

export class OffscreenIndicators {
  private readonly env: IndicatorEnv;
  private readonly entries: Entry[] = [];
  private readonly scratch = new Float32Array(2);
  private avoidBoxes: Rect[] = [];
  private avoidAge = Infinity;
  private safe: Rect = { left: 0, top: 0, right: 0, bottom: 0 };

  constructor(env: IndicatorEnv) {
    ensureStyles();
    this.env = env;
    this.safe = safeAreaInsets();
    window.addEventListener("resize", () => {
      this.safe = safeAreaInsets();
      this.avoidAge = Infinity;
    });
  }

  add(target: IndicatorTarget): IndicatorHandle {
    const style = target.style ?? DARK_DISC;
    const el = document.createElement("button");
    el.type = "button";
    el.id = `indicator-${target.id}`;
    el.className = "km-ind";
    el.tabIndex = -1;
    const breathe = document.createElement("span");
    breathe.className = "km-ind-b";
    const icon = target.icon();
    breathe.innerHTML = discSvg(style, icon);
    el.appendChild(breathe);
    const e: Entry = {
      target,
      gates: [],
      el,
      chev: el.querySelector(".km-ind-chev"),
      iconEl: el.querySelector(".km-ind-icon"),
      on: false,
      status: "hidden",
      at: null,
      placed: null,
      lastX: NaN,
      lastY: NaN,
      lastDeg: NaN,
      lastTip: "",
      lastIcon: icon,
      inert: null,
    };
    el.addEventListener("click", () => {
      if (e.on && this.env.tapEnabled()) e.target.onTap?.();
    });
    document.body.appendChild(el);
    this.entries.push(e);
    return {
      id: target.id,
      gate: (pred) => {
        e.gates.push(pred);
        return () => {
          const i = e.gates.indexOf(pred);
          if (i >= 0) e.gates.splice(i, 1);
        };
      },
      remove: () => {
        const i = this.entries.indexOf(e);
        if (i >= 0) this.entries.splice(i, 1);
        el.remove();
      },
    };
  }

  // One frame: decide, place and draw every indicator.
  update(): void {
    const { x: vx, y: vy, s } = this.env.view();
    const { w, h } = this.env.size();
    const candidates: Candidate[] = [];
    for (const e of this.entries) {
      e.at = null;
      if (!e.target.visible() || !e.gates.every((g) => g())) {
        e.status = "hidden";
        continue;
      }
      if (!e.target.world(this.scratch)) {
        e.status = "no position";
        continue;
      }
      e.at = { x: vx + this.scratch[0] * s, y: vy + this.scratch[1] * s };
      candidates.push({
        id: e.target.id,
        at: e.at,
        radius: e.target.radius() * s,
        shown: e.on,
      });
    }
    // The chrome's boxes: only needed while something is off screen.
    const anyOff = candidates.some((c) => offscreen(c.at, c.radius, w, h, c.shown));
    if (anyOff && (++this.avoidAge >= AVOID_REFRESH_FRAMES || !this.entries.some((e) => e.on))) {
      this.avoidBoxes = this.readAvoid();
      this.avoidAge = 0;
    }
    const layout = anyOff
      ? layoutIndicators(candidates, w, h, this.safe, this.avoidBoxes)
      : new Map<string, Placement>();
    const tapOn = this.env.tapEnabled();
    for (const e of this.entries) {
      const p = layout.get(e.target.id);
      if (!p) {
        if (e.at) e.status = "on screen";
        e.placed = null;
        this.hideEntry(e);
        continue;
      }
      e.status = "shown";
      e.placed = p;
      this.showEntry(e, p, tapOn && !!e.target.onTap);
    }
  }

  hideAll(): void {
    for (const e of this.entries) {
      e.status = "hidden";
      e.placed = null;
      this.hideEntry(e);
    }
  }

  // Probes: every indicator's last decision.
  state(): Array<{
    id: string;
    status: IndicatorStatus;
    shown: boolean;
    at: Point | null;
    placed: Placement | null;
    inert: boolean;
  }> {
    return this.entries.map((e) => ({
      id: e.target.id,
      status: e.status,
      shown: e.on,
      at: e.at,
      placed: e.placed,
      inert: e.inert ?? true,
    }));
  }

  private readAvoid(): Rect[] {
    const grow = INDICATOR_SIZE / 2 + INDICATOR_GAP;
    const out: Rect[] = [];
    for (const el of this.env.avoid()) {
      if (!el) continue;
      const b = el.getBoundingClientRect();
      if (b.width <= 0 || b.height <= 0) continue;
      out.push({
        left: b.left - grow,
        top: b.top - grow,
        right: b.right + grow,
        bottom: b.bottom + grow,
      });
    }
    return out;
  }

  // Writes the DOM only where something changed.
  private showEntry(e: Entry, p: Placement, interactive: boolean): void {
    const x = Math.round(p.x * 2) / 2;
    const y = Math.round(p.y * 2) / 2;
    if (x !== e.lastX || y !== e.lastY) {
      e.lastX = x;
      e.lastY = y;
      const h = INDICATOR_SIZE / 2;
      e.el.style.transform = `translate3d(${x - h}px,${y - h}px,0)`;
    }
    const deg = Math.round((p.angle * 180) / Math.PI);
    if (deg !== e.lastDeg) {
      e.lastDeg = deg;
      e.chev?.setAttribute("transform", `rotate(${deg})`);
    }
    const tip = e.target.label();
    if (tip !== e.lastTip) {
      e.lastTip = tip;
      e.el.title = tip;
      e.el.setAttribute("aria-label", tip);
    }
    const icon = e.target.icon();
    if (icon !== e.lastIcon && e.iconEl) {
      e.lastIcon = icon;
      e.iconEl.innerHTML = icon;
    }
    const inert = !interactive;
    if (inert !== e.inert) {
      e.inert = inert;
      e.el.classList.toggle("km-inert", inert);
      e.el.tabIndex = inert ? -1 : 0;
    }
    if (!e.on) {
      e.on = true;
      e.el.classList.add("km-on");
    }
  }

  private hideEntry(e: Entry): void {
    if (!e.on) return;
    e.on = false;
    e.el.tabIndex = -1;
    e.inert = null;
    e.el.classList.remove("km-on");
  }
}

// The safe-area insets (CSS px), read through a probe element: env() has
// no JavaScript accessor.
let safeProbe: HTMLDivElement | null = null;
export function safeAreaInsets(): Rect {
  if (!safeProbe) {
    safeProbe = document.createElement("div");
    safeProbe.style.cssText =
      "position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;" +
      "pointer-events:none;padding:env(safe-area-inset-top) " +
      "env(safe-area-inset-right) env(safe-area-inset-bottom) " +
      "env(safe-area-inset-left)";
    document.body.appendChild(safeProbe);
  }
  const cs = getComputedStyle(safeProbe);
  return {
    top: parseFloat(cs.paddingTop) || 0,
    right: parseFloat(cs.paddingRight) || 0,
    bottom: parseFloat(cs.paddingBottom) || 0,
    left: parseFloat(cs.paddingLeft) || 0,
  };
}
