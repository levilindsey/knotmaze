// K1247 WASM step 1: record one def frame's kernel calls.
// Runs outline_rec.ts (make_rec.mjs's recording copy of ../proto/outline.ts):
// three warm frames, then one recorded frame. Writes out/rec_<scene>.json
// (layout) + out/rec_<scene>.bin (Float64 data): the polylines each kernel
// touched (snapshotted at first touch), marginOfC's tangent tables, and per
// call the inputs and the answers of footNearM, footWinFast and marginOfC.
//   node scripts/run_node.mjs .claude/probes/K1240/wasm/record.ts [scene]
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { structure, frame, __recSourceSha, __recH, type SceneIn } from "./outline_rec";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "out");
mkdirSync(outDir, { recursive: true });
const name = process.argv[2] ?? "def";
const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const scene = JSON.parse(readFileSync(join(SCENE_DIR, `${name}.json`), "utf8")) as SceneIn;
(scene.look as { ctrlArc?: number }).ctrlArc ??= 0.47;

type P = { id: number; n: number; closed: boolean; nseg: number; len: number; s0: number; nblk: number; [k: string]: unknown };
const R = { on: false, C: null, fnm: [] as number[], fwf: [] as number[], moc: [] as number[], polys: new Map<number, P>(), tans: new Map<number, Float64Array[]>() };
(globalThis as unknown as { __wrec: typeof R }).__wrec = R;

const st = structure(scene);
for (let i = 0; i < 3; i++) frame(st, scene);
R.on = true;
const t0 = performance.now();
frame(st, scene);
const tRec = performance.now() - t0;
R.on = false;

const chunks: Float64Array[] = [];
let off = 0;
function put(a: ArrayLike<number>, len: number): number { const o = off; const c = new Float64Array(len); for (let i = 0; i < len; i++) c[i] = a[i]; chunks.push(c); off += len; return o; }
const polys = [...R.polys.entries()].sort((a, b) => a[0] - b[0]).map(([pi, p]) => {
  const n = p.n; const ns = p.nseg; const nb = p.nblk;
  const o: Record<string, number> = {};
  for (const k of ["x", "y", "s"]) o[k] = put(p[k] as Float64Array, n);
  for (const k of ["segLen", "dx", "dy", "bx0", "by0", "bx1", "by1"]) o[k] = put(p[k] as Float64Array, ns);
  o.bk = put(p.bk as Float64Array, 4 * nb);
  return { pi, id: p.id, n, nseg: ns, closed: p.closed, len: p.len, s0: p.s0, nblk: nb, off: o };
});
const tans = [...R.tans.entries()].sort((a, b) => a[0] - b[0]).map(([pi, t]) => ({ pi, len: t[0].length, off: { tx: put(t[0], t[0].length), ty: put(t[1], t[1].length), gf: put(t[2], t[2].length), gb: put(t[3], t[3].length) } }));
const FNM = 14; const FWF = 16; const MOC = 9 + 15 + 1 + 15;
const calls = {
  fnm: { stride: FNM, count: R.fnm.length / FNM, off: put(R.fnm, R.fnm.length), fields: "in: pi dir sR L x y hintS(u) hintK | out: d x y s k u" },
  fwf: { stride: FWF, count: R.fwf.length / FWF, off: put(R.fwf, R.fwf.length), fields: "in: pi fwA[0..8] | out: d x y s k u" },
  moc: { stride: MOC, count: R.moc.length / MOC, off: put(R.moc, R.moc.length), fields: "in: pi dir sR L qx qy u d k cache[15] | out: r cache[15]" },
};
const all = new Float64Array(off);
let p0 = 0;
for (const c of chunks) { all.set(c, p0); p0 += c.length; }
const meta = { scene: name, sourceSha: __recSourceSha, h: __recH(), recordedFrameMs: +tRec.toFixed(1), polys, tans, calls, total: off };
writeFileSync(join(outDir, `rec_${name}.json`), JSON.stringify(meta, null, 1));
writeFileSync(join(outDir, `rec_${name}.bin`), Buffer.from(all.buffer));
console.log(`${name}: h=${meta.h} polys ${polys.length} (segs ${polys.reduce((a, p) => a + p.nseg, 0)}) tans ${tans.length}; footNearM ${calls.fnm.count}, footWinFast ${calls.fwf.count}, marginOfC ${calls.moc.count}; ${(off * 8 / 1e6).toFixed(2)} MB`);
