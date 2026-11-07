// K1240 S3f run 3: s3f_exact.ts against S3d's outline (5290da82), outputs s3dfresh*/s3dmove*.
// outline_s3d.ts is untracked; recreate it from the checkout's root with
//   node -e "require('fs').writeFileSync('.claude/probes/K1240/proto/outline_s3d.ts', require('child_process').execSync('git show 5290da82:.claude/probes/K1240/proto/outline.ts'))"
// K1240 S3: check_exact against the split (structure+frame); with
// --move[=mult] the table is frame(structure(S), S') and form B is S'.
// K1240 S2 Done 2: the structural outline against form B's exposed
// outline, both ways, in device pixels at dpr 2, outside F3's fade
// widths (a sample whose form B evaluation has any fade bit set is
// excluded and counted).
//
// Fix (S2 brief): S1 dropped every sample where form B gives no
// distance (Dexp = infinity). Those samples are, in the main, points
// exactly on an outline: evalPoint's Dexp is only the label-top
// surface's distance, and a point on its own chain's border is not
// covering (d = h, not < h), so the label top is another surface (or
// paper, top = -1) and its Dexp stays infinite even though the
// point's own foot term inks at D = 0. Measured here instead by the
// winning term: dA = min(|Dexp| if finite, |term.D| if a term won).
// A point buried under a fully covering surface does not win with
// its own term (its ink is multiplied by that surface's coverage),
// so this does not excuse buried borders. Samples with neither are
// measured against direction B's exposed candidate points, and any
// still unmeasured are reported as dropped, never silently.
// This file is a check: it may use the reference (form_b.ts); the
// builder (outline.ts) may not and does not.
//
//   node scripts/run_node.mjs .claude/probes/K1240/proto/check_exact.ts [scene,...]
//
// Writes out/exact_<scene>.json and out/exact_summary.md (untracked).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildOutline, structure, frame, type SceneIn, type OutlineTable } from "./outline_s3d";
import { FormB, TERM_NAMES } from "../../../../src/render/field/form_b";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "out", "s3f");
mkdirSync(outDir, { recursive: true });
const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const ALL = ["muse_hash", "muse_default_tw", "def", "fat", "ring", "user_tw42.lightpaper", "g41_def_tw42", "g41_def_tw64", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64"];
const moveArg = process.argv.find((a) => a.startsWith("--move"));
const freshArg = process.argv.includes("--fresh");
const moveMult = moveArg && moveArg.includes("=") ? Number(moveArg.split("=")[1]) : 0.1;
const nameArg = process.argv.slice(2).find((a) => !a.startsWith("--"));
const names = nameArg ? nameArg.split(",") : ALL;
// --consistent (K1240 S3f run 3, opt-in; the gated rows never pass it): every
// s also names the same material point on S', as the physics keeps a
// binding on its intersection, and junction centres move with the field.
// Without it a crossing's two pass points drift apart (fat at 0.5h: p50
// 2.0h, max 5.2h; s3f_claude_drift.ts). Its files carry a "c" (move0.5c_).
const consistentArg = process.argv.includes("--consistent");
function perturb(scene: SceneIn, A: number): SceneIn {
  const sc = JSON.parse(JSON.stringify(scene)) as SceneIn;
  const cumOf = (c: { closed: boolean; pts: number[] }): number[] => {
    const p = c.pts; const n = p.length / 2; const segs = c.closed ? n : n - 1; const cum = [0];
    for (let i = 0; i < segs; i++) { const j = (i + 1) % n; cum.push(cum[i] + Math.hypot(p[2 * j] - p[2 * i], p[2 * j + 1] - p[2 * i + 1])); }
    return cum;
  };
  const before = new Map(sc.chains.map((c) => [c.id, cumOf(c)]));
  const dxy = (x: number, y: number): [number, number] => [A * (0.7 * Math.sin(0.31 * y + 1.7) + 0.3 * Math.sin(0.83 * x + 0.4)), A * (0.7 * Math.cos(0.27 * x + 0.9) + 0.3 * Math.sin(0.71 * y + 2.3))];
  for (const c of sc.chains) {
    for (let i = 0; i + 1 < c.pts.length; i += 2) {
      const x = c.pts[i]; const y = c.pts[i + 1]; const d = dxy(x, y);
      c.pts[i] = x + d[0];
      c.pts[i + 1] = y + d[1];
    }
  }
  if (!consistentArg) return sc;
  const after = new Map(sc.chains.map((c) => [c.id, cumOf(c)]));
  const closedOf = new Map(sc.chains.map((c) => [c.id, c.closed]));
  const remap = (chain: number, s: number): number => {
    const o = before.get(chain); const p = after.get(chain);
    if (!o || !p || o.length < 2) return s;
    const L = o[o.length - 1]; let u = s;
    if (closedOf.get(chain) && L > 0) u = ((u % L) + L) % L;
    let i = 0; while (i + 2 < o.length && o[i + 1] < u) i++;
    const t = o[i + 1] > o[i] ? (u - o[i]) / (o[i + 1] - o[i]) : 0;
    return p[i] + (p[i + 1] - p[i]) * t;
  };
  const any = sc as unknown as { crossings?: { a: { chain: number; s: number }; b: { chain: number; s: number } }[]; junctions?: { c: number[]; arms: { chain: number; s: number }[] }[]; deadEnds?: { chain: number; s: number }[] };
  for (const x of any.crossings ?? []) { x.a.s = remap(x.a.chain, x.a.s); x.b.s = remap(x.b.chain, x.b.s); }
  for (const j of any.junctions ?? []) { const d = dxy(j.c[0], j.c[1]); j.c[0] += d[0]; j.c[1] += d[1]; for (const a of j.arms) a.s = remap(a.chain, a.s); }
  for (const e of any.deadEnds ?? []) e.s = remap(e.chain, e.s);
  return sc;
}

interface Spot { d: number; x: number; y: number; what: string; near: string }
function pct(sorted: number[], q: number): number {
  if (!sorted.length) return NaN;
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
}
function stats(ds: number[]): { n: number; p50: number; p99: number; max: number; over8: number; over2: number } {
  const s = ds.slice().sort((a, b) => a - b);
  return { n: s.length, p50: pct(s, 0.5), p99: pct(s, 0.99), max: s[s.length - 1] ?? NaN, over8: ds.filter((d) => d > 1 / 8).length, over2: ds.filter((d) => d > 1 / 2).length };
}

/** Distance from (x, y) to the outline pieces, via a small segment grid. */
function outlineDistance(table: OutlineTable, h: number): (x: number, y: number) => number {
  const cell = Math.max(2 * h, 0.05);
  const grid = new Map<string, number[]>();
  const segs: [number, number, number, number][] = [];
  for (const p of table.pieces) {
    for (let i = 0; i + 3 < p.pts.length; i += 2) {
      const id = segs.length;
      segs.push([p.pts[i], p.pts[i + 1], p.pts[i + 2], p.pts[i + 3]]);
      const x0 = Math.floor(Math.min(p.pts[i], p.pts[i + 2]) / cell); const x1 = Math.floor(Math.max(p.pts[i], p.pts[i + 2]) / cell);
      const y0 = Math.floor(Math.min(p.pts[i + 1], p.pts[i + 3]) / cell); const y1 = Math.floor(Math.max(p.pts[i + 1], p.pts[i + 3]) / cell);
      for (let ix = x0; ix <= x1; ix++) for (let iy = y0; iy <= y1; iy++) {
        const k = `${ix},${iy}`;
        const l = grid.get(k) ?? [];
        l.push(id);
        grid.set(k, l);
      }
    }
  }
  return (x: number, y: number): number => {
    for (let R = cell; R <= 64 * cell; R *= 2) {
      let best = Infinity;
      const x0 = Math.floor((x - R) / cell); const x1 = Math.floor((x + R) / cell);
      const y0 = Math.floor((y - R) / cell); const y1 = Math.floor((y + R) / cell);
      const seen = new Set<number>();
      for (let ix = x0; ix <= x1; ix++) for (let iy = y0; iy <= y1; iy++) {
        for (const id of grid.get(`${ix},${iy}`) ?? []) {
          if (seen.has(id)) continue;
          seen.add(id);
          const [ax, ay, bx, by] = segs[id];
          const ex = bx - ax; const ey = by - ay;
          const l2 = ex * ex + ey * ey;
          let t = l2 > 0 ? ((x - ax) * ex + (y - ay) * ey) / l2 : 0;
          t = Math.min(1, Math.max(0, t));
          best = Math.min(best, Math.hypot(ax + ex * t - x, ay + ey * t - y));
        }
      }
      if (best <= R) return best;
      if (R > 4) return best;
    }
    return Infinity;
  };
}

const summary: string[] = [`# K1240 exact check ${new Date().toISOString()}`, "", "| scene | dir | measured | dropped | p50 px | p99 px | max px | >1/8 | >1/2 | excl fade | inf/term/fallback |", "|---|---|---|---|---|---|---|---|---|---|---|"];
for (const name of names) {
  const origScene = JSON.parse(readFileSync(join(SCENE_DIR, `${name}.json`), "utf8")) as SceneIn & { look: SceneIn["look"] };
  (origScene.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
  const scene = moveArg ? perturb(origScene, moveMult * origScene.look.halfWidth) : origScene;
  const t0 = performance.now();
  const table = freshArg ? buildOutline(scene) : moveArg ? frame(structure(origScene), scene) : buildOutline(scene);
  const buildMs = performance.now() - t0;
  const fb = new FormB(scene as never, { dpr: 2 });
  const ppd = scene.camera.pxPerUnit * 2;
  const nearName = (x: number, y: number): string => {
    let best = "-"; let bd = Infinity;
    for (const j of scene.junctions) {
      const d = Math.hypot(j.c[0] - x, j.c[1] - y);
      if (d < bd) { bd = d; best = `${j.id}@${(d / table.h).toFixed(1)}h`; }
    }
    return best;
  };

  // Least |Dexp| (device px) of any surface whose ink still shows at
  // the point: its term distance after higher-key surfaces' coverage.
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
    let T = 1; let best = Infinity;
    for (const e of entries) {
      if (Number.isFinite(e.io.Dexp) && T * e.io.v > 0.05) best = Math.min(best, Math.abs(e.io.Dexp) * ppd);
      T *= 1 - e.io.a;
      if (!(T > 0)) break;
    }
    return best;
  };

  // Direction A: our outline samples -> form B.
  const dsA: number[] = [];
  const spotsA: Spot[] = [];
  let exclA = 0; let infA = 0; let termA = 0;
  const infCats = new Map<string, number>();
  const unmeasuredA: { x: number; y: number; what: string }[] = [];
  for (const p of table.pieces) {
    const np = p.pts.length / 2;
    for (let i = 0; i < np; i++) {
      const cand: [number, number][] = [[p.pts[2 * i], p.pts[2 * i + 1]]];
      if (i + 1 < np) {
        const mx = (p.pts[2 * i] + p.pts[2 * i + 2]) / 2; const my = (p.pts[2 * i + 1] + p.pts[2 * i + 3]) / 2;
        if (Math.hypot(p.pts[2 * i + 2] - p.pts[2 * i], p.pts[2 * i + 3] - p.pts[2 * i + 1]) * ppd > 4) cand.push([mx, my]);
      }
      for (const [x, y] of cand) {
        const ev = fb.evalPoint(x, y);
        if (ev.fade !== 0) { exclA++; continue; }
        const dDexp = Number.isFinite(ev.Dexp) ? Math.abs(ev.Dexp) * ppd : Infinity;
        if (!Number.isFinite(ev.Dexp)) {
          infA++;
          const cat = ev.term ? `${TERM_NAMES[ev.term.kind] ?? ev.term.kind}:${ev.term.chain === p.chain ? "own" : "other"}:top${ev.top < 0 ? "Paper" : ev.top >= (1 << 20) ? "Own" : "Group"}` : `no-term:top${ev.top < 0 ? "Paper" : ev.top >= (1 << 20) ? "Own" : "Group"}`;
          infCats.set(cat, (infCats.get(cat) ?? 0) + 1);
        }
        const dTerm = ev.term ? Math.abs(ev.term.D) * ppd : Infinity;
        const dInk = visibleDink(x, y);
        // The winning term is a third candidate: at a tangent point
        // form B's Dexp can miss its own endpoint disc (its coverage
        // there is a hair under 1/2, and its wedge test reads rounding),
        // while its winning term is that endpoint at D ~ 0.
        const d = Math.min(dInk, dDexp, dTerm);
        if (!Number.isFinite(d)) { unmeasuredA.push({ x, y, what: `${p.kind} ch${p.chain} side${p.side} s=${p.s0.toFixed(2)}` }); continue; }
        if (!Number.isFinite(ev.Dexp)) termA++;
        dsA.push(d);
        if (d > 1 / 8) spotsA.push({ d, x, y, what: `${p.kind} ch${p.chain} side${p.side} s=${p.s0.toFixed(2)}`, near: nearName(x, y) });
      }
    }
  }
  spotsA.sort((a, b) => b.d - a.d);

  // Direction B: form B's exposed outline samples -> our outline.
  const distOurs = outlineDistance(table, table.h);
  const dsB: number[] = [];
  const spotsB: Spot[] = [];
  let exclB = 0; let buriedB = 0; let noOutlineB = 0;
  const exposedPts: [number, number][] = [];
  const tryCand = (x: number, y: number, what: string): void => {
    const ev = fb.evalPoint(x, y);
    if (ev.fade !== 0) { exclB++; return; }
    // On a visible outline, as direction A is measured: a candidate
    // merely within 1 px of an outline (the old filter) is a buried
    // border point near the covering outline, not an outline sample.
    if (!(visibleDink(x, y) <= 0.25)) { buriedB++; return; }
    exposedPts.push([x, y]);
    const d = distOurs(x, y) * ppd;
    if (!Number.isFinite(d)) { noOutlineB++; return; }
    dsB.push(d);
    if (d > 1 / 8) spotsB.push({ d, x, y, what, near: nearName(x, y) });
  };
  fb.polys.forEach((p, ci) => {
    for (let k = 0; k < p.n; k++) {
      const kp = k > 0 ? k - 1 : p.closed ? p.nseg - 1 : -1;
      const kn = k < p.nseg ? k : p.closed ? 0 : -1;
      let nxv = 0; let nyv = 0;
      for (const kk of [kp, kn]) {
        if (kk < 0) continue;
        const b = kk + 1 === p.n ? 0 : kk + 1;
        const l = p.segLen[kk] || 1;
        nxv += -(p.y[b] - p.y[kk]) / l;
        nyv += (p.x[b] - p.x[kk]) / l;
      }
      const nl = Math.hypot(nxv, nyv);
      if (!(nl > 1e-9)) continue;
      nxv /= nl; nyv /= nl;
      for (const sig of [1, -1]) tryCand(p.x[k] + sig * fb.h * nxv, p.y[k] + sig * fb.h * nyv, `side ch${ci} v${k} sig${sig}`);
    }
    for (let k = 0; k < p.nseg; k++) {
      const b = k + 1 === p.n ? 0 : k + 1;
      const l = p.segLen[k] || 1;
      const nxv = -(p.y[b] - p.y[k]) / l; const nyv = (p.x[b] - p.x[k]) / l;
      const mx = (p.x[k] + p.x[b]) / 2; const my = (p.y[k] + p.y[b]) / 2;
      for (const sig of [1, -1]) tryCand(mx + sig * fb.h * nxv, my + sig * fb.h * nyv, `mid ch${ci} k${k} sig${sig}`);
    }
  });
  for (const c of fb.corners) {
    if (c.r > 0) {
      const aA = Math.atan2(c.tay - c.qy, c.tax - c.qx);
      let da = Math.atan2(c.tby - c.qy, c.tbx - c.qx) - aA;
      while (da > Math.PI) da -= 2 * Math.PI;
      while (da < -Math.PI) da += 2 * Math.PI;
      for (let i = 0; i <= 8; i++) {
        const a = aA + (da * i) / 8;
        tryCand(c.qx + c.r * Math.cos(a), c.qy + c.r * Math.sin(a), `arc ${c.j} j${scene.junctions[c.j]?.id}`);
      }
    } else {
      tryCand(c.Vx, c.Vy, `V ${c.j} j${scene.junctions[c.j]?.id}`);
    }
    tryCand(c.tax, c.tay, `tA ${c.j} j${scene.junctions[c.j]?.id}`);
    tryCand(c.tbx, c.tby, `tB ${c.j} j${scene.junctions[c.j]?.id}`);
  }
  spotsB.sort((a, b) => b.d - a.d);

  // Fallback for A's unmeasured samples: nearest exposed B candidate.
  let fallbackA = 0; let droppedA = 0;
  if (unmeasuredA.length && exposedPts.length) {
    const cellB = 0.5;
    const gridB = new Map<string, [number, number][]>();
    for (const pt of exposedPts) {
      const k = `${Math.floor(pt[0] / cellB)},${Math.floor(pt[1] / cellB)}`;
      const l = gridB.get(k) ?? [];
      l.push(pt);
      gridB.set(k, l);
    }
    for (const u of unmeasuredA) {
      let best = Infinity;
      for (let ring = 0; ring <= 10 && best === Infinity; ring++) {
        const cx = Math.floor(u.x / cellB); const cy = Math.floor(u.y / cellB);
        for (let ix = cx - ring; ix <= cx + ring; ix++) for (let iy = cy - ring; iy <= cy + ring; iy++) {
          if (ring > 0 && Math.max(Math.abs(ix - cx), Math.abs(iy - cy)) !== ring) continue;
          for (const pt of gridB.get(`${ix},${iy}`) ?? []) best = Math.min(best, Math.hypot(pt[0] - u.x, pt[1] - u.y));
        }
        if (best !== Infinity && ring > 0) break;
      }
      if (Number.isFinite(best)) { fallbackA++; const d = best * ppd; dsA.push(d); if (d > 1 / 8) spotsA.push({ d, x: u.x, y: u.y, what: `${u.what} (fallback)`, near: nearName(u.x, u.y) }); }
      else droppedA++;
    }
    spotsA.sort((a, b) => b.d - a.d);
  } else droppedA = unmeasuredA.length;

  const sA = stats(dsA);
  const sB = stats(dsB);
  const droppedB = exclB + buriedB + noOutlineB;
  const rec = {
    scene: name, buildMs, ppd, hWorld: table.h,
    cornersOurs: { ok: table.corners.filter((c) => c.ok).length, total: table.corners.length },
    cornersFormB: fb.corners.length,
    pieces: table.pieces.length, regions: table.regions.length, faces: table.faces.length,
    A: { ...sA, measured: dsA.length, exclFade: exclA, inf: infA, termMeasured: termA, fallbackMeasured: fallbackA, droppedUnmeasured: droppedA, infCategories: Object.fromEntries([...infCats.entries()].sort((a, b) => b[1] - a[1])), worst: spotsA.slice(0, 24) },
    B: { ...sB, measured: dsB.length, exclFade: exclB, buried: buriedB, noOutline: noOutlineB, dropped: droppedB, worst: spotsB.slice(0, 24) },
    diagnostics: table.diagnostics,
  };
  writeFileSync(join(outDir, `${moveArg ? `${freshArg ? "s3dfresh" : "s3dmove"}${moveMult}${consistentArg ? "c" : ""}_` : ""}exact_${name}.json`), JSON.stringify(rec, null, 1));
  summary.push(`| ${name} | ours->B | ${sA.n} | ${exclA + droppedA} | ${sA.p50.toFixed(3)} | ${sA.p99.toFixed(3)} | ${sA.max.toFixed(3)} | ${sA.over8} | ${sA.over2} | ${exclA} | ${infA}/${termA}/${fallbackA} |`);
  summary.push(`| ${name} | B->ours | ${sB.n} | ${droppedB} | ${sB.p50.toFixed(3)} | ${sB.p99.toFixed(3)} | ${sB.max.toFixed(3)} | ${sB.over8} | ${sB.over2} | ${exclB} | buried ${buriedB} |`);
  console.log(`${name}: build ${buildMs.toFixed(0)}ms | A p99=${sA.p99.toFixed(3)} max=${sA.max.toFixed(3)} (measured=${sA.n}, excl=${exclA}, inf=${infA}, term=${termA}, fallback=${fallbackA}, dropped=${droppedA}) | B p99=${sB.p99.toFixed(3)} max=${sB.max.toFixed(3)} (measured=${sB.n}, excl=${exclB}, buried=${buriedB}) | corners ours ${rec.cornersOurs.ok}/${rec.cornersOurs.total} formB ${fb.corners.length}`);
}
writeFileSync(join(outDir, moveArg ? `${freshArg ? "s3dfresh" : "s3dmove"}${moveMult}${consistentArg ? "c" : ""}_exact_summary.md` : "exact_summary.md"), summary.join("\n") + "\n");
console.log("wrote exact_summary.md");
