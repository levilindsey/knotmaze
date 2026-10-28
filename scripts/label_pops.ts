// K868 S3a6: the label's pop census (docs/design/K868_s3a6_motion.md).
//
// It replays recorded frames of the knot in motion through the label's
// real build and passes, at ONE camera (the first frame's), and finds the
// pixels that change more than the motion explains:
// - the coverage of frames i and i+1 comes from scripts/label_pops_page.ts
//   in headed Chrome (the GPU passes), served by a Vite dev server;
// - a pixel CHANGED when its coverage moved by more than TOL (of 255);
// - it is EXPLAINED when its new value is found in frame i, and its old
//   value in frame i+1 (found = between the lightest and darkest values
//   there, +-TOL: a moved anti-aliased edge takes any value between paper
//   and ink), within the LOCAL MOTION of the pixel: the largest motion of
//   the chain samples near it (in px) plus 1 px. A sample's motion is its
//   distance to the other frame's polyline of the same chain, since the
//   label follows a thread's shape and not its material (flow slides the
//   samples along threads that barely move). "Near" is RHO1 (h + band +
//   2 px) when a sample is that close, else within RHO2 (12 h), for the
//   ink of a corner's arc far from both chains. The test runs both ways,
//   so ink that vanishes counts as well as ink that appears;
// - unexplained pixels in 8-connected blobs of at least AMIN px are POPS;
// - each pop is attributed to the nearest structure event of that frame
//   transition (oracle events with world locations, within RATTR h):
//     jump:switch | jump:fold | jump:amp   a corner's V or q moved more
//        than 0.1 world, classed against the root continued from frame i
//        (switch: it still exists and the build picks another; fold: it
//        vanished; amp: the build kept it, it just moved fast);
//     status    a corner appeared, vanished, or changed ok / no-V;
//     refit     K883's re-fit started or stopped on a corner;
//     cluster   a cluster merged or split (its junctions);
//     spans     a chain's cluster spans changed (the span ends);
//     reach     a depth pin's reach step changed (the pin);
//     count     a chain's point count changed (where points differ);
//     none      nothing within RATTR.
// The "pops" are measured at the recorded camera (zoom 1 for S3a5's
// sequences). Recordings are S3a5's format (seq13_record.mjs): a gzipped
// JSON-lines file, line 0 the meta, then {"i","t","scene"} per frame.
// Frames whose points equal the previous kept frame's are dropped, as the
// label skips them.
//
// Run from the checkout, with a dev server serving it (the K868 env
// command; any port) and the perf lock held (a pixel-exact GPU probe):
//   node node_modules\vite-node\vite-node.mjs scripts\label_pops.ts
//     <seq>[,<seq>...] [--seqdir <dir>] [--out <dir>] [--tag <name>]
//     [--oracle <path of an oracle module>] [--port 5381] [--crops 3]
//     [--zoom 1] [--frames <n, a smoke test>]
// --oracle swaps the FieldModel in the page AND here (a frozen copy of an
// older oracle gives a before/after on the same frames). --zoom scales the
// frozen camera about the view's centre. Writes <out>/<tag>/<seq>.json
// (every pop and event), <seq>_crops/*.png (frame i | frame i+1 | change:
// red ink gained, blue lost, green the pop's pixels, magenta the event)
// and summary.md.
import puppeteer from "puppeteer-core";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { deflateSync, gunzipSync } from "node:zlib";
import type { Corner, FieldModel, OracleParams } from "../src/render/field/oracle";
import { footInWindow, pointAt, type Poly } from "../src/render/field/geom";
import type { FieldScene } from "../src/render/field/scene";

// ---------------------------------------------------------------- options
const argv = process.argv.slice(2);
const opt = (k: string, d: string): string => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : d;
};
const seqs = (argv.find((a) => !a.startsWith("--") && argv[argv.indexOf(a) - 1]?.startsWith("--") !== true) ?? "def_drag").split(",");
const ROOT = process.cwd();
const SEQDIR = opt("seqdir", ".claude/probes/S3a/seq13");
const TAG = opt("tag", "run");
const OUT = join(opt("out", ".claude/probes/S3a/pops14"), TAG);
const ORACLE = opt("oracle", "src/render/field/oracle.ts");
const PORT = Number(opt("port", "5381"));
const NCROP = Number(opt("crops", "3"));
const ZOOM = Number(opt("zoom", "1"));
/** Distinct frames to take per sequence (a smoke test); 0 = all. */
const NFRAMES = Number(opt("frames", "0"));
/** --full: also write each transition's whole change image (1x). */
const FULL = argv.includes("--full");

/** Coverage change that counts (of 255), and the colour match tolerance. */
const TOL = 32;
/** A pop's least area, px. */
const AMIN = 4;
/** Attribution reach, in h. */
const RATTR = 6;
/** A corner jump: V or q moved more than this, world. */
const JUMP = 0.1;

// --------------------------------------------------------------- loading
interface SeqFrame {
  i: number;
  t: number;
  scene: FieldScene;
}
function loadSeq(name: string): SeqFrame[] {
  const raw = gunzipSync(readFileSync(join(SEQDIR, `${name}.jsonl.gz`))).toString("utf8");
  const out: SeqFrame[] = [];
  const lines = raw.split("\n");
  for (let k = 1; k < lines.length; k++) {
    if (!lines[k]) continue;
    const f = JSON.parse(lines[k]) as SeqFrame;
    f.scene.look.ctrlArc ??= 0.47;
    const p = out[out.length - 1];
    if (p && sameScene(p.scene, f.scene)) continue;
    out.push(f);
  }
  return out;
}
function sameScene(a: FieldScene, b: FieldScene): boolean {
  if (a.chains.length !== b.chains.length) return false;
  for (let c = 0; c < a.chains.length; c++) {
    const pa = a.chains[c].pts;
    const pb = b.chains[c].pts;
    if (pa.length !== pb.length) return false;
    for (let k = 0; k < pa.length; k++) if (pa[k] !== pb[k]) return false;
  }
  return true;
}

interface OracleModule {
  FieldModel: new (scene: FieldScene, params: OracleParams) => FieldModel;
  cornerRadius: (cr: number, h: number, theta: number) => number;
}
const O = (await import(/* @vite-ignore */ resolve(ROOT, ORACLE).replace(/\\/g, "/"))) as OracleModule;
const params = (scene: FieldScene): OracleParams => {
  const h = scene.look.halfWidth;
  return {
    rRound: 0,
    rOf: (_j, _i, th, st) => (st === "round" ? O.cornerRadius(3, h, th) : 0),
    spans: "k883",
    crMax: 3,
    labelOnly: true,
  } as OracleParams;
};

// ------------------------------------------------------------- the camera
interface Cam {
  a: number;
  b: number;
  c: number;
  d: number;
  tx: number;
  ty: number;
}
function frozenCamera(scene: FieldScene): { cam: Cam; w: number; h: number } {
  const [a, b, c, d, e, f] = scene.camera.worldToCss;
  if (Math.abs(b) > 1e-9 || Math.abs(c) > 1e-9) throw new Error("a rotated camera: not supported");
  const dpr = scene.camera.dpr || 1;
  const w = Math.round(scene.camera.viewport[0] * dpr);
  const h = Math.round(scene.camera.viewport[1] * dpr);
  // Zoom about the view's centre.
  const cx = w / 2;
  const cy = h / 2;
  const A = a * dpr * ZOOM;
  const D = d * dpr * ZOOM;
  const tx = cx + (e * dpr - cx) * ZOOM;
  const ty = cy + (f * dpr - cy) * ZOOM;
  return { cam: { a: A, b: 0, c: 0, d: D, tx, ty }, w, h };
}

// ------------------------------------------------------------------- PNG
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(b: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function png(w: number, h: number, rgb: Uint8Array): Buffer {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    Buffer.from(rgb.buffer, rgb.byteOffset + y * w * 3, w * 3).copy(raw, y * (w * 3 + 1) + 1);
  }
  const chunk = (type: string, data: Buffer): Buffer => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- motion
/** 1-D running max of radius r (van Herk / Gil-Werman), in place over n
 * values at stride st from offset o. */
function maxLine(src: Float32Array, dst: Float32Array, o: number, n: number, st: number, r: number, g: Float32Array, hb: Float32Array): void {
  const win = 2 * r + 1;
  for (let i = 0; i < n; i++) {
    const v = src[o + i * st];
    g[i] = i % win === 0 ? v : Math.max(g[i - 1], v);
  }
  for (let i = n - 1; i >= 0; i--) {
    const v = src[o + i * st];
    hb[i] = i === n - 1 || (i + 1) % win === 0 ? v : Math.max(hb[i + 1], v);
  }
  for (let i = 0; i < n; i++) {
    const lo = Math.max(0, i - r);
    const hi = Math.min(n - 1, i + r);
    dst[o + i * st] = Math.max(hb[lo], g[hi]);
  }
}
function dilate(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  const n = Math.max(w, h);
  const g = new Float32Array(n);
  const hb = new Float32Array(n);
  for (let y = 0; y < h; y++) maxLine(src, tmp, y * w, w, 1, r, g, hb);
  for (let x = 0; x < w; x++) maxLine(tmp, out, x, h, w, r, g, hb);
  return out;
}

/** Distance from each sample of P to the polyline Q (both [x0,y0,...]),
 * by brute force with a box skip, seeded at the same index. */
function toPolyline(P: number[], Q: number[], qClosed: boolean): Float32Array {
  const n = P.length >> 1;
  const m = Q.length >> 1;
  const segs = qClosed ? m : m - 1;
  const out = new Float32Array(n);
  const segD = (px: number, py: number, k: number): number => {
    const k2 = (k + 1) % m;
    const ax = Q[2 * k];
    const ay = Q[2 * k + 1];
    const dx = Q[2 * k2] - ax;
    const dy = Q[2 * k2 + 1] - ay;
    const L2 = dx * dx + dy * dy;
    let t = L2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / L2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const ex = ax + dx * t - px;
    const ey = ay + dy * t - py;
    return Math.sqrt(ex * ex + ey * ey);
  };
  for (let i = 0; i < n; i++) {
    const px = P[2 * i];
    const py = P[2 * i + 1];
    let best = m === 1 ? Math.hypot(Q[0] - px, Q[1] - py) : Infinity;
    if (segs > 0) {
      const k0 = Math.min(segs - 1, Math.round((i * segs) / Math.max(1, n - 1)));
      for (let k = Math.max(0, k0 - 3); k <= Math.min(segs - 1, k0 + 3); k++) best = Math.min(best, segD(px, py, k));
      for (let k = 0; k < segs; k++) {
        const k2 = (k + 1) % m;
        if (Math.min(Q[2 * k], Q[2 * k2]) - px > best || px - Math.max(Q[2 * k], Q[2 * k2]) > best) continue;
        if (Math.min(Q[2 * k + 1], Q[2 * k2 + 1]) - py > best || py - Math.max(Q[2 * k + 1], Q[2 * k2 + 1]) > best) continue;
        const d = segD(px, py, k);
        if (d < best) best = d;
      }
    }
    out[i] = best;
  }
  return out;
}

/** Per-pixel local motion (px) between two frames. The label follows the
 * threads' shape, not their material: under flow the samples slide along
 * a thread that barely moves. So a sample's motion is its distance to the
 * other frame's polyline of the same chain (the normal displacement; an
 * open end that grows is the growth). Each frame's polyline is drawn with
 * its samples' motion, then spread by a max filter of radius RHO1 (h + the
 * band + 2 px), or RHO2 (12 h) where no sample is within RHO1: the arc of
 * a corner at a narrow opening sits far from both chains. */
function motionField(s0: FieldScene, s1: FieldScene, cam: Cam, w: number, h: number, hw: number, band: number): Float32Array {
  const M0 = new Float32Array(w * h).fill(-1);
  const sc = Math.sqrt(Math.abs(cam.a * cam.d));
  const byId = new Map<number, { pts: number[]; closed: boolean }>();
  for (const ch of s0.chains) byId.set(ch.id, ch);
  const put = (x: number, y: number, v: number): void => {
    const X = Math.round(cam.a * x + cam.tx);
    const Y = Math.round(cam.d * y + cam.ty);
    if (X < 0 || Y < 0 || X >= w || Y >= h) return;
    const k = Y * w + X;
    if (v > M0[k]) M0[k] = v;
  };
  const draw = (P: number[], closed: boolean, disp: Float32Array): void => {
    const n = P.length >> 1;
    const segs = closed ? n : n - 1;
    for (let k = 0; k < segs; k++) {
      const k2 = (k + 1) % n;
      const ax = P[2 * k];
      const ay = P[2 * k + 1];
      const bx = P[2 * k2];
      const by = P[2 * k2 + 1];
      const st = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) * sc));
      for (let t = 0; t <= st; t++) {
        const u = t / st;
        put(ax + (bx - ax) * u, ay + (by - ay) * u, (disp[k] + (disp[k2] - disp[k]) * u) * sc);
      }
    }
  };
  for (const ch of s1.chains) {
    const c0 = byId.get(ch.id);
    if (!c0) {
      draw(ch.pts, ch.closed, new Float32Array(ch.pts.length >> 1));
      continue;
    }
    draw(ch.pts, ch.closed, toPolyline(ch.pts, c0.pts, c0.closed));
    draw(c0.pts, c0.closed, toPolyline(c0.pts, ch.pts, ch.closed));
  }
  const r1 = Math.ceil((hw + band) * sc) + 2;
  const r2 = Math.ceil(12 * hw * sc);
  const M1 = dilate(M0, w, h, r1);
  const M2 = dilate(M0, w, h, r2);
  for (let k = 0; k < M1.length; k++) if (M1[k] < 0) M1[k] = M2[k];
  return M1;
}

// ---------------------------------------------------------------- census
interface Pop {
  area: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  cx: number;
  cy: number;
  gain: number;
  loss: number;
  px: number[];
  /** The local motion (px) at its pixels: least and largest. */
  mot0: number;
  mot1: number;
  cause?: string;
  event?: number;
  dist?: number;
  corner?: number;
}
function census(c0: Uint8Array, c1: Uint8Array, M: Float32Array, w: number, h: number): { pops: Pop[]; changed: number; unexplained: number } {
  const U = new Uint8Array(w * h);
  let changed = 0;
  let unexplained = 0;
  // "Found" is a range test: v lies between the lightest and darkest
  // values within the radius, widened by TOL. An anti-aliased edge that
  // moves a fraction of a pixel takes any value between paper and ink, so
  // the exact value need not exist nearby (a left edge 0|168|255 moved to
  // 0|249|255 leaves no 168 within 2 px).
  const found = (c: Uint8Array, x: number, y: number, r: number, v: number): boolean => {
    const r2 = r * r;
    let lo = 255;
    let hi = 0;
    for (let dy = -r; dy <= r; dy++) {
      const Y = y + dy;
      if (Y < 0 || Y >= h) continue;
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r2) continue;
        const X = x + dx;
        if (X < 0 || X >= w) continue;
        const u = c[Y * w + X];
        if (u < lo) lo = u;
        if (u > hi) hi = u;
        if (v >= lo - TOL && v <= hi + TOL) return true;
      }
    }
    return false;
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const k = y * w + x;
      if (Math.abs(c1[k] - c0[k]) <= TOL) continue;
      changed++;
      const r = Math.ceil(Math.max(0, M[k]) + 1);
      if (found(c0, x, y, r, c1[k]) && found(c1, x, y, r, c0[k])) continue;
      U[k] = 1;
      unexplained++;
    }
  }
  const pops: Pop[] = [];
  const stack: number[] = [];
  for (let k0 = 0; k0 < U.length; k0++) {
    if (U[k0] !== 1) continue;
    U[k0] = 2;
    stack.push(k0);
    const px: number[] = [];
    while (stack.length) {
      const k = stack.pop()!;
      px.push(k);
      const x = k % w;
      const y = (k - x) / w;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const X = x + dx;
          const Y = y + dy;
          if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
          const q = Y * w + X;
          if (U[q] === 1) {
            U[q] = 2;
            stack.push(q);
          }
        }
    }
    if (px.length < AMIN) continue;
    let x0 = w;
    let y0 = h;
    let x1 = 0;
    let y1 = 0;
    let sx = 0;
    let sy = 0;
    let gain = 0;
    let loss = 0;
    let mot0 = Infinity;
    let mot1 = -Infinity;
    for (const k of px) {
      mot0 = Math.min(mot0, M[k]);
      mot1 = Math.max(mot1, M[k]);
      const x = k % w;
      const y = (k - x) / w;
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
      sx += x;
      sy += y;
      if (c1[k] > c0[k]) gain++;
      else loss++;
    }
    pops.push({ area: px.length, x0, y0, x1, y1, cx: sx / px.length, cy: sy / px.length, gain, loss, px, mot0, mot1 });
  }
  return { pops, changed, unexplained };
}

// ---------------------------------------------------------------- events
interface Ev {
  cause: string;
  key: string;
  pts: [number, number][];
  info?: Record<string, unknown>;
}
type Pin = { s: number; rL?: number; rR?: number };
interface Frame {
  m: FieldModel;
  scene: FieldScene;
  ck: Map<string, Corner>;
  cl: Map<string, number[]>;
  sp: Map<number, { str: string; ends: number[]; ci: number }>;
  rc: Map<string, { v: string; ci: number; s: number }>;
}
function frameOf(scene: FieldScene): Frame {
  const m = new O.FieldModel(scene, params(scene));
  const jid = (j: number): string => String(scene.junctions[j].id);
  const ck = new Map<string, Corner>();
  for (const c of m.corners) ck.set(`${jid(c.junction)}/${c.index}`, c);
  const clKey = m.clusters.map((c) => c.junctions.map(jid).sort().join("+"));
  const cl = new Map<string, number[]>();
  m.clusters.forEach((c, i) => cl.set(clKey[i], c.junctions));
  const sp = new Map<number, { str: string; ends: number[]; ci: number }>();
  m.chainSpans.forEach((l, ci) =>
    sp.set(m.idOf[ci], { str: l.map(([, , c]) => (c >= 0 ? clKey[c] : "-")).join(","), ends: l.flatMap(([lo, hi]) => [lo, hi]), ci })
  );
  const rc = new Map<string, { v: string; ci: number; s: number }>();
  const dcs = (m as unknown as { depthChains: { pins: Pin[] }[] }).depthChains;
  dcs.forEach((d, ci) => d.pins.forEach((q, i) => rc.set(`${m.idOf[ci]}:${i}`, { v: `${q.rL ?? "-"}/${q.rR ?? "-"}`, ci, s: q.s })));
  return { m, scene, ck, cl, sp, rc };
}

// The root continued from frame i: Newton from frame i's root, its feet
// carried by sample index + fraction onto frame i+1's chains, in windows
// of +-2 h around them (S3a5's warm prototype, seq13_corner.ts).
const segOf = (p: Poly, s: number): [number, number] => {
  let lo = 0;
  let hi = p.nseg - 1;
  while (lo < hi) {
    const md = (lo + hi + 1) >> 1;
    if (p.s[md] <= s) lo = md;
    else hi = md - 1;
  }
  const L = p.segLen[lo];
  return [lo, L > 0 ? Math.min(1, Math.max(0, (s - p.s[lo]) / L)) : 0];
};
const carry = (p0: Poly, p1: Poly, s: number): number => {
  if (p0.n !== p1.n) return p1.s0 + ((s - p0.s0) * p1.len) / p0.len;
  const [k, t] = segOf(p0, s);
  return p1.s[k] + t * p1.segLen[k];
};
const narrow = (p: Poly, s: number, w: number, win: [number, number]): [number, number] => {
  let sc = s;
  if (p.closed) {
    const mid = (win[0] + win[1]) / 2;
    for (const sh of [-p.len, p.len]) if (Math.abs(s + sh - mid) < Math.abs(sc - mid)) sc = s + sh;
  }
  return [Math.max(win[0], sc - w), Math.min(win[1], sc + w)];
};
const atEnd = (p: Poly, s: number, win: [number, number]): boolean => {
  for (const e of win) {
    let d = s - e;
    if (p.closed) d = ((((d + p.len / 2) % p.len) + p.len) % p.len) - p.len / 2;
    if (Math.abs(d) < 1e-9 * Math.max(1, Math.abs(e))) return true;
  }
  return false;
};
function newton(pa: Poly, pb: Poly, delta: number, h: number, x0: number, y0: number, wa: [number, number], wb: [number, number]) {
  let x = x0;
  let y = y0;
  let fA = footInWindow(pa, x, y, wa[0], wa[1]);
  let fB = footInWindow(pb, x, y, wb[0], wb[1]);
  for (let it = 0; it < 40; it++) {
    const ra = fA.d - delta;
    const rb = fB.d - delta;
    if (Math.abs(ra) < 1e-12 * Math.max(1, delta) && Math.abs(rb) < 1e-12 * Math.max(1, delta)) break;
    const nax = (x - fA.x) / fA.d;
    const nay = (y - fA.y) / fA.d;
    const nbx = (x - fB.x) / fB.d;
    const nby = (y - fB.y) / fB.d;
    const det = nax * nby - nay * nbx;
    if (Math.abs(det) < 1e-12) break;
    let dx = (-ra * nby + rb * nay) / det;
    let dy = (-nax * rb + nbx * ra) / det;
    const dl = Math.hypot(dx, dy);
    const lim = 0.5 * Math.max(delta, h);
    if (dl > lim) {
      dx *= lim / dl;
      dy *= lim / dl;
    }
    x += dx;
    y += dy;
    fA = footInWindow(pa, x, y, wa[0], wa[1]);
    fB = footInWindow(pb, x, y, wb[0], wb[1]);
  }
  const ok = Math.max(Math.abs(fA.d - delta), Math.abs(fB.d - delta)) < 1e-9 * Math.max(1, delta);
  return { x, y, ok, fA, fB };
}
/** null = the continued root vanished (fold). */
function continued(m0: FieldModel, c0: Corner, m1: FieldModel, c1: Corner): { V: [number, number]; q: [number, number] } | null {
  const h = m1.h;
  const NW = 2 * h;
  const pa0 = m0.polys[c0.a];
  const pb0 = m0.polys[c0.b];
  const pa1 = m1.polys[c1.a];
  const pb1 = m1.polys[c1.b];
  const solve = (delta: number, x: number, y: number, sA: number, sB: number) => {
    const wa = narrow(pa1, carry(pa0, pa1, sA), NW, c1.winA);
    const wb = narrow(pb1, carry(pb0, pb1, sB), NW, c1.winB);
    if (!(wa[0] < wa[1]) || !(wb[0] < wb[1])) return null;
    const r = newton(pa1, pb1, delta, h, x, y, wa, wb);
    if (!r.ok) return null;
    const tol = 1e-9 * Math.max(1, Math.abs(r.fA.s));
    const edge = (f: number, nw: [number, number], win: [number, number]): boolean =>
      (nw[0] > win[0] && Math.abs(f - nw[0]) <= tol) || (nw[1] < win[1] && Math.abs(f - nw[1]) <= tol);
    if (edge(r.fA.s, wa, c1.winA) || edge(r.fB.s, wb, c1.winB)) return null;
    if (atEnd(pa1, r.fA.s, c1.winA) || atEnd(pb1, r.fB.s, c1.winB)) return null;
    return r;
  };
  const v = solve(h, c0.V[0], c0.V[1], c0.sVA, c0.sVB);
  if (!v) return null;
  let q: [number, number] = [v.x, v.y];
  if (c1.r > 0) {
    let qx = c0.q[0];
    let qy = c0.q[1];
    if (c0.r > 0 && c0.r !== c1.r) {
      const k = (c1.r - c0.r) / c0.r;
      qx += (c0.q[0] - c0.V[0]) * k;
      qy += (c0.q[1] - c0.V[1]) * k;
    }
    const r = solve(h + c1.r, qx, qy, c0.sTA, c0.sTB);
    if (!r) return null;
    q = [r.x, r.y];
  }
  return { V: [v.x, v.y], q };
}

function events(f0: Frame, f1: Frame): Ev[] {
  const ev: Ev[] = [];
  const h = f1.m.h;
  const jc = (sc: FieldScene, j: number): [number, number] => [sc.junctions[j].c[0], sc.junctions[j].c[1]];
  const live = (c: Corner): boolean => c.ok && !c.noV && c.resV < 1e-9;
  for (const [k, c1] of f1.ck) {
    const c0 = f0.ck.get(k);
    if (!c0) {
      ev.push({ cause: "status", key: k, pts: [jc(f1.scene, c1.junction), c1.V], info: { what: "appeared" } });
      continue;
    }
    if (live(c0) !== live(c1)) {
      ev.push({ cause: "status", key: k, pts: [c0.V, c1.V, jc(f1.scene, c1.junction)], info: { from: `${+c0.ok}${+!!c0.noV}`, to: `${+c1.ok}${+!!c1.noV}` } });
      continue;
    }
    if (!!c0.fit !== !!c1.fit) ev.push({ cause: "refit", key: k, pts: [c0.q, c1.q], info: { r0: c0.r / h, r1: c1.r / h } });
    if (!live(c0)) continue;
    const dV = Math.hypot(c1.V[0] - c0.V[0], c1.V[1] - c0.V[1]);
    const dq = Math.hypot(c1.q[0] - c0.q[0], c1.q[1] - c0.q[1]);
    if (Math.max(dV, dq) <= JUMP) continue;
    let cls = "fold";
    let off = NaN;
    if (f0.m.idOf[c0.a] !== f1.m.idOf[c1.a] || f0.m.idOf[c0.b] !== f1.m.idOf[c1.b]) cls = "rekey";
    else {
      const w = continued(f0.m, c0, f1.m, c1);
      if (w) {
        off = Math.max(Math.hypot(w.V[0] - c1.V[0], w.V[1] - c1.V[1]), Math.hypot(w.q[0] - c1.q[0], w.q[1] - c1.q[1]));
        cls = off < 1e-3 ? "amp" : "switch";
      }
    }
    ev.push({
      cause: `jump:${cls}`,
      key: k,
      pts: [c0.V, c1.V, c0.q, c1.q, c0.tA, c1.tA, c0.tB, c1.tB],
      info: { dV, dq, theta: (c1.theta * 180) / Math.PI, r0: c0.r / h, r1: c1.r / h, off, refit: Math.abs(c1.r - c0.r) > 0.05 * h },
    });
  }
  for (const [k, c0] of f0.ck) if (!f1.ck.has(k)) ev.push({ cause: "status", key: k, pts: [jc(f0.scene, c0.junction), c0.V], info: { what: "vanished" } });
  for (const [k, js] of f1.cl) if (!f0.cl.has(k)) ev.push({ cause: "cluster", key: k, pts: js.map((j) => jc(f1.scene, j)), info: { what: "new" } });
  for (const [k, js] of f0.cl) if (!f1.cl.has(k)) ev.push({ cause: "cluster", key: k, pts: js.map((j) => jc(f0.scene, j)), info: { what: "gone" } });
  for (const [id, s1] of f1.sp) {
    const s0 = f0.sp.get(id);
    if (s0 && s0.str === s1.str) continue;
    const pts: [number, number][] = [];
    for (const s of s1.ends) {
      const a = pointAt(f1.m.polys[s1.ci], s);
      pts.push([a.x, a.y]);
    }
    if (s0) for (const s of s0.ends) {
      const a = pointAt(f0.m.polys[s0.ci], s);
      pts.push([a.x, a.y]);
    }
    if (pts.length) ev.push({ cause: "spans", key: String(id), pts });
  }
  for (const [k, r1] of f1.rc) {
    const r0 = f0.rc.get(k);
    if (r0 && r0.v === r1.v) continue;
    const a = pointAt(f1.m.polys[r1.ci], r1.s);
    ev.push({ cause: "reach", key: k, pts: [[a.x, a.y]], info: { from: r0?.v, to: r1.v } });
  }
  const p0 = new Map<number, number[]>();
  for (const ch of f0.scene.chains) p0.set(ch.id, ch.pts);
  for (const ch of f1.scene.chains) {
    const a = p0.get(ch.id);
    if (!a || a.length === ch.pts.length) continue;
    // Where the points differ: past the longest matching head and tail.
    const n0 = a.length >> 1;
    const n1 = ch.pts.length >> 1;
    const close = (i: number, j: number): boolean => Math.hypot(a[2 * i] - ch.pts[2 * j], a[2 * i + 1] - ch.pts[2 * j + 1]) < 0.25;
    let hd = 0;
    while (hd < Math.min(n0, n1) && close(hd, hd)) hd++;
    let tl = 0;
    while (tl < Math.min(n0, n1) - hd && close(n0 - 1 - tl, n1 - 1 - tl)) tl++;
    const pts: [number, number][] = [];
    for (let j = Math.max(0, hd - 1); j <= Math.min(n1 - 1, n1 - tl); j++) pts.push([ch.pts[2 * j], ch.pts[2 * j + 1]]);
    ev.push({ cause: "count", key: String(ch.id), pts, info: { n0, n1 } });
  }
  return ev;
}

// ------------------------------------------------------------ attribution
function attribute(pops: Pop[], ev: Ev[], cam: Cam, rPx: number): void {
  for (const p of pops) {
    let best = Infinity;
    let bi = -1;
    let bestCorner = Infinity;
    ev.forEach((e, i) => {
      for (const [x, y] of e.pts) {
        const X = cam.a * x + cam.tx;
        const Y = cam.d * y + cam.ty;
        const dx = Math.max(p.x0 - X, 0, X - p.x1);
        const dy = Math.max(p.y0 - Y, 0, Y - p.y1);
        const d = Math.hypot(dx, dy);
        if (d < best) {
          best = d;
          bi = i;
        }
        if (e.cause.startsWith("jump") && d < bestCorner) bestCorner = d;
      }
    });
    p.dist = best;
    p.corner = bestCorner;
    if (bi >= 0 && best <= rPx) {
      p.event = bi;
      p.cause = ev[bi].cause;
    } else p.cause = "none";
  }
}

// ------------------------------------------------------------------ crops
function crop(c0: Uint8Array, c1: Uint8Array, w: number, h: number, cx: number, cy: number, half: number, marks: number[], dots: [number, number][], file: string): void {
  const Z = 4;
  const S = 2 * half + 1;
  const W3 = (3 * S + 4) * Z;
  const H3 = S * Z;
  const rgb = new Uint8Array(W3 * H3 * 3).fill(40);
  const mk = new Set(marks);
  const paper = [236, 230, 214];
  const ink = [31, 28, 23];
  const set = (px: number, py: number, col: number[]): void => {
    for (let a = 0; a < Z; a++)
      for (let b = 0; b < Z; b++) {
        const o = ((py * Z + a) * W3 + px * Z + b) * 3;
        rgb[o] = col[0];
        rgb[o + 1] = col[1];
        rgb[o + 2] = col[2];
      }
  };
  const x0 = Math.round(cx) - half;
  const y0 = Math.round(cy) - half;
  for (let j = 0; j < S; j++)
    for (let i = 0; i < S; i++) {
      const X = x0 + i;
      const Y = y0 + j;
      if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
      const k = Y * w + X;
      const v0 = c0[k] / 255;
      const v1 = c1[k] / 255;
      const mix = (v: number): number[] => paper.map((p, t) => Math.round(p + (ink[t] - p) * v));
      set(i, j, mix(v0));
      set(S + 2 + i, j, mix(v1));
      const d = v1 - v0;
      let col = [128, 128, 128];
      if (d > 0.02) col = [128 + Math.round(127 * d), Math.round(128 * (1 - d)), Math.round(128 * (1 - d))];
      else if (d < -0.02) col = [Math.round(128 * (1 + d)), Math.round(128 * (1 + d)), 128 - Math.round(127 * d)];
      if (mk.has(k)) col = [40, 230, 60];
      set(2 * S + 4 + i, j, col);
    }
  for (const [X, Y] of dots) {
    const i = Math.round(X) - x0;
    const j = Math.round(Y) - y0;
    if (i < 0 || j < 0 || i >= S || j >= S) continue;
    for (const off of [0, S + 2, 2 * S + 4]) set(off + i, j, [230, 40, 230]);
  }
  writeFileSync(file, png(W3, H3, rgb));
}

/** The whole frame's change at 1x: grey paper, red ink gained, blue ink
 * lost, green the pops' pixels. */
function fullDiff(c0: Uint8Array, c1: Uint8Array, w: number, h: number, pops: Pop[], file: string): void {
  const rgb = new Uint8Array(w * h * 3);
  for (let k = 0; k < w * h; k++) {
    const d = (c1[k] - c0[k]) / 255;
    const ink = Math.max(c0[k], c1[k]) / 255;
    let col = [200 - 90 * ink, 200 - 90 * ink, 200 - 90 * ink];
    if (d > 0.02) col = [128 + 127 * d, 128 * (1 - d), 128 * (1 - d)];
    else if (d < -0.02) col = [128 * (1 + d), 128 * (1 + d), 128 - 127 * d];
    rgb[3 * k] = col[0];
    rgb[3 * k + 1] = col[1];
    rgb[3 * k + 2] = col[2];
  }
  for (const p of pops)
    for (const k of p.px) {
      rgb[3 * k] = 40;
      rgb[3 * k + 1] = 230;
      rgb[3 * k + 2] = 60;
    }
  writeFileSync(file, png(w, h, rgb));
}

// -------------------------------------------------------------------- run
const pct = (xs: number[], q: number): number => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
};
mkdirSync(OUT, { recursive: true });
const served = "/" + relative(ROOT, resolve(ROOT, ORACLE)).replace(/\\/g, "/");
const profile = join(OUT, `chrome-profile-${process.pid}`);
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: false,
  userDataDir: profile,
  defaultViewport: { width: 400, height: 300 },
  protocolTimeout: 900000,
  args: [
    "--use-angle=d3d11",
    "--no-first-run",
    "--no-default-browser-check",
    "--window-position=2200,50",
    "--window-size=500,400",
    "--disable-features=CalculateNativeWinOcclusion",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
  ],
});
const summary: string[] = [`# label pops: ${TAG}`, "", `oracle \`${ORACLE}\`, zoom ${ZOOM}, TOL ${TOL}/255, AMIN ${AMIN} px, attribution within ${RATTR} h, jump > ${JUMP} world`, ""];
try {
  const page = await browser.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") console.log(`[page] ${m.text()}`);
  });
  await page.goto(`http://127.0.0.1:${PORT}/scripts/label_pops.html?oracle=${encodeURIComponent(served)}`);
  await page.waitForFunction("window.__popsReady || window.__popsError", { timeout: 120000 });
  const perr = await page.evaluate("window.__popsError");
  if (perr) throw new Error(`page: ${perr}`);
  for (const name of seqs) {
    const frames = loadSeq(name);
    if (NFRAMES > 0) frames.length = Math.min(frames.length, NFRAMES);
    const { cam, w, h } = frozenCamera(frames[0].scene);
    const sc = Math.sqrt(Math.abs(cam.a * cam.d));
    const hw = frames[0].scene.look.halfWidth;
    const band = frames[0].scene.look.band;
    console.log(`${name}: ${frames.length} distinct frames, ${w}x${h}, ${sc.toFixed(2)} px/world, h ${hw}`);
    const covs: Uint8Array[] = [];
    const F: Frame[] = [];
    const buildMs: number[] = [];
    for (const fr of frames) {
      const r = (await page.evaluate(
        (s: string, c: Cam, ww: number, hh: number) => (window as unknown as { __pops: { render: (...a: unknown[]) => unknown } }).__pops.render(s, c, ww, hh),
        JSON.stringify(fr.scene),
        cam,
        w,
        h
      )) as { cov?: string; w: number; h: number; buildMs: number; glError: number; error?: string };
      if (r.error || !r.cov) throw new Error(`${name} frame ${fr.i}: ${r.error}`);
      if (r.glError) throw new Error(`${name} frame ${fr.i}: GL error ${r.glError}`);
      const lost = await page.evaluate("window.__popsLost || 0");
      if (lost) throw new Error(`${name}: webglcontextlost`);
      covs.push(new Uint8Array(Buffer.from(r.cov, "base64")));
      buildMs.push(r.buildMs);
      F.push(frameOf(fr.scene));
    }
    const perT: { t: number; changed: number; unexplained: number; pops: Pop[]; ev: Ev[] }[] = [];
    for (let t = 0; t + 1 < frames.length; t++) {
      const M = motionField(frames[t].scene, frames[t + 1].scene, cam, w, h, hw, band);
      const { pops, changed, unexplained } = census(covs[t], covs[t + 1], M, w, h);
      const ev = events(F[t], F[t + 1]);
      attribute(pops, ev, cam, RATTR * hw * sc);
      perT.push({ t, changed, unexplained, pops, ev });
      if (FULL) {
        mkdirSync(join(OUT, `${name}_full`), { recursive: true });
        fullDiff(covs[t], covs[t + 1], w, h, pops, join(OUT, `${name}_full`, `t${t}.png`));
      }
    }
    // Tables.
    const causes = ["jump:switch", "jump:fold", "jump:amp", "jump:rekey", "status", "refit", "cluster", "spans", "reach", "count", "none"];
    const popsBy = new Map<string, Pop[]>();
    const evBy = new Map<string, number>();
    for (const T of perT) {
      for (const p of T.pops) popsBy.set(p.cause!, [...(popsBy.get(p.cause!) ?? []), p]);
      for (const e of T.ev) evBy.set(e.cause, (evBy.get(e.cause) ?? 0) + 1);
    }
    const nT = perT.length;
    const allPops = perT.flatMap((T) => T.pops);
    summary.push(`## ${name}`, "");
    summary.push(
      `${frames.length} distinct frames (${nT} transitions), ${w}x${h} px at ${sc.toFixed(2)} px/world; build p50 ${pct(buildMs, 0.5).toFixed(0)} ms in the page`,
      "",
      `pops ${allPops.length} (${(allPops.length / nT).toFixed(2)} a transition; transitions with any: ${perT.filter((T) => T.pops.length).length}), area ${allPops.reduce((a, p) => a + p.area, 0)} px, largest ${Math.max(0, ...allPops.map((p) => p.area))} px; changed px p50 ${pct(perT.map((T) => T.changed), 0.5)}, unexplained px p50 ${pct(perT.map((T) => T.unexplained), 0.5)} max ${Math.max(...perT.map((T) => T.unexplained))}`,
      "",
      "| cause | events | pops | pops a transition | area px | largest px | pops with a jump within reach |",
      "|---|---|---|---|---|---|---|"
    );
    const rPx = RATTR * hw * sc;
    for (const c of causes) {
      const ps = popsBy.get(c) ?? [];
      if (!ps.length && !evBy.get(c)) continue;
      summary.push(
        `| ${c} | ${evBy.get(c) ?? 0} | ${ps.length} | ${(ps.length / nT).toFixed(2)} | ${ps.reduce((a, p) => a + p.area, 0)} | ${Math.max(0, ...ps.map((p) => p.area))} | ${ps.filter((p) => (p.corner ?? Infinity) <= rPx).length} |`
      );
    }
    // Jump classes.
    const jumps = perT.flatMap((T) => T.ev.filter((e) => e.cause.startsWith("jump")).map((e) => ({ t: T.t, e })));
    const jc = new Map<string, number>();
    for (const { e } of jumps) jc.set(e.cause, (jc.get(e.cause) ?? 0) + 1);
    summary.push("", `corner jumps ${jumps.length}: ${[...jc].map(([k, v]) => `${k.slice(5)} ${v}`).join(", ")}`);
    const amps = jumps.filter(({ e }) => e.cause === "jump:amp");
    if (amps.length)
      summary.push(
        `amp: theta p50 ${pct(amps.map(({ e }) => e.info!.theta as number), 0.5).toFixed(1)} deg, max move p50 ${pct(amps.map(({ e }) => Math.max(e.info!.dV as number, e.info!.dq as number)), 0.5).toFixed(3)} world, with a re-fit r change ${amps.filter(({ e }) => e.info!.refit).length}`
      );
    summary.push("");
    // Crops: the worst pops per cause, and the worst jump per class.
    const cdir = join(OUT, `${name}_crops`);
    rmSync(cdir, { recursive: true, force: true });
    mkdirSync(cdir, { recursive: true });
    const toPx = (p: [number, number]): [number, number] => [cam.a * p[0] + cam.tx, cam.d * p[1] + cam.ty];
    for (const c of causes) {
      const ps = [...(popsBy.get(c) ?? [])].sort((a, b) => b.area - a.area).slice(0, NCROP);
      ps.forEach((p, k) => {
        const T = perT.find((T) => T.pops.includes(p))!;
        const e = p.event !== undefined ? T.ev[p.event] : undefined;
        const half = Math.max(24, Math.ceil(Math.max(p.x1 - p.x0, p.y1 - p.y0) / 2) + 16);
        const file = join(cdir, `pop_${c.replace(":", "-")}_${k}_t${T.t}.png`);
        crop(covs[T.t], covs[T.t + 1], w, h, (p.x0 + p.x1) / 2, (p.y0 + p.y1) / 2, half, p.px, e ? e.pts.map(toPx) : [], file);
        summary.push(`- crop \`${relative(OUT, file)}\`: ${c}, t ${T.t}, ${p.area} px (+${p.gain}/-${p.loss}) at (${p.cx.toFixed(0)}, ${p.cy.toFixed(0)}), motion ${p.mot0.toFixed(1)}-${p.mot1.toFixed(1)} px, event ${e ? `${e.key} ${JSON.stringify(e.info ?? {})}` : "-"} at ${p.dist!.toFixed(1)} px`);
      });
    }
    for (const cls of ["jump:switch", "jump:fold", "jump:amp"]) {
      const js = jumps.filter(({ e }) => e.cause === cls).sort((a, b) => Math.max(b.e.info!.dV as number, b.e.info!.dq as number) - Math.max(a.e.info!.dV as number, a.e.info!.dq as number));
      const top = js[0];
      if (!top) continue;
      const P = top.e.pts.map(toPx);
      const xs = P.map((p) => p[0]);
      const ys = P.map((p) => p[1]);
      const half = Math.max(32, Math.ceil(Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) / 2) + 24);
      const file = join(cdir, `jump_${cls.slice(5)}_t${top.t}.png`);
      const T = perT[top.t];
      const marks = T.pops.filter((p) => p.event !== undefined && T.ev[p.event] === top.e).flatMap((p) => p.px);
      crop(covs[top.t], covs[top.t + 1], w, h, (Math.max(...xs) + Math.min(...xs)) / 2, (Math.max(...ys) + Math.min(...ys)) / 2, half, marks, P, file);
      summary.push(`- jump crop \`${relative(OUT, file)}\`: ${cls}, t ${top.t}, corner ${top.e.key} ${JSON.stringify(top.e.info)}`);
    }
    summary.push("");
    writeFileSync(
      join(OUT, `${name}.json`),
      JSON.stringify({
        name,
        oracle: ORACLE,
        zoom: ZOOM,
        cam,
        w,
        h,
        buildMs,
        transitions: perT.map((T) => ({
          t: T.t,
          changed: T.changed,
          unexplained: T.unexplained,
          pops: T.pops.map(({ px, ...p }) => p),
          events: T.ev,
        })),
      })
    );
    console.log(summary.slice(summary.lastIndexOf(`## ${name}`)).join("\n"));
  }
} finally {
  await browser.close();
  rmSync(profile, { recursive: true, force: true });
  writeFileSync(join(OUT, "summary.md"), summary.join("\n") + "\n");
}
