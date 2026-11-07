// K1240 S1 Done 2: the prototype outline against form B's exposed outline,
// both ways, in device pixels at dpr 2, outside F3's fade widths (a sample
// whose form B evaluation has any fade bit set is excluded and counted).
// This file is a check: it may use the reference (form_b.ts) — the builder
// (outline.ts) may not and does not.
//
//   node scripts/run_node.mjs .claude/probes/K1240/proto/check_exact.ts [scene,...]
//
// Writes out/exact_<scene>.json and out/exact_summary.md (untracked).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildOutline, type SceneIn, type OutlineTable } from "./outline";
import { FormB } from "../../../../src/render/field/form_b";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "out");
mkdirSync(outDir, { recursive: true });
const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const ALL = ["muse_hash", "muse_default_tw", "def", "fat", "ring", "user_tw42.lightpaper", "g41_def_tw42", "g41_def_tw64", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64"];
const names = process.argv[2] ? process.argv[2].split(",") : ALL;

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

const summary: string[] = [`# K1240 exact check ${new Date().toISOString()}`, "", "| scene | dir | n | p50 px | p99 px | max px | >1/8 | >1/2 | excl fade |", "|---|---|---|---|---|---|---|---|---|"];
for (const name of names) {
  const scene = JSON.parse(readFileSync(join(SCENE_DIR, `${name}.json`), "utf8")) as SceneIn & { look: SceneIn["look"] };
  // As check #12's harness does (s4c/page.ts): S1a scenes predate ctrlArc.
  (scene.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
  const t0 = performance.now();
  const table = buildOutline(scene);
  const buildMs = performance.now() - t0;
  const fb = new FormB(scene as never, { dpr: 2 });
  const ppd = scene.camera.pxPerUnit * 2;
  const nearName = (x: number, y: number): string => {
    let best = "—"; let bd = Infinity;
    for (const j of scene.junctions) {
      const d = Math.hypot(j.c[0] - x, j.c[1] - y);
      if (d < bd) { bd = d; best = `${j.id}@${(d / table.h).toFixed(1)}h`; }
    }
    return best;
  };

  // Direction A: our outline samples -> form B's Dexp.
  const dsA: number[] = [];
  const spotsA: Spot[] = [];
  let exclA = 0; let infA = 0;
  for (const p of table.pieces) {
    const np = p.pts.length / 2;
    for (let i = 0; i < np; i++) {
      // Vertices, plus midpoints of segments longer than 4 device px.
      const cand: [number, number][] = [[p.pts[2 * i], p.pts[2 * i + 1]]];
      if (i + 1 < np) {
        const mx = (p.pts[2 * i] + p.pts[2 * i + 2]) / 2; const my = (p.pts[2 * i + 1] + p.pts[2 * i + 3]) / 2;
        if (Math.hypot(p.pts[2 * i + 2] - p.pts[2 * i], p.pts[2 * i + 3] - p.pts[2 * i + 1]) * ppd > 4) cand.push([mx, my]);
      }
      for (const [x, y] of cand) {
        const ev = fb.evalPoint(x, y);
        if (ev.fade !== 0) { exclA++; continue; }
        if (!Number.isFinite(ev.Dexp)) { infA++; continue; }
        const d = Math.abs(ev.Dexp) * ppd;
        dsA.push(d);
        if (d > 1 / 8) {
          spotsA.push({ d, x, y, what: `${p.kind} ch${p.chain} side${p.side} s=${p.s0.toFixed(2)}`, near: nearName(x, y) });
        }
      }
    }
  }
  spotsA.sort((a, b) => b.d - a.d);

  // Direction B: form B's exposed outline samples -> our outline.
  const distOurs = outlineDistance(table, table.h);
  const dsB: number[] = [];
  const spotsB: Spot[] = [];
  let exclB = 0; let buriedB = 0;
  const tryCand = (x: number, y: number, what: string): void => {
    const ev = fb.evalPoint(x, y);
    if (ev.fade !== 0) { exclB++; return; }
    if (!Number.isFinite(ev.Dexp) || Math.abs(ev.Dexp) * ppd > 1) { buriedB++; return; }
    const d = distOurs(x, y) * ppd;
    if (!Number.isFinite(d)) return;
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

  const sA = stats(dsA);
  const sB = stats(dsB);
  const rec = {
    scene: name, buildMs, ppd, hWorld: table.h,
    cornersOurs: { ok: table.corners.filter((c) => c.ok).length, total: table.corners.length },
    cornersFormB: fb.corners.length,
    pieces: table.pieces.length, regions: table.regions.length, faces: table.faces.length,
    A: { ...sA, exclFade: exclA, inf: infA, worst: spotsA.slice(0, 24) },
    B: { ...sB, exclFade: exclB, buried: buriedB, worst: spotsB.slice(0, 24) },
    diagnostics: table.diagnostics,
  };
  writeFileSync(join(outDir, `exact_${name}.json`), JSON.stringify(rec, null, 1));
  summary.push(`| ${name} | ours->B | ${sA.n} | ${sA.p50.toFixed(3)} | ${sA.p99.toFixed(3)} | ${sA.max.toFixed(3)} | ${sA.over8} | ${sA.over2} | ${exclA} |`);
  summary.push(`| ${name} | B->ours | ${sB.n} | ${sB.p50.toFixed(3)} | ${sB.p99.toFixed(3)} | ${sB.max.toFixed(3)} | ${sB.over8} | ${sB.over2} | ${exclB} |`);
  console.log(`${name}: build ${buildMs.toFixed(0)}ms | A p99=${sA.p99.toFixed(3)} max=${sA.max.toFixed(3)} (n=${sA.n}, excl=${exclA}) | B p99=${sB.p99.toFixed(3)} max=${sB.max.toFixed(3)} (n=${sB.n}, excl=${exclB}, buried=${buriedB}) | corners ours ${rec.cornersOurs.ok}/${rec.cornersOurs.total} formB ${fb.corners.length}`);
}
writeFileSync(join(outDir, "exact_summary.md"), summary.join("\n") + "\n");
console.log("wrote exact_summary.md");
