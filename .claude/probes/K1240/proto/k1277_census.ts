// K1277: the triangle fill (fill_tri.ts) against master's stencil fill
// (the table's faces, even-odd per face, table order), both against form B.
//
// At rest (stage 14's census measure, its cached form B grids):
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1277_census.ts rest [filter] [--ppu=40] [--min=2]
// per scene: fill (filled where form B shows paper) and paper (paper where
// form B covers) for master (A) and the triangles (B), then the spots where
// B alone leaves paper on form B's cover (cracks) and B alone fills form B's
// paper (spills), and K1273's speck on muse_hash.
//
// On stage 15's motion:
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1277_census.ts motion <def|fat> [--ppu=40] [--every=1]
// structure once on frame 0 (the diagram and the fill topology), then per
// frame: assert the frame's diagram and its fill topology equal frame 0's,
// frame the table with frame 0's structure, raster master and the
// triangles, and evaluate form B only where the two differ (the common
// pixels cancel in "no more crack, no more spill than master").
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FormB } from "../../../../src/render/field/form_b";
import { structure, frame, type SceneIn, type OutlineFace, type DiagramStructure } from "./outline";
import { fillResolution, fillStructure, fillFrame, fillSig, rasterFill } from "./fill_tri";
import { zChains } from "./draw";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const pos = args.filter((a) => !a.startsWith("--"));
const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const mode = pos[0] ?? "rest";
const ppu = Number(opt("ppu") ?? 40); const minPx = Number(opt("min") ?? 2);
const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const ALL = ["muse_hash", "muse_default_tw", "def", "fat", "ring", "user_tw42.lightpaper", "g41_def_tw42", "g41_def_tw64", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64"];
const outDir = join(here, "..", "out", "k1277"); mkdirSync(outDir, { recursive: true });
const fbDir = join(here, "..", "out", "s14", "fb"); mkdirSync(fbDir, { recursive: true });

/** Master's fill: k1247s14_census's paint (even-odd per face, table order). */
export function paintFaces(faces: OutlineFace[], x0: number, y0: number, W: number, H: number, s: number): Int32Array {
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

function gridOf(scene: SceneIn): { x0: number; y0: number; W: number; H: number } {
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  for (const c of scene.chains) for (let i = 0; i + 1 < c.pts.length; i += 2) { x0 = Math.min(x0, c.pts[i]); x1 = Math.max(x1, c.pts[i]); y0 = Math.min(y0, c.pts[i + 1]); y1 = Math.max(y1, c.pts[i + 1]); }
  x0 = Math.floor(x0 - 2); y0 = Math.floor(y0 - 2); x1 = Math.ceil(x1 + 2); y1 = Math.ceil(y1 + 2);
  return { x0, y0, W: Math.round((x1 - x0) * ppu), H: Math.round((y1 - y0) * ppu) };
}

function fbGrid(nm: string, scene: SceneIn): { x0: number; y0: number; W: number; H: number; top: Int32Array } {
  const g = gridOf(scene);
  const file = join(fbDir, `${nm}_${ppu}.bin`);
  if (existsSync(file)) {
    const b = readFileSync(file); const hd = new Float64Array(b.buffer.slice(b.byteOffset, b.byteOffset + 32));
    if (hd[0] === g.x0 && hd[1] === g.y0 && hd[2] === g.W && hd[3] === g.H) return { ...g, top: new Int32Array(b.buffer.slice(b.byteOffset + 32, b.byteOffset + 32 + 4 * g.W * g.H)) };
  }
  const t0 = Date.now(); const fb = new FormB(scene as never, { dpr: 2 }) as unknown as { evalPoint(x: number, y: number): { top: number } };
  const top = new Int32Array(g.W * g.H);
  for (let r = 0; r < g.H; r++) for (let c = 0; c < g.W; c++) top[r * g.W + c] = fb.evalPoint(g.x0 + (c + 0.5) / ppu, g.y0 + (r + 0.5) / ppu).top;
  writeFileSync(file, Buffer.concat([Buffer.from(new Float64Array([g.x0, g.y0, g.W, g.H]).buffer), Buffer.from(top.buffer)]));
  console.error(`${nm}: form B ${g.W}x${g.H} sampled in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  return { ...g, top };
}

export interface Cl { n: number; x: number; y: number; w: number; h: number }
function clusters(m: Uint8Array, W: number, H: number, x0: number, y0: number): Cl[] {
  const seen = new Uint8Array(W * H); const res: Cl[] = []; const st: number[] = [];
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
const fmt = (c: Cl): string => `${c.n} px at (${c.x.toFixed(2)}, ${c.y.toFixed(2)}) ${c.w.toFixed(3)}x${c.h.toFixed(3)}`;

function loadNamed(nm: string): SceneIn {
  const s = JSON.parse(readFileSync(join(SCENE_DIR, `${nm}.json`), "utf8")) as SceneIn;
  (s.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
  return s;
}

// The diagram: chains (id, closed), crossings, junction arms, dead ends.
// The chains' point counts are not the diagram (a recording's chain can
// gain points mid-motion); ptsSig reports them separately.
const ptsSig = (s: SceneIn): string => s.chains.map((c) => `${c.id}:${c.pts.length}`).join(",");
const diagSig = (s: SceneIn): string => [s.chains.map((c) => `${c.id}:${c.closed ? 1 : 0}`).join(","), s.crossings.map((x) => `${x.a.chain}/${x.b.chain}/${x.over}`).join(","),
  s.junctions.map((j) => `${j.id}:${j.arms.map((a) => `${a.chain}${a.kind[0]}${a.dir}`).join("")}`).join(","), s.deadEnds.map((d) => d.chain).join(",")].join("|");

const isMain = !!process.argv[1] && process.argv[1].includes("k1277_census");
if (isMain && mode === "rest") {
  const filt = pos[1];
  const summary: Record<string, unknown> = {};
  let pass = true;
  console.log(`K1277 census at rest, ${ppu} px/unit: A = master (faces, even-odd), B = triangles; fill = filled on form B's paper, paper = paper on form B's cover`);
  for (const nm of ALL) {
    if (filt && !nm.includes(filt)) continue;
    const scene = loadNamed(nm);
    const st = structure(scene); const table = frame(st, scene);
    const fs = fillStructure(st, fillResolution(st, table));
    const fr = fillFrame(fs, st, table, scene);
    const g = fbGrid(nm, scene);
    const gA = paintFaces(table.faces, g.x0, g.y0, g.W, g.H, ppu);
    const gB = rasterFill(fs, fr, g.x0, g.y0, g.W, g.H, ppu);
    let aFill = 0; let aPaper = 0; let bFill = 0; let bPaper = 0;
    const crack = new Uint8Array(g.W * g.H); const spill = new Uint8Array(g.W * g.H);
    const crackA = new Uint8Array(g.W * g.H); const spillA = new Uint8Array(g.W * g.H);
    for (let i = 0; i < g.W * g.H; i++) {
      const cov = g.top[i] >= 0; const a = gA[i] !== 0; const b = gB[i] !== 0;
      if (a && !cov) aFill++; if (!a && cov) aPaper++; if (b && !cov) bFill++; if (!b && cov) bPaper++;
      if (cov && a && !b) crack[i] = 1; if (!cov && b && !a) spill[i] = 1;
      if (cov && b && !a) crackA[i] = 1; if (!cov && a && !b) spillA[i] = 1;
    }
    const ok = bFill <= aFill && bPaper <= aPaper; if (!ok) pass = false;
    const cr = clusters(crack, g.W, g.H, g.x0, g.y0); const sp = clusters(spill, g.W, g.H, g.x0, g.y0);
    const crA = clusters(crackA, g.W, g.H, g.x0, g.y0); const spA = clusters(spillA, g.W, g.H, g.x0, g.y0);
    const sum = (l: Cl[]): number => l.reduce((s, c) => s + c.n, 0);
    console.log(`${nm} (${g.W}x${g.H}, ${fs.nV} v, ${fs.idx.length / 3} tri, fallbacks ${fr.fallbacks}): A fill ${aFill} paper ${aPaper} | B fill ${bFill} paper ${bPaper} ${ok ? "ok" : "WORSE"} | B-only cracks ${sum(cr)} px in ${cr.length}, B-only spills ${sum(sp)} px in ${sp.length} | A-only cracks ${sum(crA)} in ${crA.length}, A-only spills ${sum(spA)} in ${spA.length}`);
    for (const c of cr.filter((c) => c.n >= minPx).slice(0, 8)) console.log(`  crack ${fmt(c)}`);
    for (const c of sp.filter((c) => c.n >= minPx).slice(0, 8)) console.log(`  spill ${fmt(c)}`);
    if (nm === "muse_hash") {
      // K1273's speck: (26.86, 22.32); pixels within 0.1 unit.
      let cov = 0; let a = 0; let b = 0;
      for (let r = 0; r < g.H; r++) for (let c = 0; c < g.W; c++) {
        const x = g.x0 + (c + 0.5) / ppu; const y = g.y0 + (r + 0.5) / ppu;
        if (Math.hypot(x - 26.86, y - 22.32) > 0.1) continue;
        const i = r * g.W + c; if (g.top[i] >= 0) { cov++; if (gA[i] === 0) a++; if (gB[i] === 0) b++; }
      }
      console.log(`  K1273 speck (26.86, 22.32) r 0.1: form B covers ${cov} px; paper there: master ${a}, triangles ${b}`);
    }
    summary[nm] = { aFill, aPaper, bFill, bPaper, ok, cracks: cr.slice(0, 20), spills: sp.slice(0, 20), crackA: crA.slice(0, 20), spillA: spA.slice(0, 20), nV: fs.nV, nTri: fs.idx.length / 3, fallbacks: fr.fallbacks };
  }
  console.log(pass ? "census: triangles no worse than master on every scene" : "census: triangles worse than master somewhere");
  writeFileSync(join(outDir, `rest_${filt ?? "all"}_${ppu}.json`), JSON.stringify(summary));
} else if (isMain && mode === "motion") {
  const name = pos[1] ?? "def";
  const every = Number(opt("every") ?? 1);
  const dir = join(here, "..", "out", "s15", `rec_${name}`);
  const files = readdirSync(dir).filter((f) => f.endsWith(".json.gz")).sort();
  const load = (f: string): SceneIn => { const s = JSON.parse(gunzipSync(readFileSync(join(dir, f))).toString("utf8")) as SceneIn; (s.look as { ctrlArc?: number }).ctrlArc ??= 0.47; return s; };
  const s0 = load(files[0]);
  const st0: DiagramStructure = structure(s0);
  const t0 = frame(st0, s0);
  const res0 = fillResolution(st0, t0);
  const fs0 = fillStructure(st0, res0);
  const sig0 = fillSig(fs0); const dsig0 = diagSig(s0); const psig0 = ptsSig(s0);
  let ptsChanged = 0; let denseMax = 0;
  console.log(`${name}: ${files.length} frames; fill ${fs0.nV} vertices, ${fs0.idx.length / 3} triangles, sig ${sig0}; ${ppu} px/unit`);
  const rows: { f: number; fillA: number; paperA: number; fillB: number; paperB: number; diff: number; fallbacks: number; ms: number }[] = [];
  const worstCr: (Cl & { f: number })[] = []; const worstSp: (Cl & { f: number })[] = [];
  let topoBad = 0; let worse = 0;
  for (let f = 0; f < files.length; f += every) {
    const tA = Date.now();
    const sc = f === 0 ? s0 : load(files[f]);
    // The topology assert: this frame's diagram, and the fill topology it
    // gives (at frame 0's resolution), equal frame 0's.
    const dOk = diagSig(sc) === dsig0;
    const fsF = fillStructure(structure(sc), res0);
    const tOk = fillSig(fsF) === sig0;
    if (!dOk || !tOk) { topoBad++; console.log(`frame ${f}: TOPOLOGY DIFFERS (diagram ${dOk ? "same" : "differs"}, fill ${tOk ? "same" : fillSig(fsF)})`); }
    if (ptsSig(sc) !== psig0) { ptsChanged++; if (ptsChanged <= 3) console.log(`frame ${f}: chain point counts differ from frame 0's (diagram and fill topology ${dOk && tOk ? "same" : "differ"})`); }
    const table = frame(st0, sc);
    const zz = zChains(sc);
    const fr = fillFrame(fs0, st0, table, sc, zz);
    denseMax = Math.max(denseMax, fr.dense);
    const g = gridOf(sc);
    const gA = paintFaces(table.faces, g.x0, g.y0, g.W, g.H, ppu);
    const gB = rasterFill(fs0, fr, g.x0, g.y0, g.W, g.H, ppu);
    const fb = new FormB(sc as never, { dpr: 2 }) as unknown as { evalPoint(x: number, y: number): { top: number } };
    let fillA = 0; let paperA = 0; let fillB = 0; let paperB = 0; let diff = 0;
    const crack = new Uint8Array(g.W * g.H); const spill = new Uint8Array(g.W * g.H);
    for (let i = 0; i < g.W * g.H; i++) {
      const a = gA[i] !== 0; const b = gB[i] !== 0;
      if (a === b) continue;
      diff++;
      const r = Math.floor(i / g.W); const c = i % g.W;
      const cov = fb.evalPoint(g.x0 + (c + 0.5) / ppu, g.y0 + (r + 0.5) / ppu).top >= 0;
      if (a && !cov) fillA++; if (!a && cov) paperA++; if (b && !cov) fillB++; if (!b && cov) paperB++;
      if (cov && a && !b) crack[i] = 1; if (!cov && b && !a) spill[i] = 1;
    }
    const cr = clusters(crack, g.W, g.H, g.x0, g.y0); const sp = clusters(spill, g.W, g.H, g.x0, g.y0);
    if (cr[0]) worstCr.push({ ...cr[0], f }); if (sp[0]) worstSp.push({ ...sp[0], f });
    const bad = fillB > fillA || paperB > paperA; if (bad) worse++;
    const ms = Date.now() - tA;
    rows.push({ f, fillA, paperA, fillB, paperB, diff, fallbacks: fr.fallbacks, ms });
    if (f % 20 === 0 || bad) console.log(`frame ${f}: differing px ${diff}: master fill ${fillA} paper ${paperA} | triangles fill ${fillB} paper ${paperB} ${bad ? "WORSE" : "ok"} | worst crack ${cr[0] ? fmt(cr[0]) : "-"} | worst spill ${sp[0] ? fmt(sp[0]) : "-"} | fallbacks ${fr.fallbacks} | ${ms} ms`);
  }
  worstCr.sort((a, b) => b.n - a.n); worstSp.sort((a, b) => b.n - a.n);
  const tot = (k: "fillA" | "paperA" | "fillB" | "paperB"): number => rows.reduce((s, r) => s + r[k], 0);
  console.log(`${name}: ${rows.length} frames; topology differs on ${topoBad}; chain point counts differ on ${ptsChanged}; dense border pieces at most ${denseMax}; triangles worse than master on ${worse} frames`);
  console.log(`  totals over the differing px: master fill ${tot("fillA")} paper ${tot("paperA")} | triangles fill ${tot("fillB")} paper ${tot("paperB")}`);
  console.log(`  worst cracks: ${worstCr.slice(0, 5).map((c) => `f${c.f} ${fmt(c)}`).join("; ")}`);
  console.log(`  worst spills: ${worstSp.slice(0, 5).map((c) => `f${c.f} ${fmt(c)}`).join("; ")}`);
  writeFileSync(join(outDir, `motion_${name}_${ppu}.json`), JSON.stringify({ rows, worstCr: worstCr.slice(0, 20), worstSp: worstSp.slice(0, 20), topoBad, ptsChanged, denseMax, worse }));
}
