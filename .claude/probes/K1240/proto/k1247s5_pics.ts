// K1247 s5: the corners that moved most from today, today | new | both, at
// the app's scale (scene.camera.pxPerUnit at dpr 2, s3f_claude_pics.ts's
// device pixels). Reads out/k1247s5/cmp<tag>.json (k1247s5_cmp.ts), picks the
// N most-moved distinct corners (all scenes, any perturbation), and draws per
// corner a row of three tiles: form B's top surface (pastel, the same in all
// three) under our outline's pieces (runs blue, arcs green, caps magenta),
// today's in the left tile, the new one in the middle, both in the right
// (today red, new blue). The corner's q is a small black square.
// Today's outline is outline_base.ts, master 2d452e0e's outline.ts (scratch,
// never committed):
//   git show 2d452e0e:.claude/probes/K1240/proto/outline.ts --output=.claude/probes/K1240/proto/outline_base.ts
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1247s5_pics.ts [--tag=_final] [--n=6] [--crop=8] [--zoom=3] [--out=pics]
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";
import * as NEW from "./outline";
import * as OLD from "./outline_base";
import { sceneOf } from "./k1247s5_scenes";
import { FormB } from "../../../../src/render/field/form_b";

const here = dirname(fileURLToPath(import.meta.url));
const arg = (k: string): string | undefined => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const tag = arg("tag") ?? "_final"; const nPick = +(arg("n") ?? 6); const cropH = +(arg("crop") ?? 8); const zoom = +(arg("zoom") ?? 3);
const outDir = join(here, "..", "out", "k1247s5", arg("out") ?? "pics"); // K1247 s6: --out=pics_s6 keeps stage 5's crops
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

type Cmp = { name: string; mult: number; h: number; moves: { i: number; d: number; dRef: number; dToday: number; qx: number; qy: number }[] }[];
const cmp = JSON.parse(readFileSync(join(here, "..", "out", "k1247s5", `cmp${tag}.json`), "utf8")) as Cmp;
const all = cmp.flatMap((s) => s.moves.map((m) => ({ ...m, name: s.name, mult: s.mult, h: s.h }))).sort((a, b) => b.d - a.d);
// Distinct corners: one per (scene family, corner index), and none within 3h of a picked one in the same scene.
const fam = (n: string): string => n.replace(/^g41_/, "").replace(/\.lightpaper$/, "");
const picks: typeof all = [];
for (const m of all) {
  if (picks.length >= nPick) break;
  if (picks.some((p) => (fam(p.name) === fam(m.name) && p.i === m.i) || Math.hypot(p.qx - m.qx, p.qy - m.qy) < 3 * m.h)) continue; // (any scene: g41_def_tw42 repeats def's corners)
  picks.push(m);
}
type Table = { h: number; pieces: { kind: string; pts: number[] }[]; corners: { qx: number; qy: number }[] };
const cache = new Map<string, { sc: ReturnType<typeof sceneOf>; a: Table; b: Table; fb: FormB }>();
const lines: string[] = [];
picks.forEach((m, row) => {
  const key = `${m.name}|${m.mult}`;
  if (!cache.has(key)) {
    const sc = sceneOf(m.name, m.mult);
    const a = OLD.frame(OLD.structure(sc), sc) as unknown as Table;
    const b = NEW.frame(NEW.structure(sc), sc) as unknown as Table;
    cache.set(key, { sc, a, b, fb: new FormB(sc as never, { dpr: 2 }) });
  }
  const { sc, a, b, fb } = cache.get(key)!;
  const S = sc.camera.pxPerUnit * 2; // device px per world unit
  const T = Math.round(cropH * m.h * S);
  const W = 3 * T + 8; const H = T;
  const img = new Uint8Array(W * H * 3).fill(255);
  const cx = 0.5 * (a.corners[m.i].qx + b.corners[m.i].qx); const cy = 0.5 * (a.corners[m.i].qy + b.corners[m.i].qy);
  const x0 = cx - T / (2 * S); const y0 = cy - T / (2 * S);
  const put = (ox: number, px: number, py: number, c: number[]): void => {
    if (px < 0 || py < 0 || px >= T || py >= H) return;
    const k = (py * W + ox + px) * 3; img[k] = c[0]; img[k + 1] = c[1]; img[k + 2] = c[2];
  };
  for (let py = 0; py < T; py++) for (let px = 0; px < T; px++) {
    const ev = fb.evalPoint(x0 + (px + 0.5) / S, y0 + (py + 0.5) / S);
    if (ev.top >= 0) { const hue = ((ev.top % 997) * 0.618) % 1; const c = [215 + 40 * Math.cos(6.283 * hue), 215 + 40 * Math.cos(6.283 * (hue - 0.333)), 215 + 40 * Math.cos(6.283 * (hue - 0.667))]; for (let t = 0; t < 3; t++) put(t * (T + 4), px, py, c); }
  }
  const draw = (ox: number, tb: Table, col: ((k: string) => number[]) | number[]): void => {
    const half = T / (2 * S) + 2 * m.h;
    for (const p of tb.pieces) {
      const c = Array.isArray(col) ? col : col(p.kind);
      const np = p.pts.length / 2;
      for (let i = 0; i + 1 < np; i++) {
        const ax = p.pts[2 * i]; const ay = p.pts[2 * i + 1]; const bx = p.pts[2 * i + 2]; const by = p.pts[2 * i + 3];
        if (Math.abs(ax - cx) > half && Math.abs(bx - cx) > half) continue;
        if (Math.abs(ay - cy) > half && Math.abs(by - cy) > half) continue;
        const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) * S * 2));
        for (let j = 0; j <= n; j++) { const px = Math.round((ax + ((bx - ax) * j) / n - x0) * S); const py = Math.round((ay + ((by - ay) * j) / n - y0) * S); put(ox, px, py, c); put(ox, px + 1, py, c); put(ox, px, py + 1, c); put(ox, px + 1, py + 1, c); }
      }
    }
    const q = tb.corners[m.i]; const qx = Math.round((q.qx - x0) * S); const qy = Math.round((q.qy - y0) * S);
    for (let u = -2; u <= 2; u++) for (let v = -2; v <= 2; v++) put(ox, qx + u, qy + v, [0, 0, 0]);
  };
  const byKind = (k: string): number[] => (k === "run" ? [0, 90, 255] : k === "arc" ? [0, 160, 0] : [200, 0, 200]);
  draw(0, a, byKind); draw(T + 4, b, byKind); draw(2 * (T + 4), a, [230, 0, 0]); draw(2 * (T + 4), b, [0, 70, 255]);
  for (let py = 0; py < H; py++) for (const ox of [T, T + 1, T + 2, T + 3, 2 * T + 4, 2 * T + 5, 2 * T + 6, 2 * T + 7]) { const k = (py * W + ox) * 3; img[k] = img[k + 1] = img[k + 2] = 60; }
  const f = join(outDir, `${row + 1}_${m.name}_${m.mult}_c${m.i}.png`);
  // Nearest-neighbour zoom for viewing (each app pixel a zoom x zoom block).
  const Z = zoom; const big = new Uint8Array(W * Z * H * Z * 3);
  for (let y = 0; y < H * Z; y++) for (let x = 0; x < W * Z; x++) { const s = ((Math.floor(y / Z)) * W + Math.floor(x / Z)) * 3; const d = (y * W * Z + x) * 3; big[d] = img[s]; big[d + 1] = img[s + 1]; big[d + 2] = img[s + 2]; }
  writeFileSync(f, png(W * Z, H * Z, big));
  const ln = `${row + 1}. ${m.name} ${m.mult} corner ${m.i} at (${cx.toFixed(2)},${cy.toFixed(2)}): moved ${m.d.toFixed(3)}h; to the reference today ${m.dToday.toFixed(3)}h, new ${m.dRef.toFixed(3)}h; h = ${(m.h * S).toFixed(1)} device px, tile ${cropH}h = ${T}px -> ${f}`;
  console.log(ln); lines.push(ln);
});
writeFileSync(join(outDir, "index.txt"), lines.join("\n") + "\n");
