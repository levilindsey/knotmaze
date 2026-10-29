// K1040 S1 step 3: form B's reference (src/render/field/form_b.ts) on the
// 12 K868 scenes.
//   cd <worktree>; npx vite-node .claude/probes/K1040/s1/scenes.ts [scene,...]
//   env SCALE: raster px per CSS px (default 1).
// Per scene:
// - K868 §6's checks (checks.ts runChecks) on form B's ink thresholded at
//   0.5, an exact 0/1 probe. #2 there is the oracle's own corner joins
//   (model only), so form B gets its own #2 below; #1 needs a render.
// - #1 (form B): interior ink on a raster at CSS px (checks.ts check1). F is
//   the EDT to the pixels where the top label changes: paper, a group, or a
//   piece that is its own surface (split where its s jumps by more than h).
// - #2 (form B): every corner ball with r > 0, both feet: ||t - q| - r|,
//   ||t - foot| - h| and the radius's tangent component at t.
// - #11 (form B): at every crossing centre in view, the top is the over.
// - The max decomposition: every inked raster pixel's winning term lies in
//   the strips that evaluate it (FormB.stripCheck).
// - Free ends: K900 indep.ts's side walk at h - W/2 on form B's ink >= 0.5,
//   counted with K934 exits.ts's runs (one exit or none is a free end).
// Writes out/scenes/<scene>.json; prints a summary per scene.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { type CheckContext, captionLines, check1, checkContext, edt2, runChecks, type InkProbe } from "../../../../src/render/field/checks";
import { normS, pointAt } from "../../../../src/render/field/geom";
import { FieldModel, cornerRadius, type OracleParams } from "../../../../src/render/field/oracle";
import type { FieldScene } from "../../../../src/render/field/scene";
import { FormB, OWN, TERM_NAMES } from "../../../../src/render/field/form_b";
import { exitsBoth } from "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K934/exits";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.OUT ?? join(here, "out", "scenes");
mkdirSync(outDir, { recursive: true });
const sceneDir = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const SCENES = [
  "muse_hash",
  "muse_default_tw",
  "def",
  "fat",
  "ring",
  "user_tw42.lightpaper",
  "g41_def_tw42",
  "g41_def_tw64",
  "g41_ring_tw42",
  "g41_ring_tw64",
  "g41_user_tw42",
  "g41_user_tw64",
];
const scenes = process.argv[2] ? process.argv[2].split(",") : SCENES;
const SCALE = Number(process.env.SCALE ?? 1);
const SKIP_CHECKS = process.env.SKIP_CHECKS === "1";

function loadScene(name: string): FieldScene {
  const s = JSON.parse(readFileSync(join(sceneDir, `${name}.json`), "utf8")) as FieldScene;
  s.look.ctrlArc ??= 0.47;
  return s;
}
/** K900 lib.ts's "mapping": K883's rule at cr 3. */
function mapping(s: FieldScene): OracleParams {
  const h = s.look.halfWidth;
  return { rRound: 0, rOf: (_j, _i, th, st) => (st === "round" ? cornerRadius(3, h, th) : 0), spans: "k883", crMax: 3 };
}
const r3 = (v: number) => Math.round(v * 1000) / 1000;

function raster(fb: FormB, s: FieldScene, ctx: CheckContext) {
  const [a, b, c, d, e, f] = s.camera.worldToCss;
  const det = a * d - b * c;
  const [vw, vh] = s.camera.viewport;
  const nx = Math.round(vw * SCALE);
  const ny = Math.round(vh * SCALE);
  const world = (i: number, j: number): [number, number] => {
    const u = (i + 0.5) / SCALE - e;
    const v = (j + 0.5) / SCALE - f;
    return [(d * u - c * v) / det, (-b * u + a * v) / det];
  };
  const n = nx * ny;
  const ink = new Float32Array(n);
  const top = new Int32Array(n);
  const chain = new Int32Array(n);
  const sv = new Float64Array(n);
  const kind = new Int8Array(n).fill(-1);
  const fade = new Int8Array(n);
  const strips = { inked: 0, bad: 0, byKind: {} as Record<string, number>, badByKind: {} as Record<string, number>, worst: [] as [number, number, string][] };
  let tie = 0;
  let multi = 0;
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      const o = j * nx + i;
      const [x, y] = world(i, j);
      const r = fb.evalPoint(x, y);
      ink[o] = r.ink;
      top[o] = r.top >= OWN ? OWN : r.top;
      chain[o] = r.chain;
      sv[o] = r.s;
      if (r.nSurf >= 2) multi++;
      if (r.fade & 4) tie++;
      fade[o] = r.fade;
      if (r.ink > 0 && r.term) {
        kind[o] = r.term.kind;
        strips.inked++;
        const k = TERM_NAMES[r.term.kind];
        strips.byKind[k] = (strips.byKind[k] ?? 0) + 1;
        const sc = fb.stripCheck(r.term, x, y);
        if (!sc.ok) {
          strips.bad++;
          strips.badByKind[`${k}/${sc.cls}`] = (strips.badByKind[`${k}/${sc.cls}`] ?? 0) + 1;
          if (strips.worst.length < 10) strips.worst.push([r3(x), r3(y), k]);
        }
      }
    }
  // Label boundaries: a pixel whose 4-neighbour has another top label, and paper.
  const same = (o1: number, o2: number): boolean => {
    if (top[o1] !== top[o2]) return false;
    if (top[o1] !== OWN) return true;
    if (chain[o1] !== chain[o2]) return false;
    const p = fb.polys[chain[o1]];
    let ds = Math.abs(sv[o1] - sv[o2]);
    if (p.closed) ds = Math.min(ds, p.len - ds);
    return ds <= fb.h;
  };
  const mask = new Uint8Array(n);
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      const o = j * nx + i;
      if (top[o] < 0) continue;
      let inside = true;
      if (i > 0 && !same(o, o - 1)) inside = false;
      else if (i < nx - 1 && !same(o, o + 1)) inside = false;
      else if (j > 0 && !same(o, o - nx)) inside = false;
      else if (j < ny - 1 && !same(o, o + nx)) inside = false;
      mask[o] = inside ? 1 : 0;
    }
  const D = edt2(mask, nx, ny);
  const F = new Float32Array(n);
  for (let o = 0; o < n; o++) F[o] = Math.sqrt(D[o]);
  const c1 = check1(ctx, nx, ny, ink, F, ctx.ppu * SCALE, world);
  let inkedPx = 0;
  for (let o = 0; o < n; o++) if (ink[o] > 0.5) inkedPx++;
  // #1's deep ink by winning term and fade bits, and its sites.
  const lim = fb.W * ctx.ppu * SCALE + 1;
  const deep: Record<string, number> = {};
  const deepSites: unknown[] = [];
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      const o = j * nx + i;
      if (!(ink[o] > 0.5 && F[o] > lim)) continue;
      const k = `${kind[o] >= 0 ? TERM_NAMES[kind[o]] : "none"}${fade[o] ? `+f${fade[o]}` : ""}`;
      deep[k] = (deep[k] ?? 0) + 1;
      if (deepSites.length < 12) {
        const [x, y] = world(i, j);
        deepSites.push({ at: [r3(x), r3(y)], F: r3(F[o]), ink: r3(ink[o]), k, top: top[o] === OWN ? "own" : top[o], chain: chain[o], s: r3(sv[o]) });
      }
    }
  return { nx, ny, c1, strips, tie, multi, inkedPx, deep, deepSites };
}

function ownCheck2(fb: FormB) {
  let n = 0;
  let eR = 0;
  let eH = 0;
  let eT = 0;
  for (const c of fb.corners) {
    if (!(c.r > 0)) continue;
    n++;
    const feet: [number, number, number, number][] = [
      [c.tax, c.tay, c.a, c.sA],
      [c.tbx, c.tby, c.b, c.sB],
    ];
    for (const [tx, ty, arm, sF] of feet) {
      const p = fb.polys[fb.arms[arm].pi];
      const at = pointAt(p, normS(p, sF));
      eR = Math.max(eR, Math.abs(Math.hypot(tx - c.qx, ty - c.qy) - c.r));
      eH = Math.max(eH, Math.abs(Math.hypot(tx - at.x, ty - at.y) - fb.h));
      // Tangency: the ball's radius at t is collinear with the tube's normal t − foot.
      eT = Math.max(eT, Math.abs(((tx - c.qx) * (ty - at.y) - (ty - c.qy) * (tx - at.x)) / (c.r * fb.h)));
    }
  }
  return { n, eR, eH, eT };
}

function ownCheck11(fb: FormB, s: FieldScene, ctx: CheckContext) {
  let n = 0;
  let bad = 0;
  const fails: unknown[] = [];
  s.crossings.forEach((x, i) => {
    const [cx, cy] = ctx.crossingPts[i];
    if (!ctx.inView(cx, cy, 0)) return;
    n++;
    const o = x.over === "a" ? x.a : x.b;
    const u = x.over === "a" ? x.b : x.a;
    const r = fb.evalPoint(cx, cy);
    let ok = r.chain === fb.idxOf.get(o.chain);
    if (ok && x.a.chain === x.b.chain) {
      const p = fb.polys[r.chain];
      const dist = (sa: number) => {
        const ds = Math.abs(r.s - sa);
        return p.closed ? Math.min(ds, p.len - ds) : ds;
      };
      ok = dist(o.s) < dist(u.s);
    }
    if (!ok) {
      bad++;
      if (fails.length < 12) fails.push({ i, at: [r3(cx), r3(cy)], top: r.top >= OWN ? "own" : r.top, chain: r.chain, over: fb.idxOf.get(o.chain), under: fb.idxOf.get(u.chain), s: r3(r.s), oS: r3(o.s), uS: r3(u.s), dz: r3(r.dz), dkey: r3(r.dkey), fade: r.fade, nSurf: r.nSurf });
    }
  });
  return { n, bad, fails };
}

interface FreeEnd {
  at: [number, number];
  chain: number;
  s: number;
  side: number;
  runs: number;
  angle: number;
  near: string;
}

function freeEnds(fb: FormB, s: FieldScene, ctx: CheckContext): FreeEnd[] {
  const h = fb.h;
  const W = fb.W;
  const step = Math.min(h / 8, 1 / (4 * ctx.ppu));
  const R = 0.8 * h;
  const g = W / 2;
  const inkXY = (x: number, y: number) => fb.evalPoint(x, y).ink >= 0.5;
  const nearJ = (x: number, y: number) => ctx.junctionPts.some(([px, py]) => Math.hypot(px - x, py - y) < 2 * h + W + fb.cr * h);
  const nearX = (x: number, y: number) => ctx.crossingPts.some(([px, py], i) => Math.hypot(px - x, py - y) < ctx.crossingR[i] + W);
  const out: FreeEnd[] = [];
  fb.polys.forEach((p) => {
    const n = Math.max(1, Math.ceil(p.len / step));
    const last = p.closed ? n - 1 : n;
    for (const side of [1, -1]) {
      const pts: { x: number; y: number; s: number; ink: boolean; view: boolean }[] = [];
      for (let k = 0; k <= last; k++) {
        const sk = p.s0 + (k / n) * p.len;
        const at = pointAt(p, normS(p, sk));
        const x = at.x - at.ty * side * (h - W / 2);
        const y = at.y + at.tx * side * (h - W / 2);
        const view = ctx.inView(x, y, 1);
        pts.push({ x, y, s: sk, view, ink: view ? inkXY(x, y) : false });
      }
      const NP = pts.length;
      for (let k = 0; k < NP; k++) {
        const a = pts[k];
        if (!a.view || !a.ink) continue;
        const nb = [k - 1, k + 1].map((j) => (p.closed ? pts[(j + NP) % NP] : pts[j]));
        if (!nb.some((b) => b && b.view && !b.ink)) continue;
        const e = exitsBoth(inkXY, a.x, a.y, R, g);
        if (e.runs <= 1)
          out.push({ at: [r3(a.x), r3(a.y)], chain: p.id, s: r3(a.s), side, runs: e.runs, angle: e.angle, near: nearJ(a.x, a.y) ? "junction" : nearX(a.x, a.y) ? "crossing" : "other" });
      }
    }
  });
  const merged: FreeEnd[] = [];
  for (const e of out) if (!merged.some((f) => Math.hypot(f.at[0] - e.at[0], f.at[1] - e.at[1]) < W)) merged.push(e);
  return merged;
}

const summary: string[] = [];
for (const name of scenes) {
  const t0 = Date.now();
  const s = loadScene(name);
  const m = new FieldModel(s, mapping(s));
  const ctx = checkContext(m);
  const fb = new FormB(s);
  const t1 = Date.now();
  const ras = raster(fb, s, ctx);
  const t2 = Date.now();
  const c2 = ownCheck2(fb);
  const c11 = ownCheck11(fb, s, ctx);
  const fe = freeEnds(fb, s, ctx);
  const t3 = Date.now();
  const probe: InkProbe = { cov: (x, y) => (fb.evalPoint(x, y).ink >= 0.5 ? 1 : 0), exact: true, label: "formB" };
  const checks = SKIP_CHECKS ? [] : runChecks(m, probe);
  const t4 = Date.now();
  const feBy = { junction: 0, crossing: 0, other: 0 } as Record<string, number>;
  for (const e of fe) feBy[e.near]++;
  const ppu = ctx.ppu;
  const rec = {
    scene: name,
    ms: { build: t1 - t0, raster: t2 - t1, own: t3 - t2, checks: t4 - t3 },
    raster: { nx: ras.nx, ny: ras.ny, scale: SCALE, inkedPx: ras.inkedPx, multiPx: ras.multi, tiePx: ras.tie },
    check1: ras.c1,
    check1deep: { byTerm: ras.deep, sites: ras.deepSites },
    check2own: { corners: c2.n, ballPx: c2.eR * ppu, footPx: c2.eH * ppu, tangent: c2.eT },
    check11own: c11,
    strips: ras.strips,
    freeEnds: { n: fe.length, by: feBy, list: fe },
    checks,
    captions: captionLines(checks),
    diagnostics: fb.diagnostics.slice(0, 20),
  };
  writeFileSync(join(outDir, `${name}.json`), JSON.stringify(rec, null, 1));
  const lines = [
    `== ${name}: build ${t1 - t0} ms, raster ${t2 - t1} ms (${ras.nx}x${ras.ny}), own ${t3 - t2} ms, checks ${t4 - t3} ms`,
    `  #1 (form B) ${ras.c1.status}: ${ras.c1.value} [lim W*ppu+1 = ${(fb.W * ppu * SCALE + 1).toFixed(2)} px] by term ${JSON.stringify(ras.deep)}`,
    `  #2 (form B) corners ${c2.n}: max ||t-q|-r| ${(c2.eR * ppu).toExponential(2)} px, ||t-foot|-h| ${(c2.eH * ppu).toExponential(2)} px, tangent ${c2.eT.toExponential(2)}`,
    `  #11 (form B) ${c11.bad === 0 ? "pass" : "FAIL"}: ${c11.bad} of ${c11.n} crossing centres not topped by the over`,
    `  strips: ${ras.strips.bad} of ${ras.strips.inked} inked px outside their term's strips ${JSON.stringify(ras.strips.badByKind)}; terms ${JSON.stringify(ras.strips.byKind)}`,
    `  free ends: ${fe.length} ${JSON.stringify(feBy)}; tie px ${ras.tie}, 2+ surfaces px ${ras.multi}`,
    ...rec.captions.map((l) => `  ${l}`),
  ];
  console.log(lines.join("\n"));
  summary.push(...lines);
}
writeFileSync(join(outDir, `summary${process.argv[2] ? "." + scenes.join("+").slice(0, 60) : ""}.txt`), summary.join("\n") + "\n");
