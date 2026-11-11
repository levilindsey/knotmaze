// K1277: crop rows, form B | master (the current outline's faces, even-odd,
// with k1277_base_draw's bands: the stencil fill) | mine (fill_tri's
// triangles, depth-tested, with draw.ts's bands) | fill against form B
// (red: mine wrong where master is right; green: master wrong where mine is
// right; grey: both wrong). Covered pixels in their thread's pastel hue,
// paper white, darkened by the ink.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1277_crops.ts <out.png> <scene>:<x>:<y>[:label] ... [--ppu=280] [--w=1.6]
// <scene> is a K868 scene name, or rec_def/<frame> / rec_fat/<frame> for a
// stage 15 recording's frame (structure and resolution from its frame 0).
import { writeFileSync, readFileSync } from "node:fs";
import { gunzipSync, deflateSync } from "node:zlib";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FormB } from "../../../../src/render/field/form_b";
import * as curO from "./outline";
import * as curD from "./draw";
import * as baseD from "./k1277_base_draw";
import { loadScene, rScene, rasterR, type RScene } from "./k1279_census";
import { fillResolution, fillStructure, fillFrame, rasterFill, type FillStructure, type FillFrame } from "./fill_tri";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const pos = args.filter((a) => !a.startsWith("--"));
const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const out = pos[0];
const specs = pos.slice(1).map((s) => { const [scene, x, y, label] = s.split(":"); return { scene, x: +x, y: +y, label }; });
const ppu = Number(opt("ppu") ?? 280); const Wd = Number(opt("w") ?? 1.6);
const P = Math.round(Wd * ppu); const GAP = 6; const nPan = 4;
const Wt = nPan * P + (nPan - 1) * GAP; const Ht = specs.length * P + (specs.length - 1) * GAP;
const img = new Uint8Array(Wt * Ht * 3).fill(128);
const hue = (c: number): [number, number, number] => { const h = ((c * 0.61803398875) % 1) * 6; const f = h - Math.floor(h); const q = [[1, f, 0], [1 - f, 1, 0], [0, 1, f], [0, 1 - f, 1], [f, 0, 1], [1, 0, 1 - f]][Math.floor(h) % 6]; return q.map((v) => 150 + 90 * v) as [number, number, number]; };
const put = (row: number, pan: number, r: number, c: number, col: [number, number, number]): void => { const o = ((row * (P + GAP) + r) * Wt + pan * (P + GAP) + c) * 3; img[o] = col[0]; img[o + 1] = col[1]; img[o + 2] = col[2]; };
const shade = (chain: number, ink: number): [number, number, number] => { const base: [number, number, number] = chain < 0 ? [255, 255, 255] : hue(chain); const a = Math.min(1, Math.max(0, ink)); return base.map((v) => Math.round(v * (1 - a))) as [number, number, number]; };

const recs = new Map<string, { s0: curO.SceneIn; st: curO.DiagramStructure; fs: FillStructure }>();
function loadRec(name: string, f: number): curO.SceneIn {
  const d = join(here, "..", "out", "s15", name);
  const s = JSON.parse(gunzipSync(readFileSync(join(d, `f${String(f).padStart(4, "0")}.json.gz`))).toString("utf8")) as curO.SceneIn;
  (s.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
  return s;
}
interface Ent { scene: curO.SceneIn; fb: { evalPoint(x: number, y: number): { ink: number; top: number; chain: number } }; m: RScene; y: RScene; fs: FillStructure; fr: FillFrame }
const cache = new Map<string, Ent>();
specs.forEach((sp, row) => {
  let e = cache.get(sp.scene);
  if (!e) {
    let scene: curO.SceneIn; let st: curO.DiagramStructure; let fs: FillStructure;
    if (sp.scene.includes("/")) {
      const [name, fstr] = sp.scene.split("/");
      let r = recs.get(name);
      if (!r) { const s0 = loadRec(name, 0); const st0 = curO.structure(s0); r = { s0, st: st0, fs: fillStructure(st0, fillResolution(st0, curO.frame(st0, s0))) }; recs.set(name, r); }
      scene = loadRec(name, Number(fstr)); st = r.st; fs = r.fs;
    } else { scene = loadScene(sp.scene); st = curO.structure(scene); fs = fillStructure(st, fillResolution(st, curO.frame(st, scene))); }
    const table = curO.frame(st, scene);
    const fb = new FormB(JSON.parse(JSON.stringify(scene)) as never, { dpr: 2 }) as never;
    const m = rScene(table, scene, baseD as unknown as typeof curD);
    const y = rScene(table, scene, curD); y.faces = [];
    const fr = fillFrame(fs, st, table, scene);
    e = { scene, fb, m, y, fs, fr }; cache.set(sp.scene, e);
  }
  const c0 = Math.round(sp.x * ppu - P / 2); const r0 = Math.round(sp.y * ppu - P / 2);
  const bInk = new Float32Array(P * P); const bCh = new Int32Array(P * P);
  for (let r = 0; r < P; r++) for (let c = 0; c < P; c++) {
    const ev = e.fb.evalPoint((c0 + c + 0.5) / ppu, (r0 + r + 0.5) / ppu);
    bInk[r * P + c] = Math.min(1, Math.max(0, ev.ink)); bCh[r * P + c] = ev.top < 0 ? -1 : ev.chain;
  }
  const rm = rasterR(e.m, c0, r0, P, ppu); const ry = rasterR(e.y, c0, r0, P, ppu);
  const own = rasterFill(e.fs, e.fr, c0 / ppu, r0 / ppu, P, P, ppu);
  let worse = 0; let better = 0; let wrongChainMine = 0; let wrongChainMaster = 0;
  for (let r = 0; r < P; r++) for (let c = 0; c < P; c++) {
    const i = r * P + c; const mineCh = own[i] - 1;
    put(row, 0, r, c, shade(bCh[i], bInk[i]));
    put(row, 1, r, c, shade(rm.own[i], rm.ink[i]));
    put(row, 2, r, c, shade(mineCh, ry.ink[i]));
    const b = bCh[i] >= 0; const okM = (rm.own[i] >= 0) === b; const okY = (mineCh >= 0) === b;
    if (b && rm.own[i] >= 0 && rm.own[i] !== bCh[i]) wrongChainMaster++;
    if (b && mineCh >= 0 && mineCh !== bCh[i]) wrongChainMine++;
    put(row, 3, r, c, okM && okY ? (b ? [235, 235, 235] : [255, 255, 255]) : !okY && okM ? [230, 40, 40] : okY && !okM ? [40, 190, 60] : [110, 110, 110]);
    if (!okY && okM) worse++; if (okY && !okM) better++;
  }
  console.log(`${sp.label ?? ""} ${sp.scene} (${sp.x}, ${sp.y}): fill vs form B, mine wrong where master right ${worse} px, master wrong where mine right ${better} px; top chain differs from form B's: master ${wrongChainMaster} px, mine ${wrongChainMine} px`);
});
const crcT = new Int32Array(256).map((_, m) => { let c = m; for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = (b: Buffer): number => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t: string, d: Buffer): Buffer => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const cb = Buffer.alloc(4); cb.writeUInt32BE(crc(td)); return Buffer.concat([l, td, cb]); };
const raw = Buffer.alloc((Wt * 3 + 1) * Ht); for (let r = 0; r < Ht; r++) { raw[r * (Wt * 3 + 1)] = 0; Buffer.from(img.buffer, r * Wt * 3, Wt * 3).copy(raw, r * (Wt * 3 + 1) + 1); }
const ih = Buffer.alloc(13); ih.writeUInt32BE(Wt, 0); ih.writeUInt32BE(Ht, 4); ih[8] = 8; ih[9] = 2;
writeFileSync(out, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ih), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]));
console.log(`wrote ${out} (${Wt}x${Ht})`);
