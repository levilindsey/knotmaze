// K1040 S3f step 3's first count, extended by S3f3 step 1: the vertices
// tentv issues per frame, per scene, by draw, then what each S3f3 lever
// would leave (label_b_pass.ts drawTent: segments TENT_SEG_VERTS each,
// the free ends TENT_CAP_VERTS each, the fills TENT_FILL_VERTS each, all
// instanced triangle strips; the vertex shader runs on every one, and
// the facets a tent does not need collapse to degenerate triangles).
// The caps are counted as the pass counts them (two per open chain with
// a segment). Node, no GPU.
// Usage: node scripts/run_node.mjs .claude/probes/K1040/s3/vert_count.ts
//
// S3f3's levers:
// - reach (tents only within the junctions' reach): the label's readers
//   are S4's band (F7: strips reaching W + aa inside a piece and aa
//   outside it, its fragment inking only where the label says its
//   surface is on top) and S7's tint/rim on the same terms. A surface
//   can only be contested where a junction's arms reach (FormB's arms:
//   the s-spans a group's surface code covers, label_b's SPAN table),
//   so the reader region counted here is the tube of radius
//   h + W + aa about every arm's polyline. A segment tent (its capsule
//   of radius h about the segment, wedge included) is reached when the
//   two come within 2h + W + aa. Arm polylines are sampled every h/2,
//   so the distances are the polyline's to within about h/4.
// - strips (one continuous strip per chain run): 2 vertices a point
//   (the two cross-section corners), plus per interior joint the wedge
//   fan's inner facets (nf - 1, at the pass's tentEpsPx and the census
//   camera) and one degenerate mate each to keep the strip alternating.
//   Caps and fills keep today's draws.
// - circ (the circumscribed wedge at NW 2 / NW 1): the facet count is
//   the strip's vertex count: 2 NW + 6 a segment; radii do not change
//   counts, caps and fills keep theirs.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FormB } from "../../../../src/render/field/form_b";
import { pointAt } from "../../../../src/render/field/geom";
import type { FieldScene } from "../../../../src/render/field/scene";
import { buildLabelB } from "../../../../src/render/field/label_b";
import { tentFacetK, tentFacets } from "../../../../src/render/field/label_b_tent";
import { TENT_CAP_VERTS, TENT_FILL_VERTS, TENT_NW, TENT_SEG_VERTS } from "../../../../src/render/field/label_b_tent_glsl";

const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const SCENES = [
  "muse_hash", "muse_default_tw", "def", "fat", "ring", "user_tw42.lightpaper",
  "g41_def_tw42", "g41_def_tw64", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64",
];

function segPtDist(ax: number, ay: number, bx: number, by: number, px: number, py: number): number {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy;
  const t = l2 > 0 ? Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0;
  const ex = ax + t * dx - px, ey = ay + t * dy - py;
  return Math.sqrt(ex * ex + ey * ey);
}

const rows: string[] = [
  `# vert_count_s3f3: tentv's vertices per frame today and per S3f3 lever (segments x ${TENT_SEG_VERTS}, caps x ${TENT_CAP_VERTS}, fills x ${TENT_FILL_VERTS})`,
  "",
  "## Today, by draw",
  "",
  "| scene | chains (open) | segments | caps | fills | seg verts | cap verts | fill verts | total | caps share |",
  "|---|---|---|---|---|---|---|---|---|---|",
];
const reachRows: string[] = [
  "",
  "## Lever 1, reach: segment tents whose capsules touch no reader pixel are not drawn",
  "",
  "| scene | groups | arms | segments reached | seg verts left | total left | saved |",
  "|---|---|---|---|---|---|---|",
];
const stripRows: string[] = [
  "",
  "## Lever 2, strips: one continuous strip per chain run (caps and fills unchanged)",
  "",
  "| scene | strip seg verts | total left | saved |",
  "|---|---|---|---|",
];
const circRows: string[] = [
  "",
  "## Lever 3, circumscribed wedge: NW 2 and NW 1 segment strips (radii move, counts as shown)",
  "",
  "| scene | NW 2 total | NW 1 total |",
  "|---|---|---|",
];
for (const name of SCENES) {
  const scene = JSON.parse(readFileSync(join(SCENE_DIR, `${name}.json`), "utf8")) as FieldScene;
  scene.look.ctrlArc ??= 0.47;
  const fb = new FormB(scene, { dpr: 2 });
  const T = buildLabelB(fb);
  const h = fb.h;
  let open = 0, caps = 0;
  for (let ci = 0; ci < T.nChains; ci++) {
    if (T.chain[8 * ci + 3] <= 0.5) open++;
    if (T.chain[8 * ci + 3] <= 0.5 && T.chain[8 * ci + 2] > 0) caps += 2;
  }
  const sv = T.nInst * TENT_SEG_VERTS, cv = caps * TENT_CAP_VERTS, fv = T.nFills * TENT_FILL_VERTS;
  const tot = sv + cv + fv;
  rows.push(`| ${name} | ${T.nChains} (${open}) | ${T.nInst} | ${caps} | ${T.nFills} | ${sv} | ${cv} | ${fv} | ${tot} | ${(100 * cv / tot).toFixed(0)}% |`);

  // Lever 1: reader region = arm tubes of radius h + W + aa; a segment
  // tent reaches it from h away. Arm samples on a grid of the reach.
  const reachR = 2 * h + fb.W + fb.aa;
  const cell = Math.max(reachR, 1e-6);
  const grid = new Map<string, [number, number][]>();
  const samples: [number, number][] = [];
  for (const arm of fb.arms) {
    const poly = fb.polys[arm.pi];
    if (!poly || arm.L <= 0) continue;
    const steps = Math.max(1, Math.ceil(arm.L / (h / 2)));
    for (let i = 0; i <= steps; i++) {
      const p = pointAt(poly, arm.sR + arm.dir * arm.L * (i / steps));
      samples.push([p.x, p.y]);
    }
  }
  for (const [x, y] of samples) {
    const key = `${Math.floor(x / cell)},${Math.floor(y / cell)}`;
    const arr = grid.get(key) ?? [];
    arr.push([x, y]);
    grid.set(key, arr);
  }
  let reached = 0;
  for (let ci = 0; ci < T.nChains; ci++) {
    const off = T.chain[8 * ci], n = T.chain[8 * ci + 1], closed = T.chain[8 * ci + 3] > 0.5;
    const nseg = T.chain[8 * ci + 2];
    for (let k = 0; k < nseg; k++) {
      const a = off + k, b = off + (k + 1 === n ? 0 : k + 1);
      const ax = T.pts[4 * a], ay = T.pts[4 * a + 1], bx = T.pts[4 * b], by = T.pts[4 * b + 1];
      if (!closed && k + 1 >= n) break;
      let hit = false;
      const gx0 = Math.floor((Math.min(ax, bx) - reachR) / cell), gx1 = Math.floor((Math.max(ax, bx) + reachR) / cell);
      const gy0 = Math.floor((Math.min(ay, by) - reachR) / cell), gy1 = Math.floor((Math.max(ay, by) + reachR) / cell);
      outer: for (let gx = gx0; gx <= gx1; gx++) for (let gy = gy0; gy <= gy1; gy++) {
        const arr = grid.get(`${gx},${gy}`);
        if (!arr) continue;
        for (const [px, py] of arr) if (segPtDist(ax, ay, bx, by, px, py) <= reachR) { hit = true; break outer; }
      }
      if (hit) reached++;
    }
  }
  const reachTot = reached * TENT_SEG_VERTS + cv + fv;
  reachRows.push(`| ${name} | ${fb.nGroups} | ${fb.arms.length} | ${reached} / ${T.nInst} | ${reached * TENT_SEG_VERTS} | ${reachTot} | ${(100 * (1 - reachTot / tot)).toFixed(1)}% |`);

  // Lever 2: cross-section strips. ppd as the census camera (scale 2).
  const [ca, cb, cc, cd] = scene.camera.worldToCss;
  const ppd = Math.sqrt(Math.abs(ca * cd - cb * cc)) * 2;
  const facetK = tentFacetK(0.002 / Math.max(ppd, 1e-9));
  let stripSeg = 0;
  for (let ci = 0; ci < T.nChains; ci++) {
    const off = T.chain[8 * ci], n = T.chain[8 * ci + 1], closed = T.chain[8 * ci + 3] > 0.5;
    if (n < 2) continue;
    const joints = closed ? n : n - 2;
    let extras = 0;
    const pt = (j: number) => [T.pts[4 * (off + j)], T.pts[4 * (off + j) + 1]] as const;
    for (let j = 0; j < joints; j++) {
      const jp = closed ? (j + n - 1) % n : j + 1; // interior point index (open: 1..n-2)
      const ji = closed ? j : j + 1;
      const [px, py] = pt(closed ? (ji + n - 1) % n : ji - 1);
      const [ax, ay] = pt(ji);
      const [bx, by] = pt(closed ? (ji + 1) % n : ji + 1);
      void jp; void px; void py;
      let ux = ax - px, uy = ay - py; const ul = Math.hypot(ux, uy) || 1; ux /= ul; uy /= ul;
      let vx = bx - ax, vy = by - ay; const vl = Math.hypot(vx, vy) || 1; vx /= vl; vy /= vl;
      const phi = Math.atan2(Math.abs(ux * vy - uy * vx), ux * vx + uy * vy);
      const nf = tentFacets(phi, h, facetK, TENT_NW);
      extras += 2 * Math.max(0, nf - 1);
    }
    stripSeg += 2 * n + extras + (closed ? 2 : 0);
  }
  const stripTot = stripSeg + cv + fv;
  stripRows.push(`| ${name} | ${stripSeg} | ${stripTot} | ${(100 * (1 - stripTot / tot)).toFixed(1)}% |`);

  const nw2 = T.nInst * (2 * 2 + 6) + cv + fv;
  const nw1 = T.nInst * (2 * 1 + 6) + cv + fv;
  circRows.push(`| ${name} | ${nw2} | ${nw1} |`);
}
console.log([...rows, ...reachRows, ...stripRows, ...circRows].join("\n"));
