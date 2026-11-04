// K1040 S1h (K1114): the sites. S1g's F1 (dEdge "near") and F2 (rootBand 0.5)
// changed form B's definitions; this lists the at-rest sites to look at, each
// with its scene, junction, corner, world x,y and what changed, against S1f's
// final (form_b_s1f_q.ts, frozen) with today's defaults as the "after".
//   - F1: the corners that lose fill (r > 0 and ω > 0 before, not after; a
//     corner the defaults no longer build counts as r 0, ω 0) and muse_hash
//     j62 189-187 (K1114's fifth site: r 2.438h -> 1.431h);
//   - F2: the ten largest at-rest r moves of the root gate alone (the same
//     form B with rootBand 0 against the defaults, scenes with look.ctrlArc
//     0.47 as b_crop.ts renders them), checked against the S1g census's own ten
//     (out/s1g/gate699_rb05.txt);
//   - extras: the three largest overall tip moves (S1f final -> defaults)
//     not already listed (F1's arm cuts move tips further than F2's r gate).
// Also checks the Handoff's claim: new FormB(scene, {dEdge: "skip", rootBand: 0})
// reproduces S1f's final (arms' L and Lcut, corners' r and ω, every scene).
// Run: npx vite-node .claude/probes/K1040/s1/s1h_sites.ts   (-> out/s1h/sites.json, sites.txt)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { FieldScene } from "../../../../src/render/field/scene";
import { FormB, type Corner } from "../../../../src/render/field/form_b";
import { FormB as FormBOld } from "./form_b_s1f_q";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "out", "s1h");
mkdirSync(outDir, { recursive: true });
const SCENES = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const ALL = ["def", "fat", "ring", "user_tw42.lightpaper", "g41_def_tw42", "g41_def_tw64", "muse_hash", "muse_default_tw", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64"];
const f = (v: number, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : String(v));
const fin = (v: number) => (Number.isFinite(v) ? v : 0);
const filled = (c: { r: number; omega: number }) => c.r > 1e-9 && c.omega > 1e-9;
type CornerLike = Pick<Corner, "j" | "a" | "b" | "r" | "omega" | "theta" | "Vx" | "Vy" | "qx" | "qy" | "dVa" | "dVb" | "ok" | "rV">;
const key = (c: { j: number; a: number; b: number }) => `${c.j}:${c.a}-${c.b}`;
/** The fillet's tip: the arc's point nearest V, on the segment V -> q at distance rV - r from V. */
function tipOf(c: CornerLike): [number, number] {
  if (!(c.r > 1e-9) || !(c.rV > 1e-12)) return [c.Vx, c.Vy];
  const k = (c.rV - c.r) / c.rV;
  return [c.Vx + (c.qx - c.Vx) * k, c.Vy + (c.qy - c.Vy) * k];
}
const tipDist = (p: CornerLike, q: CornerLike) => {
  const a = tipOf(p);
  const b = tipOf(q);
  return fin(Math.hypot(a[0] - b[0], a[1] - b[1]));
};

export type Group = "F1-lost" | "F1-j62" | "F2-r" | "extra-tip";
export interface Site {
  id: string;
  group: Group;
  scene: string;
  j: number;
  jid: string;
  a: number;
  b: number;
  h: number;
  theta: number;
  /** The corner's V (world), the crop's centre. */
  x: number;
  y: number;
  old: { r: number; omega: number; ok: boolean; tipx: number; tipy: number };
  now: { r: number; omega: number; ok: boolean; tipx: number; tipy: number };
  /** The corner is absent from the defaults' list (r and ω count as 0). */
  vanished: boolean;
  /** rootBand 0 -> 0.5 with dEdge "near" (F2 alone). */
  f2: { r0: number; r1: number };
  dV: number;
  /** S1f final -> defaults. */
  tipMove: number;
  /** S1f final -> F1 alone (dEdge near, rootBand 0), and that -> defaults (F2 alone). */
  f1TipMove: number;
  f2TipMove: number;
  armsMoved: string[];
  /** The S1g census's own r move for this corner (it left ctrlArc unset), when listed. */
  census: { r0: number; r1: number } | null;
}

// The S1g census (F2): scene corner jN (jN) a-b: θ t dV d h: r r0 h -> r1 h
const census = new Map<string, { r0: number; r1: number }>();
for (const ln of readFileSync(join(here, "out", "s1g", "gate699_rb05.txt"), "utf8").split("\n")) {
  const m = /^\s+(\S+)\s+corner (j\d+) \(j\d+\) (\d+)-(\d+): θ [\d.]+ dV [\d.]+h: r ([\d.]+)h -> ([\d.]+)h/.exec(ln);
  if (m) census.set(`${m[1]}/${m[2]}/${m[3]}-${m[4]}`, { r0: Number(m[5]), r1: Number(m[6]) });
}

const out: string[] = [];
const eq: string[] = [];
const all: Site[] = [];
const hdev: string[] = [];
for (const name of ALL) {
  const sc = JSON.parse(readFileSync(`${SCENES}/${name}.json`, "utf8")) as FieldScene;
  sc.look.ctrlArc ??= 0.47;
  const O = new FormBOld(sc);
  const N = new FormB(sc);
  const N0 = new FormB(sc, { rootBand: 0 });
  const S = new FormB(sc, { dEdge: "skip", rootBand: 0 });
  const h = O.h;
  hdev.push(`  ${name.padEnd(22)} h ${f(h, 4)} world, ${f(h * 2 * sc.camera.pxPerUnit, 2)} device px at dpr 2 (pxPerUnit ${f(sc.camera.pxPerUnit, 3)})`);
  // The Handoff's claim.
  let dArm = 0;
  let dCor = 0;
  O.arms.forEach((a, i) => {
    const b = S.arms[i];
    if (!b || Math.abs(a.L - b.L) > 1e-9 || (a.Lcut !== b.Lcut && Math.abs(a.Lcut - b.Lcut) > 1e-9)) dArm++;
  });
  const sm = new Map(S.corners.map((c) => [key(c), c]));
  for (const c of O.corners) {
    const d = sm.get(key(c));
    if (!d || Math.abs(c.r - d.r) > 1e-9 || Math.abs(c.omega - d.omega) > 1e-9) dCor++;
  }
  if (O.corners.length !== S.corners.length) dCor += 1000;
  eq.push(`  ${name.padEnd(22)} arms ${O.arms.length}/${S.arms.length} differ ${dArm}; corners ${O.corners.length}/${S.corners.length} differ ${dCor}`);
  const mo = new Map(O.corners.map((c) => [key(c), c]));
  const mn = new Map(N.corners.map((c) => [key(c), c]));
  const mz = new Map(N0.corners.map((c) => [key(c), c]));
  const armsOf = (ci: { a: number; b: number }): string[] => {
    const o: string[] = [];
    for (const ai of [ci.a, ci.b]) {
      const x = O.arms[ai];
      const y = N.arms[ai];
      const dl = Math.abs(x.L - y.L) > 1e-9;
      const dc = x.Lcut !== y.Lcut && Math.abs(x.Lcut - y.Lcut) > 1e-9;
      if (dl || dc) o.push(`arm ${ai} L ${f(x.L / h)}h -> ${f(y.L / h)}h, Lcut ${f(x.Lcut / h)}h -> ${f(y.Lcut / h)}h`);
    }
    return o;
  };
  const keys = new Set<string>([...mo.keys(), ...mn.keys(), ...mz.keys()]);
  for (const k of keys) {
    const o = mo.get(k);
    const c = mn.get(k);
    const z = mz.get(k);
    const ref = (o ?? c ?? z)!;
    // A corner a form does not build counts as r 0, ω 0, ok false.
    const ghost = (x: Corner | undefined): CornerLike => x ?? { ...ref, r: 0, omega: 0, ok: false };
    const co = ghost(o);
    const cn = ghost(c);
    const cz = ghost(z);
    const jid = sc.junctions[ref.j]?.id ?? "?";
    const to = tipOf(co);
    const tn = tipOf(cn);
    const id = `${name}/${jid}/${ref.a}-${ref.b}`;
    all.push({
      id,
      group: "F2-r",
      scene: name,
      j: ref.j,
      jid,
      a: ref.a,
      b: ref.b,
      h,
      theta: ref.theta,
      x: co.Vx,
      y: co.Vy,
      old: { r: co.r, omega: co.omega, ok: co.ok, tipx: to[0], tipy: to[1] },
      now: { r: cn.r, omega: cn.omega, ok: cn.ok, tipx: tn[0], tipy: tn[1] },
      vanished: !c,
      f2: { r0: cz.r, r1: cn.r },
      dV: Math.min(ref.dVa, ref.dVb),
      tipMove: tipDist(co, cn),
      f1TipMove: tipDist(co, cz),
      f2TipMove: tipDist(cz, cn),
      armsMoved: armsOf(ref),
      census: census.get(id) ?? null,
    });
  }
}
const sites: Site[] = [];
const have = new Set<string>();
const add = (s: Site, group: Group) => {
  if (have.has(s.id)) return false;
  have.add(s.id);
  sites.push({ ...s, group });
  return true;
};
const byId = new Map(all.map((s) => [s.id, s]));
const get = (id: string): Site => {
  const s = byId.get(id);
  if (!s) throw new Error(`site ${id} not found`);
  return s;
};
// F1: the corners that lose fill, in scene and junction order, and K1114's j62.
const lost = all.filter((s) => filled(s.old) && !filled(s.now));
for (const s of lost) add(s, "F1-lost");
add(get("muse_hash/j62/189-187"), "F1-j62");
// F2: the root gate alone moves r (rootBand 0 -> 0.5); rank by r's move.
const f2 = all.filter((s) => Math.abs(s.f2.r0 - s.f2.r1) > 1e-6);
const dr = (s: Site) => Math.abs(s.f2.r0 - s.f2.r1) / s.h; // in h, as the census ranks it (h differs per scene)
f2.sort((p, q) => dr(q) - dr(p));
const top = f2.slice(0, 10);
for (const s of top) add(s, "F2-r");
// The S1g census, checked against the recompute: its ten, and every row's r pair.
const cen = [...census.entries()].sort((p, q) => Math.abs(q[1].r0 - q[1].r1) - Math.abs(p[1].r0 - p[1].r1)).slice(0, 10);
const cenOnly = cen.map(([id]) => id).filter((id) => !top.some((s) => s.id === id));
let cenBad = 0;
const cenBadLines: string[] = [];
for (const [id, v] of census) {
  const s = byId.get(id);
  if (!s || Math.abs(s.f2.r0 / s.h - v.r0) > 6e-4 || Math.abs(s.f2.r1 / s.h - v.r1) > 6e-4) {
    cenBad++;
    if (cenBadLines.length < 6) cenBadLines.push(`  ${id}: census r ${v.r0}h -> ${v.r1}h; recompute ${s ? `${f(s.f2.r0 / s.h)}h -> ${f(s.f2.r1 / s.h)}h` : "none"}`);
  }
}
let missing = 0;
for (const s of f2) if (!census.has(s.id)) missing++;
// The largest overall tip moves, when not listed.
const byTip = all.filter((s) => s.tipMove > 1e-9).sort((p, q) => q.tipMove - p.tipMove);
let extra = 0;
for (const s of byTip) {
  if (extra >= 3) break;
  if (add(s, "extra-tip")) extra++;
}
out.push("Handoff's claim: FormB(scene, {dEdge: skip, rootBand: 0}) against S1f's final (form_b_s1f_q.ts), arms (L, Lcut) and corners (r, ω):");
out.push(...eq);
out.push(`corners in all 12 scenes (the union of S1f's and today's lists): ${all.length}; F2 (rootBand alone) moves r at ${f2.length}; the S1g census lists ${census.size}`);
out.push("");
out.push("h per scene:");
out.push(...hdev);
out.push("");
out.push(`F1: ${lost.length} corners lose fill: ${lost.map((s) => s.id + (s.vanished ? " (no corner in the defaults)" : "")).join(", ")}`);
out.push("");
out.push("F2's ranking by r move (rootBand 0 -> 0.5, ctrlArc 0.47), first 14; the census's r move where it lists the corner:");
for (const s of f2.slice(0, 14))
  out.push(`  ${s.id}: θ ${f(s.theta)} dV ${f(s.dV / s.h)}h r ${f(s.f2.r0 / s.h)}h -> ${f(s.f2.r1 / s.h)}h (F2 tip move ${f(s.f2TipMove / s.h)}h; vs S1f: tip move ${f(s.tipMove / s.h)}h); census ${s.census ? `${f(s.census.r0)}h -> ${f(s.census.r1)}h` : "not listed"}`);
out.push("");
out.push(`the S1g census (out/s1g/gate699_rb05.txt) against the recompute: ${census.size} rows, ${cenBad} with a different r pair (to 6e-4h); the recompute moves r at ${f2.length}, ${missing} of them not in the census; the census's ten ${cenOnly.length === 0 ? "are the recompute's ten" : "differ from the recompute's by " + cenOnly.join(", ")}`);
for (const l of cenBadLines) out.push(l);
for (const [id, v] of cen) {
  const s = byId.get(id);
  out.push(`  census ten: ${id}: census r ${f(v.r0)}h -> ${f(v.r1)}h; recompute r ${s ? `${f(s.f2.r0 / s.h)}h -> ${f(s.f2.r1 / s.h)}h` : "none"}`);
}
out.push("");
out.push("the largest F2-only tip moves (rootBand 0 -> 0.5), first 5:");
for (const s of [...all].sort((p, q) => q.f2TipMove - p.f2TipMove).slice(0, 5)) out.push(`  ${s.id}: F2 tip move ${f(s.f2TipMove / s.h)}h, r ${f(s.f2.r0 / s.h)}h -> ${f(s.f2.r1 / s.h)}h`);
out.push("");
out.push("the largest overall tip moves (S1f final -> defaults), first 8:");
for (const s of byTip.slice(0, 8)) out.push(`  ${s.id}: tip move ${f(s.tipMove / s.h)}h (F1 alone ${f(s.f1TipMove / s.h)}h, F2 alone ${f(s.f2TipMove / s.h)}h), θ ${f(s.theta)}, r ${f(s.old.r / s.h)}h -> ${f(s.now.r / s.h)}h`);
out.push("");
out.push(`sites (${sites.length}):`);
for (const s of sites) {
  out.push(
    `  [${s.group}] ${s.id} (V ${f(s.x, 3)}, ${f(s.y, 3)}) θ ${f(s.theta)} dV ${f(s.dV / s.h)}h: r ${f(s.old.r / s.h)}h -> ${f(s.now.r / s.h)}h${s.vanished ? " (no corner)" : ""}, ω ${f(s.old.omega)} -> ${f(s.now.omega)}, ok ${s.old.ok} -> ${s.now.ok}, tip move ${f(s.tipMove / s.h)}h (F1 ${f(s.f1TipMove / s.h)}h, F2 ${f(s.f2TipMove / s.h)}h)${s.armsMoved.length ? "; " + s.armsMoved.join("; ") : ""}`,
  );
}
writeFileSync(join(outDir, "sites.json"), JSON.stringify(sites, null, 1) + "\n");
writeFileSync(join(outDir, "sites.txt"), out.join("\n") + "\n");
console.log(out.join("\n"));
