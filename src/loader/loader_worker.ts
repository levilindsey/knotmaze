// K313: the loader's draw worker (docs/design/K313_loader.md). Bundled
// by src/loader/vite_plugin.ts and inlined into index.html, so it runs
// before the app bundle exists. It draws the trefoil maze on an
// OffscreenCanvas. K828: the drawing is configured (ui/loader_config.ts):
// the maze slides and turns under a centered head (move "maze", the
// camera follows half the head's heading, smoothed), or the maze holds
// still while the head travels the strand (move "head"); speed, gap,
// thread width and the thread/background colors ride along.

import { arcSpan, headingDelta, pointAtArc, trefoilShape, type TrefoilShape } from "./loader_geometry";
import { LOADER_CFG_DEFAULTS, type LoaderWireCfg } from "../ui/loader_config";

const CASING = "#070a10";
const LAP_MS = 14000;
const TRAIL_LEN = 2.6; // world units of fixed-length trail behind the head
const FOLLOW = 0.5; // share of the heading the camera follows

let cfg: LoaderWireCfg = { ...LOADER_CFG_DEFAULTS };
let shape: TrefoilShape = trefoilShape(240, cfg.gapSamples);

let canvas: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;
let w = 0;
let h = 0;
let running = false;
let sPos = 0; // the head's arc position (world units along the strand)
let lastNow = -1;
let smoothRot = 0;
// K841: the followed heading, accumulated continuously (the raw atan2
// heading wraps twice a lap; see loader_geometry's headingDelta).
let lastHeading: number | null = null;
let headingCont = 0;

// The trail's lighter tint of the thread color (today: #e7c56f ->
// #ffe9a8's family; here the configured gold mixed toward white).
function tint(hex: string, share: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = Number.parseInt(m[1], 16);
  const mix = (c: number): number => Math.round(c + (255 - c) * share);
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `rgb(${r},${g},${b})`;
}

function strokePieces(c: OffscreenCanvasRenderingContext2D, alpha: number): void {
  c.globalAlpha = alpha;
  for (const piece of shape.pieces) {
    c.beginPath();
    piece.forEach(([x, y], i) => (i === 0 ? c.moveTo(x, y) : c.lineTo(x, y)));
    c.stroke();
  }
  c.globalAlpha = 1;
}

function strokeSpan(c: OffscreenCanvasRenderingContext2D, from: number, to: number): void {
  const pts = arcSpan(shape, from, to, 0.08);
  c.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? c.moveTo(x, y) : c.lineTo(x, y)));
  c.stroke();
}

// K842: a span with the under crossings' gap windows cut out of it, so
// the trail (and the traveled stroke) dives with the strand instead of
// painting across the thread it passes under. The windows are the
// shape's own gaps (cfg.gapSamples of arc either side of an under
// crossing), placed on the span's lap.
function strokeSpanClipped(c: OffscreenCanvasRenderingContext2D, from: number, to: number): void {
  const n = shape.points.length;
  let spans: Array<[number, number]> = [[from, to]];
  for (const u of shape.under) {
    const i = Math.floor(u) % n;
    const f = u - Math.floor(u);
    const base = shape.cum[i] + (shape.cum[i + 1] - shape.cum[i]) * f;
    let g0 = base - cfg.gapSamples;
    let g1 = base + cfg.gapSamples;
    while (g1 < from) {
      g0 += shape.total;
      g1 += shape.total;
    }
    while (g0 > to) {
      g0 -= shape.total;
      g1 -= shape.total;
    }
    const next: Array<[number, number]> = [];
    for (const [a, b] of spans) {
      if (g1 <= a || g0 >= b) {
        next.push([a, b]);
        continue;
      }
      if (g0 > a) next.push([a, g0]);
      if (g1 < b) next.push([g1, b]);
    }
    spans = next;
    if (spans.length === 0) break;
  }
  for (const [a, b] of spans) {
    if (b - a > 1e-6) strokeSpan(c, a, b);
  }
}

// The head glyph (the game's start marker: a dark disc, a white ring, a
// white core) at (x, y) in the current transform.
function headGlyph(c: OffscreenCanvasRenderingContext2D, x: number, y: number, r: number): void {
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fillStyle = cfg.bg;
  c.fill();
  c.lineWidth = r * 0.32;
  c.strokeStyle = "#f4f6fb";
  c.stroke();
  c.beginPath();
  c.arc(x, y, r * 0.38, 0, Math.PI * 2);
  c.fillStyle = "#f4f6fb";
  c.fill();
}

function drawMazeMode(c: OffscreenCanvasRenderingContext2D): void {
  const head = pointAtArc(shape, sPos);
  // K841: follow a CONTINUOUS heading. The old code unwrapped the
  // halved heading by whole turns, but the halved value's period is
  // half a turn (the heading wraps twice a lap), so at each wrap the
  // follower could take the long way and the knot visibly rotated
  // back the wrong way. Accumulate the heading's own steps instead.
  if (lastHeading === null) {
    lastHeading = head.heading;
    headingCont = head.heading;
  } else {
    headingCont += headingDelta(lastHeading, head.heading);
    lastHeading = head.heading;
  }
  const target = -headingCont * FOLLOW;
  smoothRot += (target - smoothRot) * 0.08;
  // Keep both angles near zero (a 2-pi shift of each, which leaves
  // the drawn rotation unchanged: the target is the halved heading).
  if (smoothRot > Math.PI * 2) {
    smoothRot -= Math.PI * 2;
    headingCont += Math.PI * 4;
  } else if (smoothRot < -Math.PI * 2) {
    smoothRot += Math.PI * 2;
    headingCont -= Math.PI * 4;
  }

  const scale = Math.min(w, h) / 11;
  c.save();
  c.translate(w / 2, h / 2);
  c.scale(scale, scale);
  c.rotate(smoothRot);
  c.translate(-head.p[0], -head.p[1]);
  c.lineWidth = cfg.casingW;
  c.strokeStyle = CASING;
  strokePieces(c, 1);
  c.lineWidth = cfg.threadW;
  c.strokeStyle = cfg.thread;
  strokePieces(c, 1);
  // The fixed-length trail: ten spans fading toward the tail.
  const SEGMENTS = 10;
  c.strokeStyle = tint(cfg.thread, 0.45);
  c.lineWidth = cfg.threadW;
  for (let k = 0; k < SEGMENTS; k++) {
    const a0 = sPos - (TRAIL_LEN * (k + 1)) / SEGMENTS;
    const a1 = sPos - (TRAIL_LEN * k) / SEGMENTS;
    c.globalAlpha = 0.25 + 0.75 * (1 - k / SEGMENTS);
    strokeSpanClipped(c, a0, a1);
  }
  c.globalAlpha = 1;
  c.restore();
  headGlyph(c, w / 2, h / 2, Math.min(w, h) * 0.045);
}

function drawHeadMode(c: OffscreenCanvasRenderingContext2D): void {
  // Fit the whole knot: it holds still while the head travels.
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of shape.points) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  const pad = cfg.casingW + 0.4;
  const bw = maxX - minX + pad * 2;
  const bh = maxY - minY + pad * 2;
  const scale = Math.min(w / bw, h / bh);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const head = pointAtArc(shape, sPos);
  c.save();
  c.translate(w / 2, h / 2);
  c.scale(scale, scale);
  c.translate(-cx, -cy);
  c.lineWidth = cfg.casingW;
  c.strokeStyle = CASING;
  strokePieces(c, 1);
  // The untraveled knot dim, then the traveled strand at full color.
  c.lineWidth = cfg.threadW;
  c.strokeStyle = cfg.thread;
  strokePieces(c, 0.38);
  strokeSpanClipped(c, 0, sPos);
  // The fading trail at the head, as in maze mode.
  const SEGMENTS = 10;
  c.strokeStyle = tint(cfg.thread, 0.45);
  for (let k = 0; k < SEGMENTS; k++) {
    const a0 = sPos - (TRAIL_LEN * (k + 1)) / SEGMENTS;
    const a1 = sPos - (TRAIL_LEN * k) / SEGMENTS;
    c.globalAlpha = 0.25 + 0.75 * (1 - k / SEGMENTS);
    strokeSpanClipped(c, a0, a1);
  }
  c.globalAlpha = 1;
  headGlyph(c, head.p[0], head.p[1], (Math.min(w, h) * 0.045) / scale);
  c.restore();
}

function draw(now: number): void {
  if (!ctx || !canvas) return;
  const c = ctx;
  if (lastNow >= 0) {
    const dt = Math.min(100, Math.max(0, now - lastNow));
    sPos = (sPos + (dt * cfg.speed * shape.total) / LAP_MS) % shape.total;
  }
  lastNow = now;
  c.fillStyle = cfg.bg;
  c.fillRect(0, 0, w, h);
  c.lineCap = "round";
  c.lineJoin = "round";
  if (cfg.move === "head") drawHeadMode(c);
  else drawMazeMode(c);
}

function frame(now: number): void {
  if (!running) return;
  draw(now);
  const raf = (self as unknown as { requestAnimationFrame?: (cb: (t: number) => void) => number }).requestAnimationFrame;
  if (raf) raf(frame);
  else setTimeout(() => frame(performance.now()), 16);
}

function applyCfg(next: LoaderWireCfg): void {
  const gapChanged = next.gapSamples !== cfg.gapSamples;
  cfg = { ...next };
  if (gapChanged) shape = trefoilShape(240, cfg.gapSamples);
}

self.onmessage = (e: MessageEvent) => {
  const d = e.data as {
    type: string;
    canvas?: OffscreenCanvas;
    w?: number;
    h?: number;
    cfg?: LoaderWireCfg;
  };
  if (d.type === "start" && d.canvas) {
    if (d.cfg) applyCfg(d.cfg);
    canvas = d.canvas;
    if (d.w && d.h) {
      w = d.w;
      h = d.h;
      canvas.width = d.w;
      canvas.height = d.h;
    }
    ctx = canvas.getContext("2d");
    running = true;
    sPos = 0;
    lastNow = -1;
    smoothRot = 0;
    lastHeading = null;
    headingCont = 0;
    frame(performance.now());
    (self as unknown as { postMessage: (m: unknown) => void }).postMessage({ type: "frame1" });
  } else if (d.type === "config" && d.cfg) {
    applyCfg(d.cfg);
  } else if (d.type === "resize" && canvas && d.w && d.h) {
    w = d.w;
    h = d.h;
    canvas.width = d.w;
    canvas.height = d.h;
  } else if (d.type === "stop") {
    running = false;
  }
};
