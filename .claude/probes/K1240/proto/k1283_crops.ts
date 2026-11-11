// K1283: crop rows, form B | before (k1283_before_outline.ts, src/render/outline/outline.ts
// as of master 8f7004bf) | after (src/render/outline/outline.ts), coloured as k1279_crops.ts
// does (a covered pixel in its thread's pastel hue, paper white, darkened by the ink). Run
// through k1283_vite.config.mjs so "./outline" and "./draw" are src's:
//   node scripts/run_node.mjs --config .claude/probes/K1240/proto/k1283_vite.config.mjs .claude/probes/K1240/proto/k1283_crops.ts <out.png> <scene>:<x>:<y>[:label] ... [--ppu=280] [--w=1.6] [--err] [--dbg]
// <scene> is a census scene (K868 scenes, at rest) or <name>@<frame>, a frame of out/s15/rec_<name>.
// --err adds |ink after - ink form B| (red) / covered disagreement (blue), and where after's ink
// error exceeds before's (red) or before's exceeds after's (blue).
// --dbg adds a panel: after with the centrelines (grey), the arc pieces (orange), and per corner
// V (blue), Q (magenta) and the arc ends TA/TB (green); and prints the corners within the crop.
// --b0=s2 takes "before" from k1283s2_before_outline.ts (src's outline.ts at master c3d7ad32,
// stage 1's result: K1283 stage 2's before) instead of 8f7004bf.
import { writeFileSync, readFileSync, readdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";
import { FormB } from "../../../../src/render/field/form_b";
import * as O from "./outline";
import * as B0a from "./k1283_before_outline";
import * as B0s2 from "./k1283s2_before_outline";
import * as D from "./draw";
import { loadScene, rScene, rasterR, type RScene } from "./k1279_census";

const args = process.argv.slice(2);
const pos = args.filter((a) => !a.startsWith("--"));
const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const out = pos[0];
const specs = pos.slice(1).map((s) => { const [scene, x, y, label] = s.split(":"); return { scene, x: +x, y: +y, label }; });
const B0 = (opt("b0") === "s2" ? B0s2 : B0a) as typeof B0a; const ppu = Number(opt("ppu") ?? 280); const Wd = Number(opt("w") ?? 1.6); const withErr = args.includes("--err"); const withDbg = args.includes("--dbg");
const P = Math.round(Wd * ppu); const GAP = 6; const nPan = 3 + (withErr ? 2 : 0) + (withDbg ? 1 : 0);
const Wt = nPan * P + (nPan - 1) * GAP; const Ht = specs.length * P + (specs.length - 1) * GAP;
const img = new Uint8Array(Wt * Ht * 3).fill(128);
const hue = (c: number): [number, number, number] => { const h = ((c * 0.61803398875) % 1) * 6; const f = h - Math.floor(h); const q = [[1, f, 0], [1 - f, 1, 0], [0, 1, f], [0, 1 - f, 1], [f, 0, 1], [1, 0, 1 - f]][Math.floor(h) % 6]; return q.map((v) => 150 + 90 * v) as [number, number, number]; };
const put = (row: number, pan: number, r: number, c: number, col: [number, number, number]): void => { if (r < 0 || c < 0 || r >= P || c >= P) return; const o = ((row * (P + GAP) + r) * Wt + pan * (P + GAP) + c) * 3; img[o] = col[0]; img[o + 1] = col[1]; img[o + 2] = col[2]; };
const shade = (chain: number, ink: number): [number, number, number] => { const base: [number, number, number] = chain < 0 ? [255, 255, 255] : hue(chain); const a = Math.min(1, Math.max(0, ink)); return base.map((v) => Math.round(v * (1 - a))) as [number, number, number]; };

const recDir = join(dirname(fileURLToPath(import.meta.url)), "..", "out", "s15");
const loadRec = (spec: string): O.SceneIn => { const [nm, fs] = spec.split("@"); const d = join(recDir, `rec_${nm}`); const fl = readdirSync(d).filter((x) => x.endsWith(".json.gz")).sort(); const s = JSON.parse(gunzipSync(readFileSync(join(d, fl[Number(fs)]))).toString("utf8")) as O.SceneIn; (s.look as { ctrlArc?: number }).ctrlArc ??= 0.47; return s; };
const cache = new Map<string, { fb: { evalPoint(x: number, y: number): { ink: number; top: number; chain: number } }; m: RScene; y: RScene; t: O.OutlineTable; scene: O.SceneIn }>();
const summary: string[] = [];
specs.forEach((sp, row) => {
  let e = cache.get(sp.scene);
  if (!e) {
    const scene = sp.scene.includes("@") ? loadRec(sp.scene) : loadScene(sp.scene);
    const fb = new FormB(JSON.parse(JSON.stringify(scene)) as never, { dpr: 2 }) as never;
    const m = rScene(B0.frame(B0.structure(scene as never), scene as never) as never, scene, D);
    const t = O.frame(O.structure(scene), scene);
    const y = rScene(t, scene, D);
    e = { fb, m, y, t, scene }; cache.set(sp.scene, e);
  }
  const c0 = sp.x * ppu - P / 2; const r0 = sp.y * ppu - P / 2;
  const bInk = new Float32Array(P * P); const bCh = new Int32Array(P * P);
  for (let r = 0; r < P; r++) for (let c = 0; c < P; c++) {
    const ev = e.fb.evalPoint((c0 + c + 0.5) / ppu, (r0 + r + 0.5) / ppu);
    bInk[r * P + c] = Math.min(1, Math.max(0, ev.ink)); bCh[r * P + c] = ev.top < 0 ? -1 : ev.chain;
  }
  const rm = rasterR(e.m, c0, r0, P, ppu); const ry = rasterR(e.y, c0, r0, P, ppu);
  let worse = 0; let better = 0; let errB = 0; let errA = 0;
  const pd = 3 + (withErr ? 2 : 0);
  for (let r = 0; r < P; r++) for (let c = 0; c < P; c++) {
    const i = r * P + c;
    put(row, 0, r, c, shade(bCh[i], bInk[i]));
    put(row, 1, r, c, shade(rm.own[i], rm.ink[i]));
    put(row, 2, r, c, shade(ry.own[i], ry.ink[i]));
    const d = Math.abs(ry.ink[i] - bInk[i]); const dm = Math.abs(rm.ink[i] - bInk[i]);
    errA += d; errB += dm;
    if (d - dm > 0.2) worse++; if (dm - d > 0.2) better++;
    if (withErr) { const f = (ry.own[i] >= 0) !== (bCh[i] >= 0) ? 1 : 0; put(row, 3, r, c, [255 - Math.round(255 * f), Math.round(255 * (1 - d) * (1 - f)), Math.round(255 * (1 - d))]); const w = Math.max(0, d - dm); const b = Math.max(0, dm - d); put(row, 4, r, c, [Math.round(255 * (1 - b)), Math.round(255 * (1 - w - b)), Math.round(255 * (1 - w))]); }
    if (withDbg) put(row, pd, r, c, shade(ry.own[i], ry.ink[i] * 0.5));
  }
  if (withDbg) {
    const toPx = (x: number, y: number): [number, number] => [Math.round(y * ppu - r0), Math.round(x * ppu - c0)];
    const dot = (x: number, y: number, col: [number, number, number], rad = 3): void => { const [r, c] = toPx(x, y); for (let dr = -rad; dr <= rad; dr++) for (let dc = -rad; dc <= rad; dc++) if (dr * dr + dc * dc <= rad * rad) put(row, pd, r + dr, c + dc, col); };
    const line = (pts: number[], col: [number, number, number], closed = false): void => {
      const n = pts.length / 2;
      for (let k = 0; k + 1 < n + (closed ? 1 : 0); k++) {
        const ax = pts[2 * k]; const ay = pts[2 * k + 1]; const bx = pts[2 * ((k + 1) % n)]; const by = pts[2 * ((k + 1) % n) + 1];
        const L = Math.hypot(bx - ax, by - ay) * ppu; const m = Math.max(1, Math.ceil(L));
        for (let q = 0; q <= m; q++) { const [r, c] = toPx(ax + ((bx - ax) * q) / m, ay + ((by - ay) * q) / m); put(row, pd, r, c, col); }
      }
    };
    for (const ch of e.scene.chains) line(ch.pts, [150, 150, 150], ch.closed);
    const KC: Record<string, [number, number, number]> = { run: [60, 60, 60], arc: [255, 140, 0], cap: [220, 0, 0], tail: [0, 170, 220], ghost: [170, 0, 220] };
    const W2 = Wd / 2;
    const inCrop = (x: number, y: number): boolean => Math.abs(x - sp.x) < W2 && Math.abs(y - sp.y) < W2;
    e.t.pieces.forEach((pc, pi) => {
      let hit = false; for (let k = 0; k < pc.pts.length; k += 2) if (inCrop(pc.pts[k], pc.pts[k + 1])) { hit = true; break; }
      if (!hit) return;
      line(pc.pts, KC[pc.kind]);
      const n = pc.pts.length;
      dot(pc.pts[0], pc.pts[1], KC[pc.kind], 2); dot(pc.pts[n - 2], pc.pts[n - 1], KC[pc.kind], 2);
      if (process.env.K1283_PIECES === "1") summary.push(`  ${sp.label ?? ""} piece ${pi} ${pc.kind} ch ${pc.chain} side ${pc.side} s ${pc.s0.toFixed(4)}..${pc.s1.toFixed(4)} corner ${pc.corner} region ${pc.region} from (${pc.pts[0].toFixed(3)}, ${pc.pts[1].toFixed(3)}) to (${pc.pts[n - 2].toFixed(3)}, ${pc.pts[n - 1].toFixed(3)}) n ${n / 2}`);
    });
    for (let ci = 0; ci < e.t.corners.length; ci++) {
      const k = e.t.corners[ci];
      if (Math.abs(k.Vx - sp.x) > W2 && Math.abs(k.qx - sp.x) > W2) continue;
      if (Math.abs(k.Vy - sp.y) > W2 && Math.abs(k.qy - sp.y) > W2) continue;
      dot(k.Vx, k.Vy, [0, 0, 255]); dot(k.qx, k.qy, [255, 0, 255]); dot(k.tax, k.tay, [0, 170, 0]); dot(k.tbx, k.tby, [0, 120, 0], 2);
      summary.push(`  ${sp.label ?? ""} corner ${ci} j${k.junction} chains ${k.aChain}/${k.bChain} ok ${k.ok} style ${k.style} th ${k.theta.toFixed(3)} r ${k.r.toFixed(4)} V (${k.Vx.toFixed(3)}, ${k.Vy.toFixed(3)}) Q (${k.qx.toFixed(3)}, ${k.qy.toFixed(3)}) TA (${k.tax.toFixed(3)}, ${k.tay.toFixed(3)}) TB (${k.tbx.toFixed(3)}, ${k.tby.toFixed(3)})${k.why ? ` why ${k.why}` : ""}`);
    }
  }
  const S = `${sp.label ?? ""} ${sp.scene} (${sp.x}, ${sp.y}): |ink - form B| before ${errB.toFixed(0)} after ${errA.toFixed(0)}; after off form B by 0.2 more than before on ${worse} px, less on ${better} px`;
  console.log(S);
});
for (const s of summary) console.log(s);
const crcT = new Int32Array(256).map((_, m) => { let c = m; for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = (b: Buffer): number => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t: string, d: Buffer): Buffer => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const cb = Buffer.alloc(4); cb.writeUInt32BE(crc(td)); return Buffer.concat([l, td, cb]); };
const raw = Buffer.alloc((Wt * 3 + 1) * Ht); for (let r = 0; r < Ht; r++) { raw[r * (Wt * 3 + 1)] = 0; Buffer.from(img.buffer, r * Wt * 3, Wt * 3).copy(raw, r * (Wt * 3 + 1) + 1); }
const ih = Buffer.alloc(13); ih.writeUInt32BE(Wt, 0); ih.writeUInt32BE(Ht, 4); ih[8] = 8; ih[9] = 2;
writeFileSync(out, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ih), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]));
console.log(`wrote ${out} (${Wt}x${Ht})`);
