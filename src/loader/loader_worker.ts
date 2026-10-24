// K313: the loader's draw worker (docs/design/K313_loader.md). Bundled
// by src/loader/vite_plugin.ts and inlined into index.html, so it runs
// before the app bundle exists. It draws the trefoil maze on an
// OffscreenCanvas. K828: the drawing is configured (ui/loader_config.ts):
// the maze slides and turns under a centered head (move "maze", the
// camera follows half the head's heading, smoothed), or the maze holds
// still while the head travels the strand (move "head"); speed, gap,
// thread width and the thread/background colors ride along.

import { arcSpan, headingDelta, pointAtArc, rotationForCentroidAbove, rotationForHeadBelowCentroid, shapeCentroid, trefoilShape, underGapAt, type TrefoilShape } from "./loader_geometry";
import { LOADER_CFG_DEFAULTS, type LoaderWireCfg } from "../ui/loader_config";

const CASING = "#070a10";
const LAP_MS = 14000;
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
// K852 ("above" motion): the centroid-above rotation, accumulated
// continuously the same way (the raw target wraps as the head laps).
let lastAboveRaw: number | null = null;
let aboveCont = 0;
// K853 ("spin" motion): the head-below-centroid rotation, likewise.
let lastSpinRaw: number | null = null;
let spinCont = 0;

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

// K852: the strand in the configured fill mode. "solid" is today's
// drawing (dark casing, then the thread); "outline" hollows the thread
// (casing, then background at half width - a rim only); "flat" is the
// bare thread with no casing.
function strandPieces(c: OffscreenCanvasRenderingContext2D, alpha: number): void {
  if (cfg.fill !== "flat") {
    c.lineWidth = cfg.casingW;
    c.strokeStyle = CASING;
    strokePieces(c, alpha);
  }
  if (cfg.fill === "outline") {
    c.lineWidth = Math.max(0.05, cfg.threadW * 0.55);
    c.strokeStyle = cfg.bg;
  } else {
    c.lineWidth = cfg.threadW;
    c.strokeStyle = cfg.thread;
  }
  strokePieces(c, alpha);
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

// The three moving-thread motions share everything but the anchor and
// the rotation: "maze" (K828) anchors the head at the center and
// follows half its heading; "above" (K852) anchors the head and turns
// the knot so its centroid stays directly above the centered marker;
// "spin" (K853) anchors the CENTROID at the center and turns the knot
// around it so the marker stays directly below the centroid - the
// knot spins in place while the marker rides the vertical line.
function drawMovingMode(c: OffscreenCanvasRenderingContext2D, mode: "maze" | "above" | "spin"): void {
  const head = pointAtArc(shape, sPos);
  let rotation: number;
  // The shape point pinned to the screen center.
  let anchor = head.p;
  if (mode === "spin") {
    const centroid = shapeCentroid(shape);
    anchor = centroid;
    const raw = rotationForHeadBelowCentroid(shape, head.p);
    if (raw !== null) {
      if (lastSpinRaw === null) {
        spinCont = raw;
      } else {
        spinCont += headingDelta(lastSpinRaw, raw);
      }
      lastSpinRaw = raw;
    }
    rotation = spinCont;
    // Keep the angle near zero (a 2-pi shift leaves it unchanged).
    while (rotation > Math.PI * 2) {
      spinCont -= Math.PI * 2;
      rotation -= Math.PI * 2;
    }
    while (rotation < -Math.PI * 2) {
      spinCont += Math.PI * 2;
      rotation += Math.PI * 2;
    }
  } else if (mode === "above") {
    // K852: the exact centroid-above angle each frame (no following
    // lag - "always above" is the mode's contract), accumulated
    // continuously so the wrap never spins the knot backwards.
    const raw = rotationForCentroidAbove(shape, head.p);
    if (raw !== null) {
      if (lastAboveRaw === null) {
        aboveCont = raw;
      } else {
        aboveCont += headingDelta(lastAboveRaw, raw);
      }
      lastAboveRaw = raw;
    }
    rotation = aboveCont;
    // Keep the angle near zero (a 2-pi shift leaves it unchanged).
    while (rotation > Math.PI * 2) {
      aboveCont -= Math.PI * 2;
      rotation -= Math.PI * 2;
    }
    while (rotation < -Math.PI * 2) {
      aboveCont += Math.PI * 2;
      rotation += Math.PI * 2;
    }
  } else {
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
    rotation = smoothRot;
  }

  const scale = Math.min(w, h) / 11;
  c.save();
  c.translate(w / 2, h / 2);
  c.scale(scale, scale);
  c.rotate(rotation);
  c.translate(-anchor[0], -anchor[1]);
  strandPieces(c, 1);
  // The fixed-length trail: ten spans fading toward the tail.
  const SEGMENTS = 10;
  c.strokeStyle = tint(cfg.thread, 0.45);
  c.lineWidth = cfg.threadW;
  for (let k = 0; k < SEGMENTS; k++) {
    const a0 = sPos - (cfg.trail * (k + 1)) / SEGMENTS;
    const a1 = sPos - (cfg.trail * k) / SEGMENTS;
    c.globalAlpha = 0.25 + 0.75 * (1 - k / SEGMENTS);
    strokeSpanClipped(c, a0, a1);
  }
  c.globalAlpha = 1;
  c.restore();
  // K851: the head dives at under crossings (hidden while inside the
  // gap window extended by its own world radius: 0.045 of the view /
  // (min/11 px per world), plus the ring's outer stroke). K852: the
  // radius scales with the marker param.
  const headR = Math.min(w, h) * 0.045 * cfg.marker;
  // K853: in spin mode the marker is not at the center - it sits on
  // the vertical line below the anchored centroid, at the head's
  // distance from the centroid.
  const glyphY =
    mode === "spin"
      ? h / 2 + Math.hypot(head.p[0] - anchor[0], head.p[1] - anchor[1]) * scale
      : h / 2;
  if (!underGapAt(shape, sPos, (headR / scale) * 1.16, cfg.gapSamples)) {
    headGlyph(c, w / 2, glyphY, headR);
  }
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
  // The untraveled knot dim (K852: in the configured fill mode), then
  // the traveled strand at full color.
  strandPieces(c, 0.38);
  c.lineWidth = cfg.threadW;
  c.strokeStyle = cfg.thread;
  strokeSpanClipped(c, 0, sPos);
  // The fading trail at the head, as in the moving modes.
  const SEGMENTS = 10;
  c.strokeStyle = tint(cfg.thread, 0.45);
  for (let k = 0; k < SEGMENTS; k++) {
    const a0 = sPos - (cfg.trail * (k + 1)) / SEGMENTS;
    const a1 = sPos - (cfg.trail * k) / SEGMENTS;
    c.globalAlpha = 0.25 + 0.75 * (1 - k / SEGMENTS);
    strokeSpanClipped(c, a0, a1);
  }
  c.globalAlpha = 1;
  // K851: as in the moving modes, the travelling head dives at under
  // crossings. K852: the radius scales with the marker param.
  const headR = (Math.min(w, h) * 0.045 * cfg.marker) / scale;
  if (!underGapAt(shape, sPos, headR * 1.16, cfg.gapSamples)) {
    headGlyph(c, head.p[0], head.p[1], headR);
  }
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
  else drawMovingMode(c, cfg.move);
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
    lastAboveRaw = null;
    aboveCont = 0;
    lastSpinRaw = null;
    spinCont = 0;
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
