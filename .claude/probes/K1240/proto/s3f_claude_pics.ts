// K1240 S3f (Claude): where our outline draws what form B does not.
// For each scene, the worst direction-A spots (our outline -> form B)
// from out/s3f/exact_<scene>.json, clustered (one per 3h), drawn as a
// 2x2 sheet of crops: form B's top surface (pastel per surface), form
// B's top-surface border (black, |Dexp| < 0.75 crop px), our runs
// (blue), arcs (green), caps (magenta), and our points whose A
// distance is over 1/2 device px (red squares).
//   node scripts/run_node.mjs .claude/probes/K1240/proto/s3f_claude_pics.ts <scene,...> [tag] [cropH=10] [skip=0]
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";
import { structure, frame, buildOutlineS2, type SceneIn } from "./outline";
import { FormB } from "../../../../src/render/field/form_b";

const here = dirname(fileURLToPath(import.meta.url));
const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const names = (process.argv[2] ?? "def").split(",");
const tag = process.argv[3] ?? "pics";
const cropH = Number(process.argv[4] ?? 10);
const skipN = Number(process.argv[5] ?? 0);
const outDir = join(here, "..", "out", "s3f", tag);
mkdirSync(outDir, { recursive: true });

const crcT = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
function crc(b: Uint8Array): number { let c = 0xffffffff; for (const v of b) c = crcT[(c ^ v) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function png(w: number, h: number, rgb: Uint8Array): Buffer {
  const raw = new Uint8Array((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; raw.set(rgb.subarray(y * w * 3, (y + 1) * w * 3), y * (w * 3 + 1) + 1); }
  const chunk = (type: string, data: Uint8Array): Buffer => {
    const b = Buffer.alloc(12 + data.length); b.writeUInt32BE(data.length, 0); b.write(type, 4, "ascii"); Buffer.from(data).copy(b, 8);
    b.writeUInt32BE(crc(new Uint8Array(b.subarray(4, 8 + data.length))), 8 + data.length); return b;
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", new Uint8Array(0))]);
}

const T = 300; // tile px
for (const name of names) {
  const scene = JSON.parse(readFileSync(join(SCENE_DIR, `${name}.json`), "utf8")) as SceneIn;
  (scene.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
  const table = process.env.S2 ? buildOutlineS2(scene) : frame(structure(scene), scene);
  const fb = new FormB(scene as never, { dpr: 2 });
  const ppd = scene.camera.pxPerUnit * 2;
  const h = table.h;
  const ex = JSON.parse(readFileSync(join(here, "..", "out", "s3f", `exact_${name}.json`), "utf8"));
  const worst: { d: number; x: number; y: number; what: string; near: string }[] = ex.A.worst ?? [];
  const centers: typeof worst = [];
  for (const w of worst) { if (centers.every((c) => Math.hypot(c.x - w.x, c.y - w.y) > 3 * h)) centers.push(w); }
  const pick = process.env.AT ? process.env.AT.split(";").map((q) => { const [x, y] = q.split(",").map(Number); return { d: 0, x, y, what: "at", near: "" }; }) : centers.slice(skipN, skipN + 4);
  const W = 2 * T; const H = 2 * T;
  const img = new Uint8Array(W * H * 3).fill(255);
  const S = T / (cropH * h); // crop px per world unit
  const visibleDink = (x: number, y: number): number => {
    const buf: any[] = [];
    (fb as any).pieces(x, y, buf);
    const surfIds: number[] = [];
    for (const pc of buf) if (!surfIds.includes(pc.surf)) surfIds.push(pc.surf);
    for (const ci of (fb as any).cornersNear(x, y)) { const g = fb.corners[ci].g; if (!surfIds.includes(g)) surfIds.push(g); }
    const entries = surfIds.map((s) => {
      const io = (fb as any).inkOf(s, x, y, buf);
      let key = -Infinity;
      for (const pc of buf) if (pc.surf === s && pc.d < fb.h + fb.aa) key = Math.max(key, pc.key);
      return { io, key };
    }).sort((a, b) => b.key - a.key);
    let Tr = 1; let best = Infinity;
    for (const e of entries) {
      if (Number.isFinite(e.io.Dexp) && Tr * e.io.v > 0.05) best = Math.min(best, Math.abs(e.io.Dexp) * ppd);
      Tr *= 1 - e.io.a;
      if (!(Tr > 0)) break;
    }
    return best;
  };
  const dA = (x: number, y: number): number => {
    const ev = fb.evalPoint(x, y);
    if (ev.fade !== 0) return 0;
    const a = Number.isFinite(ev.Dexp) ? Math.abs(ev.Dexp) * ppd : Infinity;
    const b = ev.term ? Math.abs(ev.term.D) * ppd : Infinity;
    return Math.min(a, b, visibleDink(x, y));
  };
  pick.forEach((c, ti) => {
    const ox = (ti % 2) * T; const oy = Math.floor(ti / 2) * T;
    const x0 = c.x - T / (2 * S); const y0 = c.y - T / (2 * S);
    const put = (px: number, py: number, r: number, g: number, b: number): void => {
      if (px < 0 || py < 0 || px >= T || py >= T) return;
      const i = ((oy + py) * W + ox + px) * 3; img[i] = r; img[i + 1] = g; img[i + 2] = b;
    };
    const bMask: number[] = [];
    for (let py = 0; py < T; py++) for (let px = 0; px < T; px++) {
      const x = x0 + (px + 0.5) / S; const y = y0 + (py + 0.5) / S;
      const ev = fb.evalPoint(x, y);
      if (visibleDink(x, y) < 0.6 * ppd / S) bMask.push(px, py);
      if (ev.top >= 0) { const hue = ((ev.top % 997) * 0.618) % 1; const r = 200 + 55 * Math.cos(6.283 * hue); const g = 200 + 55 * Math.cos(6.283 * (hue - 0.333)); const b = 200 + 55 * Math.cos(6.283 * (hue - 0.667)); put(px, py, r, g, b); }
    }
    const line = (ax: number, ay: number, bx: number, by: number, col: number[]): void => {
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) * S * 2));
      for (let i = 0; i <= n; i++) { const x = ax + ((bx - ax) * i) / n; const y = ay + ((by - ay) * i) / n; const px = Math.round((x - x0) * S); const py = Math.round((y - y0) * S); put(px, py, col[0], col[1], col[2]); put(px + 1, py, col[0], col[1], col[2]); put(px, py + 1, col[0], col[1], col[2]); put(px + 1, py + 1, col[0], col[1], col[2]); }
    };
    const margin = T / S;
    for (const p of table.pieces) {
      const col = p.kind === "run" ? [0, 90, 255] : p.kind === "arc" ? [0, 160, 0] : [200, 0, 200];
      const np = p.pts.length / 2;
      for (let i = 0; i < np; i++) {
        const x = p.pts[2 * i]; const y = p.pts[2 * i + 1];
        if (Math.abs(x - c.x) > margin || Math.abs(y - c.y) > margin) continue;
        if (i + 1 < np) line(x, y, p.pts[2 * i + 2], p.pts[2 * i + 3], col);
        if (np === 1) for (let q = -2; q <= 2; q++) for (let r = -2; r <= 2; r++) put(Math.round((x - x0) * S) + q, Math.round((y - y0) * S) + r, col[0], col[1], col[2]);
      }
      for (let i = 0; i < np; i++) {
        const x = p.pts[2 * i]; const y = p.pts[2 * i + 1];
        if (Math.abs(x - c.x) > T / (2 * S) || Math.abs(y - c.y) > T / (2 * S)) continue;
        if (!(dA(x, y) <= 0.5)) { const px = Math.round((x - x0) * S); const py = Math.round((y - y0) * S); for (let q = -1; q <= 1; q++) for (let r = -1; r <= 1; r++) put(px + q, py + r, 255, 0, 0); }
      }
    }
    for (let i = 0; i < bMask.length; i += 2) put(bMask[i], bMask[i + 1], 0, 0, 0);
    for (let i = 0; i < T; i++) { put(i, 0, 120, 120, 120); put(0, i, 120, 120, 120); }
    console.log(`${name} tile${ti}: (${c.x.toFixed(2)},${c.y.toFixed(2)}) d=${c.d.toFixed(1)}px ${c.what} near ${c.near}`);
  });
  writeFileSync(join(outDir, `${name}_A${skipN}${process.env.S2 ? "_s2" : ""}.png`), png(W, H, img));
  console.log(`${name}: ${centers.length} clusters in worst ${worst.length}; h=${h} crop ${cropH}h -> ${join(outDir, `${name}_A${skipN}.png`)}`);
}
