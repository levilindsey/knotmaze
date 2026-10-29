// K1040 S1c: the pops by mechanism (steps 2 and 4). Reads pops.ts's DUMP=1
// output (each pop's pixel indices), rebuilds form B on both frames of every
// pair with a pop and, at each pop pixel, evaluates form B with a term trace in
// both frames and gives the pixel a mechanism, first match wins:
// - merge: a same-chain minimum within σ was dropped in either frame (S1's f1);
// - winner X>Y: the winning term's kind or chain changed (/top: the top surface too);
// - handoff X: the same term moved between its group and OWN;
// - weight X: the same term, its weight (a foot's burial, an arc's share) moved by > 1/8;
// - gate X: the same term and weight, but the pieces or covering surfaces changed;
// - motion X: none of those, the term's own value moved more than label_pops allows.
// A pop takes its pixels' majority. Places as the brief: junction, crossing60+
// and elsewhere (pops.ts's classify, the other crossings folded into elsewhere).
// Run: npx vite-node .claude/probes/K1040/s1/pops_mech.ts <popsDir> [seq,...]
// Env: OUT (default <popsDir>/mech), CROPS (crops per table cell, default 1),
// PARAMS (JSON merged into FormBParams).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { gunzipSync } from "node:zlib";
import { candidates, dS, type Cand } from "../../../../src/render/field/geom";
import type { FieldScene } from "../../../../src/render/field/scene";
import { FormB, OWN, type FormBParams, type Piece } from "../../../../src/render/field/form_b";
import { encodePng } from "../../../../test/render/field/png";

const seqDir = "C:/Users/lsl/Repositories/knotmaze/.claude/worktrees/k868-s3a/.claude/probes/S3a/seq13";
const popsDir = process.argv[2];
const seqs = (process.argv[3] ?? "def_drag,def_flow,muse_drag,muse_flow").split(",");
const outDir = process.env.OUT ?? join(popsDir, "mech");
mkdirSync(join(outDir, "crops"), { recursive: true });
const CROPS = Number(process.env.CROPS ?? 1);
const extra = JSON.parse(process.env.PARAMS ?? "{}") as FormBParams;
const AMIN = 4;
const KN = ["none", "foot", "tA", "tB", "V", "arc"];
const r3 = (v: number) => Math.round(v * 1000) / 1000;

interface Frame {
  i: number;
  t: number;
  scene: FieldScene;
}
function readSeq(name: string): Frame[] {
  const lines = gunzipSync(readFileSync(join(seqDir, `${name}.jsonl.gz`))).toString("utf8").split("\n").filter(Boolean);
  const frames: Frame[] = [];
  let prev = "";
  for (let k = 1; k < lines.length; k++) {
    const fr = JSON.parse(lines[k]) as Frame;
    const key = JSON.stringify(fr.scene.chains);
    if (key === prev) continue;
    prev = key;
    fr.scene.look.ctrlArc ??= 0.47;
    frames.push(fr);
  }
  return frames;
}

const cbuf: Cand[] = [];
/** Did pieces()' σ merge drop a same-chain minimum at (x, y)? */
function mergedAt(fb: FormB, x: number, y: number): boolean {
  candidates(fb.grid, x, y, fb.h + fb.W + 2 * fb.aa, cbuf);
  const cs = cbuf.slice().sort((u, v) => u.d - v.d);
  const kept: Cand[] = [];
  for (const c of cs) {
    for (const q of kept) if (q.chain === c.chain && Math.abs(dS(fb.polys[c.chain], q.s, c.s)) <= fb.sigma) return true;
    kept.push(c);
  }
  return false;
}

interface Tr {
  ink: number;
  top: number;
  kind: number;
  chain: number;
  own: boolean;
  w: number;
  nSurf: number;
  np: number;
  nu: number;
  merged: boolean;
  fade: number;
}
const P: Piece[] = [];
function trace(fb: FormB, x: number, y: number): Tr {
  const r = fb.evalPoint(x, y);
  fb.pieces(x, y, P);
  let nu = 0;
  for (const A of P) if (A.g >= 0 && A.ramp > 0 && A.ramp < 1) nu++;
  const t = r.term;
  return { ink: r.ink, top: r.top, kind: t ? t.kind : 0, chain: t ? t.chain : -1, own: t ? t.surf >= OWN : false, w: t ? t.w : 0, nSurf: r.nSurf, np: P.length, nu, merged: mergedAt(fb, x, y), fade: r.fade };
}
function mech(a: Tr, b: Tr): string {
  if (a.merged || b.merged) return "merge";
  if (a.kind !== b.kind || a.chain !== b.chain) return `winner ${KN[a.kind]}>${KN[b.kind]}${a.top !== b.top ? "/top" : ""}`;
  if (a.own !== b.own) return `handoff ${KN[a.kind]}`;
  if (Math.abs(a.w - b.w) > 0.125) return `weight ${KN[a.kind]}`;
  if (a.nSurf !== b.nSurf || a.np !== b.np) return `gate ${KN[a.kind]}`;
  return `motion ${KN[a.kind]}`;
}
const placeOf = (near: string) => (near === "junction" ? "junction" : near === "crossing60+" ? "crossing60+" : "elsewhere");

interface Pop {
  px: number;
  at: [number, number];
  near: string;
  pix: number[];
}
interface Cell {
  pops: number;
  px: number;
  worst: { seq: string; from: number; to: number; at: [number, number]; px: number; mix: Record<string, number>; crop?: string }[];
}
const table: Record<string, Record<string, Cell>> = {};
const mergeAcc = { pops: 0, px: 0, mergedPx: 0, popsLeft: 0, pxLeft: 0, whollyMerged: 0 };
const lines: string[] = [];
const units: Record<string, number> = {};

function crop(seq: string, fa: FormB, fbb: FormB, cam: FieldScene["camera"], pop: Pop, tag: string): string {
  const [nx] = cam.viewport;
  const [a, b, c, d, e, f] = cam.worldToCss;
  const det = a * d - b * c;
  let si = 0;
  let sj = 0;
  for (const o of pop.pix) {
    si += o % nx;
    sj += Math.floor(o / nx);
  }
  const ci = Math.round(si / pop.pix.length);
  const cj = Math.round(sj / pop.pix.length);
  const R = 16;
  const Z = 8;
  const n = 2 * R;
  const W3 = 3 * n * Z + 2 * Z;
  const H = n * Z;
  const rgba = new Uint8Array(W3 * H * 4).fill(255);
  const popSet = new Set(pop.pix);
  const put = (panel: number, i: number, j: number, rgb: [number, number, number]) => {
    for (let y = 0; y < Z; y++)
      for (let x = 0; x < Z; x++) {
        const q = ((j * Z + y) * W3 + panel * (n * Z + Z) + i * Z + x) * 4;
        rgba[q] = rgb[0];
        rgba[q + 1] = rgb[1];
        rgba[q + 2] = rgb[2];
      }
  };
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const I = ci - R + i;
      const J = cj - R + j;
      const u = I + 0.5 - e;
      const v = J + 0.5 - f;
      const x = (d * u - c * v) / det;
      const y = (-b * u + a * v) / det;
      const ra = fa.evalPoint(x, y);
      const rb = fbb.evalPoint(x, y);
      const ga = Math.round(255 * (1 - ra.ink));
      const gb = Math.round(255 * (1 - rb.ink));
      put(0, i, j, ra.top < 0 ? [ga, ga, ga] : [ga, ga, Math.min(255, ga + 0)]);
      put(1, i, j, [gb, gb, gb]);
      const dl = Math.round(255 * Math.min(1, Math.abs(rb.ink - ra.ink)));
      put(2, i, j, popSet.has(J * nx + I) ? [255, 255 - dl, 255 - dl] : [255 - dl, 255 - dl, 255]);
    }
  const file = join(outDir, "crops", `${seq}_${tag}.png`);
  writeFileSync(file, encodePng(W3, H, rgba));
  return file;
}

// merge: combine the per-sequence runs (OUT=<popsDir>/mech_<seq>) into <popsDir>/mech.
if (seqs[0] === "merge") {
  seqs.length = 0;
  for (const s of ["def_drag", "def_flow", "muse_drag", "muse_flow"]) {
    const j = JSON.parse(readFileSync(join(popsDir, `mech_${s}`, "mech.json"), "utf8")) as { merge: typeof mergeAcc; units: Record<string, number>; table: typeof table; lines: string[] };
    for (const k of Object.keys(mergeAcc) as (keyof typeof mergeAcc)[]) mergeAcc[k] += j.merge[k];
    for (const [k, v] of Object.entries(j.units)) units[k] = (units[k] ?? 0) + v;
    for (const [mk, row] of Object.entries(j.table))
      for (const [place, cell] of Object.entries(row)) {
        const c0 = ((table[mk] ??= {})[place] ??= { pops: 0, px: 0, worst: [] });
        c0.pops += cell.pops;
        c0.px += cell.px;
        c0.worst.push(...cell.worst);
        c0.worst.sort((p, q) => q.px - p.px);
        c0.worst.length = Math.min(c0.worst.length, Math.max(1, CROPS));
      }
    lines.push(...j.lines);
  }
}
for (const seq of seqs) {
  const dump = JSON.parse(readFileSync(join(popsDir, `${seq}.json`), "utf8")) as { pairs: { from: number; to: number; pops: Pop[] }[] };
  const frames = readSeq(seq);
  const cam = frames[0].scene.camera;
  const [nx, ny] = cam.viewport;
  const [a, b, c, d, e, f] = cam.worldToCss;
  const det = a * d - b * c;
  const kOf = new Map(frames.map((fr, k) => [fr.i, k]));
  const cache = new Map<number, FormB>();
  const get = (k: number) => {
    let fb = cache.get(k);
    if (!fb) {
      fb = new FormB(frames[k].scene, extra);
      cache.set(k, fb);
    }
    return fb;
  };
  const byMech: Record<string, number> = {};
  for (const pair of dump.pairs) {
    if (!pair.pops.length) continue;
    const fa = get(kOf.get(pair.from)!);
    const fbb = get(kOf.get(pair.to)!);
    const left = new Uint8Array(nx * ny);
    for (const pop of pair.pops) {
      const mix: Record<string, number> = {};
      let mergedPx = 0;
      for (const o of pop.pix) {
        const x0 = ((o % nx) + 0.5 - e) as number;
        const y0 = (Math.floor(o / nx) + 0.5 - f) as number;
        const x = (d * x0 - c * y0) / det;
        const y = (-b * x0 + a * y0) / det;
        const ta = trace(fa, x, y);
        const tb = trace(fbb, x, y);
        const m = mech(ta, tb);
        mix[m] = (mix[m] ?? 0) + 1;
        const uk = `${Math.max(ta.nu, tb.nu)}`;
        units[uk] = (units[uk] ?? 0) + 1;
        if (m === "merge") mergedPx++;
        else left[o] = 1;
      }
      mergeAcc.pops++;
      mergeAcc.px += pop.px;
      mergeAcc.mergedPx += mergedPx;
      if (mergedPx === pop.px) mergeAcc.whollyMerged++;
      const top = Object.entries(mix).sort((p, q) => q[1] - p[1])[0][0];
      byMech[top] = (byMech[top] ?? 0) + 1;
      const place = placeOf(pop.near);
      const cell = ((table[top] ??= {})[place] ??= { pops: 0, px: 0, worst: [] });
      cell.pops++;
      cell.px += pop.px;
      cell.worst.push({ seq, from: pair.from, to: pair.to, at: pop.at, px: pop.px, mix });
      cell.worst.sort((p, q) => q.px - p.px);
      if (cell.worst.length > Math.max(1, CROPS)) cell.worst.length = Math.max(1, CROPS);
    }
    // S1's f1 recount: the pops left once the merged pixels are excused (8-connected, >= 4 px).
    const seen = new Uint8Array(nx * ny);
    for (let o0 = 0; o0 < nx * ny; o0++) {
      if (!left[o0] || seen[o0]) continue;
      let size = 0;
      const st = [o0];
      seen[o0] = 1;
      while (st.length) {
        const o = st.pop()!;
        size++;
        const i = o % nx;
        const j = (o - i) / nx;
        for (let dj = -1; dj <= 1; dj++)
          for (let di = -1; di <= 1; di++) {
            const u = i + di;
            const v = j + dj;
            if (u < 0 || v < 0 || u >= nx || v >= ny) continue;
            const q = v * nx + u;
            if (left[q] && !seen[q]) {
              seen[q] = 1;
              st.push(q);
            }
          }
      }
      if (size >= AMIN) {
        mergeAcc.popsLeft++;
        mergeAcc.pxLeft += size;
      }
    }
  }
  lines.push(`${seq}: by mechanism ${JSON.stringify(byMech)}`);
  // Crops of each cell's worst pops from this sequence.
  for (const [mk, row] of Object.entries(table))
    for (const [place, cell] of Object.entries(row))
      for (const w of cell.worst) {
        if (w.seq !== seq || w.crop) continue;
        const pair = dump.pairs.find((p) => p.from === w.from && p.to === w.to)!;
        const pop = pair.pops.find((p) => p.at[0] === w.at[0] && p.at[1] === w.at[1])!;
        w.crop = crop(seq, get(kOf.get(w.from)!), get(kOf.get(w.to)!), cam, pop, `${mk.replace(/[^a-zA-Z0-9]+/g, "-")}_${place}_${w.from}`);
      }
}
lines.push(`merge (S1's f1): ${mergeAcc.mergedPx} of ${mergeAcc.px} pop px merged in either frame; ${mergeAcc.whollyMerged} of ${mergeAcc.pops} pops wholly merged; with the merged px excused ${mergeAcc.popsLeft} pops (${mergeAcc.pxLeft} px) remain`);
lines.push(`ramp units at the pop px (max of the two frames): ${JSON.stringify(units)}`);
lines.push("mechanism | place | pops | px | worst (seq from>to at px)");
const rows = Object.entries(table).sort((p, q) => Object.values(q[1]).reduce((s, c) => s + c.px, 0) - Object.values(p[1]).reduce((s, c) => s + c.px, 0));
for (const [mk, row] of rows)
  for (const place of ["junction", "crossing60+", "elsewhere"]) {
    const cell = row[place];
    if (!cell) continue;
    const w = cell.worst[0];
    lines.push(`${mk} | ${place} | ${cell.pops} | ${cell.px} | ${w.seq} ${w.from}>${w.to} (${w.at.map(r3).join(", ")}) ${w.px} px`);
  }
writeFileSync(join(outDir, "mech.txt"), `${lines.join("\n")}\n`);
writeFileSync(join(outDir, "mech.json"), JSON.stringify({ merge: mergeAcc, units, table, lines: lines.filter((l) => l.includes(": by mechanism")) }, null, 1));
for (const l of lines) console.log(l);
