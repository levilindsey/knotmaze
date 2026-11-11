// K1290: crop rows, form B | master (outline_fwd.ts with forward placement off,
// = outline.ts) | forward (outline_fwd.ts as configured by K1290_* env), coloured
// as k1279_crops.ts does. Run through the K1290 config so "./outline" is the
// forward copy:
//   node scripts/run_node.mjs --config .claude/probes/K1240/proto/k1290_vite.config.mjs .claude/probes/K1240/proto/k1290_crops.ts <out.png> <scene>:<x>:<y>[:label] ... [--ppu=280] [--w=1.6] [--err]
// --err adds |ink fwd - ink form B| (red) / covered disagreement (blue), and
// where fwd's ink error exceeds master's (red) or master's exceeds fwd's (blue).
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { FormB } from "../../../../src/render/field/form_b";
import * as O from "./outline";
import * as D from "./draw";
import { loadScene, rScene, rasterR, type RScene } from "./k1279_census";

const setOn = (O as unknown as { fwdSetOn?: (on: boolean) => void }).fwdSetOn;
if (!setOn) throw new Error("run through k1290_vite.config.mjs (./outline must be outline_fwd.ts)");
const args = process.argv.slice(2);
const pos = args.filter((a) => !a.startsWith("--"));
const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const out = pos[0];
const specs = pos.slice(1).map((s) => { const [scene, x, y, label] = s.split(":"); return { scene, x: +x, y: +y, label }; });
const ppu = Number(opt("ppu") ?? 280); const Wd = Number(opt("w") ?? 1.6); const withErr = args.includes("--err");
const P = Math.round(Wd * ppu); const GAP = 6; const nPan = withErr ? 5 : 3;
const Wt = nPan * P + (nPan - 1) * GAP; const Ht = specs.length * P + (specs.length - 1) * GAP;
const img = new Uint8Array(Wt * Ht * 3).fill(128);
const hue = (c: number): [number, number, number] => { const h = ((c * 0.61803398875) % 1) * 6; const f = h - Math.floor(h); const q = [[1, f, 0], [1 - f, 1, 0], [0, 1, f], [0, 1 - f, 1], [f, 0, 1], [1, 0, 1 - f]][Math.floor(h) % 6]; return q.map((v) => 150 + 90 * v) as [number, number, number]; };
const put = (row: number, pan: number, r: number, c: number, col: [number, number, number]): void => { const o = ((row * (P + GAP) + r) * Wt + pan * (P + GAP) + c) * 3; img[o] = col[0]; img[o + 1] = col[1]; img[o + 2] = col[2]; };
const shade = (chain: number, ink: number): [number, number, number] => { const base: [number, number, number] = chain < 0 ? [255, 255, 255] : hue(chain); const a = Math.min(1, Math.max(0, ink)); return base.map((v) => Math.round(v * (1 - a))) as [number, number, number]; };

const cache = new Map<string, { fb: { evalPoint(x: number, y: number): { ink: number; top: number; chain: number } }; m: RScene; y: RScene }>();
specs.forEach((sp, row) => {
  let e = cache.get(sp.scene);
  if (!e) {
    const scene = loadScene(sp.scene);
    const fb = new FormB(JSON.parse(JSON.stringify(scene)) as never, { dpr: 2 }) as never;
    const st = O.structure(scene);
    setOn(false); const m = rScene(O.frame(st, scene), scene, D);
    setOn(true); const y = rScene(O.frame(O.structure(scene), scene), scene, D);
    e = { fb, m, y }; cache.set(sp.scene, e);
  }
  const c0 = sp.x * ppu - P / 2; const r0 = sp.y * ppu - P / 2;
  const bInk = new Float32Array(P * P); const bCh = new Int32Array(P * P);
  for (let r = 0; r < P; r++) for (let c = 0; c < P; c++) {
    const ev = e.fb.evalPoint((c0 + c + 0.5) / ppu, (r0 + r + 0.5) / ppu);
    bInk[r * P + c] = Math.min(1, Math.max(0, ev.ink)); bCh[r * P + c] = ev.top < 0 ? -1 : ev.chain;
  }
  const rm = rasterR(e.m, c0, r0, P, ppu); const ry = rasterR(e.y, c0, r0, P, ppu);
  let worse = 0; let better = 0;
  for (let r = 0; r < P; r++) for (let c = 0; c < P; c++) {
    const i = r * P + c;
    put(row, 0, r, c, shade(bCh[i], bInk[i]));
    put(row, 1, r, c, shade(rm.own[i], rm.ink[i]));
    put(row, 2, r, c, shade(ry.own[i], ry.ink[i]));
    const d = Math.abs(ry.ink[i] - bInk[i]); const dm = Math.abs(rm.ink[i] - bInk[i]);
    if (d - dm > 0.2) worse++; if (dm - d > 0.2) better++;
    if (withErr) { const f = (ry.own[i] >= 0) !== (bCh[i] >= 0) ? 1 : 0; put(row, 3, r, c, [255 - Math.round(255 * f), Math.round(255 * (1 - d) * (1 - f)), Math.round(255 * (1 - d))]); const w = Math.max(0, d - dm); const b = Math.max(0, dm - d); put(row, 4, r, c, [Math.round(255 * (1 - b)), Math.round(255 * (1 - w - b)), Math.round(255 * (1 - w))]); }
  }
  console.log(`${sp.label ?? ""} ${sp.scene} (${sp.x}, ${sp.y}): fwd's ink off form B by 0.2 more than master's on ${worse} px, less on ${better} px`);
});
const crcT = new Int32Array(256).map((_, m) => { let c = m; for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = (b: Buffer): number => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t: string, d: Buffer): Buffer => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const cb = Buffer.alloc(4); cb.writeUInt32BE(crc(td)); return Buffer.concat([l, td, cb]); };
const raw = Buffer.alloc((Wt * 3 + 1) * Ht); for (let r = 0; r < Ht; r++) { raw[r * (Wt * 3 + 1)] = 0; Buffer.from(img.buffer, r * Wt * 3, Wt * 3).copy(raw, r * (Wt * 3 + 1) + 1); }
const ih = Buffer.alloc(13); ih.writeUInt32BE(Wt, 0); ih.writeUInt32BE(Ht, 4); ih[8] = 8; ih[9] = 2;
writeFileSync(out, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ih), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]));
console.log(`wrote ${out} (${Wt}x${Ht})`);
