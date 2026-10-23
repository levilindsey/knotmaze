// K313: the loader's draw worker (docs/design/K313_loader.md). Bundled
// by src/loader/vite_plugin.ts and inlined into index.html, so it runs
// before the app bundle exists. It draws the trefoil maze on an
// OffscreenCanvas: the head stays at the center of the screen while the
// maze slides and turns beneath it (the camera follows half the head's
// heading, smoothed), with a fixed-length trail behind the head.

import { arcSpan, pointAtArc, trefoilShape } from "./loader_geometry";

const BG = "#151b28";
const CASING = "#070a10";
const THREAD = "#e7c56f";
const TRAIL = "#ffe9a8";
const LAP_MS = 14000;
const TRAIL_LEN = 2.6; // world units of fixed-length trail behind the head
const FOLLOW = 0.5; // share of the heading the camera follows

const shape = trefoilShape();

let canvas: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;
let w = 0;
let h = 0;
let running = false;
let startAt = 0;
let smoothRot = 0;
let lastHeading = 0;

function draw(now: number): void {
  if (!ctx || !canvas) return;
  const c = ctx;
  const t = ((now - startAt) % LAP_MS) / LAP_MS;
  const headArc = t * shape.total;
  const head = pointAtArc(shape, headArc);
  // Smooth the followed rotation (unwrap against the last frame).
  let target = -head.heading * FOLLOW;
  while (target - smoothRot > Math.PI) target -= Math.PI * 2;
  while (target - smoothRot < -Math.PI) target += Math.PI * 2;
  smoothRot += (target - smoothRot) * 0.08;
  lastHeading = head.heading;

  const scale = Math.min(w, h) / 11;
  c.fillStyle = BG;
  c.fillRect(0, 0, w, h);
  c.save();
  c.translate(w / 2, h / 2);
  c.scale(scale, scale);
  c.rotate(smoothRot);
  c.translate(-head.p[0], -head.p[1]);
  c.lineCap = "round";
  c.lineJoin = "round";
  // Casings, then the thread, then the trail, then the head glyph.
  for (const pass of [0, 1]) {
    c.strokeStyle = pass === 0 ? CASING : THREAD;
    c.lineWidth = pass === 0 ? 0.6 : 0.42;
    for (const piece of shape.pieces) {
      c.beginPath();
      piece.forEach(([x, y], i) => (i === 0 ? c.moveTo(x, y) : c.lineTo(x, y)));
      c.stroke();
    }
  }
  // The fixed-length trail: ten spans fading toward the tail.
  const SEGMENTS = 10;
  for (let k = 0; k < SEGMENTS; k++) {
    const a0 = headArc - (TRAIL_LEN * (k + 1)) / SEGMENTS;
    const a1 = headArc - (TRAIL_LEN * k) / SEGMENTS;
    const pts = arcSpan(shape, a0, a1, 0.08);
    c.strokeStyle = TRAIL;
    c.globalAlpha = 0.25 + 0.75 * (1 - k / SEGMENTS);
    c.lineWidth = 0.42;
    c.beginPath();
    pts.forEach(([x, y], i) => (i === 0 ? c.moveTo(x, y) : c.lineTo(x, y)));
    c.stroke();
  }
  c.globalAlpha = 1;
  c.restore();
  // The head glyph, fixed at the center (the game's start marker: a
  // dark disc, a white ring, a white core).
  const r = Math.min(w, h) * 0.045;
  c.beginPath();
  c.arc(w / 2, h / 2, r, 0, Math.PI * 2);
  c.fillStyle = BG;
  c.fill();
  c.lineWidth = r * 0.32;
  c.strokeStyle = "#f4f6fb";
  c.stroke();
  c.beginPath();
  c.arc(w / 2, h / 2, r * 0.38, 0, Math.PI * 2);
  c.fillStyle = "#f4f6fb";
  c.fill();
  void lastHeading;
}

function frame(now: number): void {
  if (!running) return;
  draw(now);
  const raf = (self as unknown as { requestAnimationFrame?: (cb: (t: number) => void) => number }).requestAnimationFrame;
  if (raf) raf(frame);
  else setTimeout(() => frame(performance.now()), 16);
}

self.onmessage = (e: MessageEvent) => {
  const d = e.data as { type: string; canvas?: OffscreenCanvas; w?: number; h?: number };
  if (d.type === "start" && d.canvas) {
    canvas = d.canvas;
    if (d.w && d.h) {
      w = d.w;
      h = d.h;
      canvas.width = d.w;
      canvas.height = d.h;
    }
    ctx = canvas.getContext("2d");
    running = true;
    startAt = performance.now();
    frame(startAt);
    (self as unknown as { postMessage: (m: unknown) => void }).postMessage({ type: "frame1" });
  } else if (d.type === "resize" && canvas && d.w && d.h) {
    w = d.w;
    h = d.h;
    canvas.width = d.w;
    canvas.height = d.h;
  } else if (d.type === "stop") {
    running = false;
  }
};
