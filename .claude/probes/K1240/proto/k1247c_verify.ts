// K1247 (Claude's own check): the fast frame against
// k1247c_dump.ts's baseline tables (today's builder at e527828b), cold (a
// new structure object, so a new cache) and warm (after a frame at another
// position). Pieces must keep their order, kind, chain, side, corner and
// region; the rest of the table is compared field by field.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1247c_verify.ts [baseSubdir] [--impl=./outline_<sha>.ts] [--ref]
// --impl checks another copy of outline.ts; --ref checks its frameRef (the
// full rebuild) in place of frame().
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { SceneIn } from "./outline";

const impl = process.argv.slice(2).find((a) => a.startsWith("--impl="))?.slice(7) ?? "./outline.ts";
const mod = (await import(/* @vite-ignore */ new URL(impl, import.meta.url).href)) as typeof import("./outline");
const structure = mod.structure;
const frame = process.argv.includes("--ref") ? mod.frameRef : mod.frame;
const here = dirname(fileURLToPath(import.meta.url));
const sub = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "k1247c_base";
const baseDir = join(here, "..", "out", sub);
const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const ALL = ["muse_hash", "muse_default_tw", "def", "fat", "ring", "user_tw42.lightpaper", "g41_def_tw42", "g41_def_tw64", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64"];

function load(name: string): SceneIn {
  const s = JSON.parse(readFileSync(join(SCENE_DIR, `${name}.json`), "utf8")) as SceneIn;
  (s.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
  return s;
}
// s3f_exact.ts's perturb, --consistent on (as k1247c_dump.ts).
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
function ptSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const ex = bx - ax; const ey = by - ay;
  const l2 = ex * ex + ey * ey;
  let t = l2 > 0 ? ((px - ax) * ex + (py - ay) * ey) / l2 : 0;
  t = Math.min(1, Math.max(0, t));
  return Math.hypot(ax + ex * t - px, ay + ey * t - py);
}
function ptPoly(px: number, py: number, pts: ArrayLike<number>): number {
  const n = pts.length / 2;
  if (n === 0) return Infinity;
  if (n === 1) return Math.hypot(pts[0] - px, pts[1] - py);
  let best = Infinity;
  for (let i = 0; i + 1 < n; i++) best = Math.min(best, ptSeg(px, py, pts[2 * i], pts[2 * i + 1], pts[2 * i + 2], pts[2 * i + 3]));
  return best;
}
function hausdorff(a: ArrayLike<number>, b: ArrayLike<number>): number {
  if (a.length === 0 && b.length === 0) return 0;
  let m = 0;
  for (let i = 0; i + 1 < a.length; i += 2) m = Math.max(m, ptPoly(a[i], a[i + 1], b));
  for (let i = 0; i + 1 < b.length; i += 2) m = Math.max(m, ptPoly(b[i], b[i + 1], a));
  return m;
}
const plain = (_k: string, v: unknown): unknown => (ArrayBuffer.isView(v) ? Array.from(v as unknown as ArrayLike<number>) : v);
const DEBUG_ONLY = new Set(["aArm", "bArm", "dA", "dB", "ji", "qKa", "qKb", "refA", "refB", "refVA", "refVB", "sA", "sB", "sideA", "sideB", "vKa", "vKb", "vSa", "vSb", "meet"]);
const droppedDebug = new Set<string>();
// Field-by-field diff of the non-piece parts: largest numeric difference and
// the first few structural mismatches (paths).
function diffRest(a: unknown, b: unknown, path: string, acc: { maxNum: number; at: string; mism: string[] }): void {
  if (typeof a === "number" && typeof b === "number") {
    const d = Number.isNaN(a) && Number.isNaN(b) ? 0 : Math.abs(a - b);
    if (!(d <= acc.maxNum)) { acc.maxNum = d; acc.at = path; }
    return;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) { if (acc.mism.length < 6) acc.mism.push(`${path}: length ${a.length} vs ${b.length}`); return; }
    for (let i = 0; i < a.length; i++) diffRest(a[i], b[i], `${path}[${i}]`, acc);
    return;
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const ka = Object.keys(a as object).sort(); const kb = Object.keys(b as object).sort();
    // The fast frame leaves out the corners' debug-only fields: listed once
    // at the end, not failures. Any other key difference is a mismatch.
    const lost = ka.filter((k) => !kb.includes(k)); const gained = kb.filter((k) => !ka.includes(k));
    for (const k of lost) if (DEBUG_ONLY.has(k)) droppedDebug.add(k);
    const bad = [...lost.filter((k) => !DEBUG_ONLY.has(k)), ...gained.map((k) => `+${k}`)];
    if (bad.length && acc.mism.length < 6) acc.mism.push(`${path}: keys ${bad.join()}`);
    for (const k of ka) if (kb.includes(k)) diffRest((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${path}.${k}`, acc);
    return;
  }
  if (a !== b && acc.mism.length < 6) acc.mism.push(`${path}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`);
}

interface BP { kind: string; chain: number; side: number; corner: number; region: number; s0: number; s1: number; pts: number[]; cpts: number[] }
let fails = 0;
const lines: string[] = [];
for (const name of ALL) {
  const orig = load(name);
  const mults = ["def", "ring", "fat"].includes(name) ? [0, 0.1, 0.5] : [0, 0.1];
  for (const mult of mults) {
    const f = join(baseDir, `table_${name}_${mult}.json`);
    if (!existsSync(f)) { lines.push(`${name} ${mult}: missing ${f}`); fails++; continue; }
    const base = JSON.parse(readFileSync(f, "utf8")) as { table: { pieces: BP[] } & Record<string, unknown> };
    const sc = mult ? perturb(orig, mult * orig.look.halfWidth) : orig;
    const other = perturb(orig, (mult === 0.1 ? 0.5 : 0.1) * orig.look.halfWidth);
    for (const mode of ["cold", "warm"] as const) {
      const st = structure(orig);
      if (mode === "warm") frame(st, other);
      const t = JSON.parse(JSON.stringify(frame(st, sc), plain)) as { pieces: BP[] } & Record<string, unknown>;
      const bp = base.table.pieces; const tp = t.pieces;
      let keyFail = bp.length !== tp.length ? `count ${bp.length} vs ${tp.length}` : "";
      let maxD = 0; let at = ""; let maxS = 0; let npDiff = 0; let maxC = 0;
      for (let i = 0; i < Math.min(bp.length, tp.length); i++) {
        const a = bp[i]; const b = tp[i];
        if (!keyFail && (a.kind !== b.kind || a.chain !== b.chain || a.side !== b.side || a.corner !== b.corner || a.region !== b.region)) keyFail = `piece ${i}: ${a.kind}/${a.chain}/${a.side}/${a.corner}/${a.region} vs ${b.kind}/${b.chain}/${b.side}/${b.corner}/${b.region}`;
        const d = hausdorff(a.pts, b.pts);
        if (a.pts.length !== b.pts.length) npDiff++;
        if (d > maxD) { maxD = d; at = `piece ${i} ${a.kind} ch${a.chain} side${a.side} corner${a.corner}`; }
        maxS = Math.max(maxS, Math.abs(a.s0 - b.s0), Math.abs(a.s1 - b.s1));
        maxC = Math.max(maxC, hausdorff(a.cpts ?? [], b.cpts ?? []));
      }
      const acc = { maxNum: 0, at: "", mism: [] as string[] };
      const { pieces: _a, ...restA } = base.table; const { pieces: _b, diagnostics: _dg, ...restB } = t;
      diffRest(restA, restB, "table", acc);
      if (keyFail || acc.mism.length) fails++;
      lines.push(`${name} ${mult} ${mode}: ${keyFail ? `KEYS FAIL ${keyFail}` : "keys ok"}; max pts ${maxD.toExponential(2)} (${at || "-"}); cpts ${maxC.toExponential(2)}; s ${maxS.toExponential(2)}; point-count diffs ${npDiff}; rest max ${acc.maxNum.toExponential(2)} at ${acc.at || "-"}${acc.mism.length ? `; REST MISMATCH ${acc.mism.join(" | ")}` : ""}`);
    }
  }
}
for (const l of lines) console.log(l);
if (droppedDebug.size) console.log(`info: the fast frame leaves out debug-only fields ${[...droppedDebug].sort().join(", ")}`);
console.log(fails ? `${fails} FAILURES` : "ALL KEYS AND FIELDS MATCH (distances above)");
