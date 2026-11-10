// K1247 s14: the coverage census against form B, whole scenes. For each
// scene, at rest (table_<scene>_0.json from two k1247c_dump sets), paints the
// filled faces as k1247s12_facecrops does (table order, even-odd per face,
// holes and ownerless faces skipped) on a <ppu> px/unit grid over the scene's
// chain bbox + 2 units, and compares each set with form B's top surface
// sampled at the pixel centres (cached per scene and ppu in out/s14/fb/).
// Prints, per table set: filled where form B shows paper ("fill"), paper
// where form B covers ("paper"). Then lists the spots (8-connected clusters)
// where B has paper that A fills and form B covers ("crack"), and where B
// fills what A leaves paper and form B shows paper ("spill"), largest first.
// Usage (from the worktree root):
//   node scripts/run_node.mjs <this> <subA> <subB> [ppu=40] [scene filter] [--min=2] [--json=<name>]
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FormB } from "../../../../src/render/field/form_b";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const pos = args.filter((a) => !a.startsWith("--"));
const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const [subA, subB, ppuS, filt] = pos;
const ppu = Number(ppuS ?? 40); const minPx = Number(opt("min") ?? 2); const jsonName = opt("json");
const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const ALL = ["muse_hash", "muse_default_tw", "def", "fat", "ring", "user_tw42.lightpaper", "g41_def_tw42", "g41_def_tw64", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64"];
const outDir = join(here, "..", "out", "s14"); const fbDir = join(outDir, "fb"); mkdirSync(fbDir, { recursive: true });

function paint(faces: any[], x0: number, y0: number, W: number, H: number, s: number): Int32Array {
  const g = new Int32Array(W * H); const xs: number[] = [];
  for (const f of faces) {
    if (f.hole || f.ownerChain < 0) continue;
    const n = f.pts.length / 2; if (n < 3) continue;
    let fy0 = Infinity; let fy1 = -Infinity;
    for (let i = 0; i < n; i++) { fy0 = Math.min(fy0, f.pts[2 * i + 1]); fy1 = Math.max(fy1, f.pts[2 * i + 1]); }
    const r0 = Math.max(0, Math.floor((fy0 - y0) * s)); const r1 = Math.min(H - 1, Math.ceil((fy1 - y0) * s));
    for (let r = r0; r <= r1; r++) {
      const y = y0 + (r + 0.5) / s; xs.length = 0;
      for (let i = 0; i < n; i++) {
        const ax = f.pts[2 * i]; const ay = f.pts[2 * i + 1]; const j = (i + 1) % n; const bx = f.pts[2 * j]; const by = f.pts[2 * j + 1];
        if ((ay <= y) !== (by <= y)) xs.push(ax + ((y - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((u, v) => u - v);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const c0 = Math.max(0, Math.ceil((xs[k] - x0) * s - 0.5)); const c1 = Math.min(W - 1, Math.floor((xs[k + 1] - x0) * s - 0.5));
        for (let c = c0; c <= c1; c++) g[r * W + c] = f.ownerChain + 1;
      }
    }
  }
  return g;
}

// Form B's top surface (-1 = paper) on the scene grid, cached.
function fbGrid(nm: string): { x0: number; y0: number; W: number; H: number; top: Int32Array } {
  const scene = JSON.parse(readFileSync(join(SCENE_DIR, `${nm}.json`), "utf8"));
  (scene.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  for (const c of scene.chains) for (let i = 0; i + 1 < c.pts.length; i += 2) { x0 = Math.min(x0, c.pts[i]); x1 = Math.max(x1, c.pts[i]); y0 = Math.min(y0, c.pts[i + 1]); y1 = Math.max(y1, c.pts[i + 1]); }
  x0 = Math.floor(x0 - 2); y0 = Math.floor(y0 - 2); x1 = Math.ceil(x1 + 2); y1 = Math.ceil(y1 + 2);
  const W = Math.round((x1 - x0) * ppu); const H = Math.round((y1 - y0) * ppu);
  const file = join(fbDir, `${nm}_${ppu}.bin`);
  if (existsSync(file)) {
    const b = readFileSync(file); const hd = new Float64Array(b.buffer.slice(b.byteOffset, b.byteOffset + 32));
    if (hd[0] === x0 && hd[1] === y0 && hd[2] === W && hd[3] === H) return { x0, y0, W, H, top: new Int32Array(b.buffer.slice(b.byteOffset + 32, b.byteOffset + 32 + 4 * W * H)) };
  }
  const t0 = Date.now(); const fb = new FormB(scene as never, { dpr: 2 }) as any;
  const top = new Int32Array(W * H);
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) top[r * W + c] = fb.evalPoint(x0 + (c + 0.5) / ppu, y0 + (r + 0.5) / ppu).top;
  const hd = new Float64Array([x0, y0, W, H]);
  writeFileSync(file, Buffer.concat([Buffer.from(hd.buffer), Buffer.from(top.buffer)]));
  console.error(`${nm}: form B ${W}x${H} sampled in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  return { x0, y0, W, H, top };
}

// 8-connected clusters of a mask: px, centroid (world), bbox (world).
function clusters(m: Uint8Array, W: number, H: number, x0: number, y0: number): { n: number; x: number; y: number; w: number; h: number }[] {
  const seen = new Uint8Array(W * H); const res: { n: number; x: number; y: number; w: number; h: number }[] = []; const st: number[] = [];
  for (let i = 0; i < W * H; i++) {
    if (!m[i] || seen[i]) continue;
    let n = 0; let sx = 0; let sy = 0; let c0 = W; let c1 = 0; let r0 = H; let r1 = 0;
    st.length = 0; st.push(i); seen[i] = 1;
    while (st.length) {
      const k = st.pop()!; const r = Math.floor(k / W); const c = k % W; n++; sx += c; sy += r;
      c0 = Math.min(c0, c); c1 = Math.max(c1, c); r0 = Math.min(r0, r); r1 = Math.max(r1, r);
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const rr = r + dr; const cc = c + dc; if (rr < 0 || rr >= H || cc < 0 || cc >= W) continue;
        const kk = rr * W + cc; if (m[kk] && !seen[kk]) { seen[kk] = 1; st.push(kk); }
      }
    }
    res.push({ n, x: x0 + (sx / n + 0.5) / ppu, y: y0 + (sy / n + 0.5) / ppu, w: (c1 - c0 + 1) / ppu, h: (r1 - r0 + 1) / ppu });
  }
  return res.sort((a, b) => b.n - a.n);
}

const summary: Record<string, unknown> = {};
let pass = true;
console.log(`census ${subA} (A) vs ${subB} (B) at ${ppu} px/unit; fill = filled where form B shows paper, paper = paper where form B covers`);
for (const nm of ALL) {
  if (filt && !nm.includes(filt)) continue;
  const fA = join(here, "..", "out", subA, `table_${nm}_0.json`); const fBf = join(here, "..", "out", subB, `table_${nm}_0.json`);
  if (!existsSync(fA) || !existsSync(fBf)) { console.log(`${nm}: missing table`); continue; }
  const g = fbGrid(nm);
  const tA = JSON.parse(readFileSync(fA, "utf8")); const tB = JSON.parse(readFileSync(fBf, "utf8"));
  const gA = paint((tA.table ?? tA).faces, g.x0, g.y0, g.W, g.H, ppu); const gB = paint((tB.table ?? tB).faces, g.x0, g.y0, g.W, g.H, ppu);
  let aFill = 0; let aPaper = 0; let bFill = 0; let bPaper = 0;
  const crack = new Uint8Array(g.W * g.H); const spill = new Uint8Array(g.W * g.H);
  for (let i = 0; i < g.W * g.H; i++) {
    const cov = g.top[i] >= 0; const a = gA[i] !== 0; const b = gB[i] !== 0;
    if (a && !cov) aFill++; if (!a && cov) aPaper++; if (b && !cov) bFill++; if (!b && cov) bPaper++;
    if (cov && a && !b) crack[i] = 1; if (!cov && b && !a) spill[i] = 1;
  }
  const ok = bFill <= aFill && bPaper <= aPaper; if (!ok) pass = false;
  const cr = clusters(crack, g.W, g.H, g.x0, g.y0); const sp = clusters(spill, g.W, g.H, g.x0, g.y0);
  const crN = cr.reduce((s, c) => s + c.n, 0); const spN = sp.reduce((s, c) => s + c.n, 0);
  console.log(`${nm} (${g.W}x${g.H}): A fill ${aFill} paper ${aPaper} | B fill ${bFill} paper ${bPaper} ${ok ? "ok" : "WORSE"} | B-only paper (cracks) ${crN} px in ${cr.length}, B-only fill (spills) ${spN} px in ${sp.length}`);
  const fmt = (c: { n: number; x: number; y: number; w: number; h: number }): string => `${c.n} px at (${c.x.toFixed(2)}, ${c.y.toFixed(2)}) ${c.w.toFixed(3)}x${c.h.toFixed(3)}`;
  for (const c of cr.filter((c) => c.n >= minPx)) console.log(`  crack ${fmt(c)}`);
  for (const c of sp.filter((c) => c.n >= minPx)) console.log(`  spill ${fmt(c)}`);
  summary[nm] = { aFill, aPaper, bFill, bPaper, ok, cracks: cr, spills: sp };
}
console.log(pass ? "census: B no worse than A on every scene" : "census: B worse than A somewhere");
if (jsonName) writeFileSync(join(outDir, `${jsonName}.json`), JSON.stringify(summary));
