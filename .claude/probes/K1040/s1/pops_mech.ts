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
// SWEEP (default on): each pop's frame pair is interpolated (chains' samples
// and depths, every s, junction centres) at NC steps, and the worst step is
// bisected LEV times at the pop's pixel whose ink changes most. A change
// still above JUMP at 1/(NC * 2^LEV) of the frame step is a hard switch,
// named by what differs across it; anything else is smooth: it crosses a
// fade between the frames, or it is motion beyond label_pops' rule.
const SWEEP = process.env.SWEEP !== "0";
const NC = 8;
const LEV = Number(process.env.LEV ?? 30);
const JUMP = 0.02;
let nBuild = 0;
let msBuild = 0;
const BITS = ["fold", "cap", "tie", "omega"];
const bitNames = (b: number) => BITS.filter((_, i) => b & (1 << i)).join("+") || "none";
/** Why scenes A and B cannot be interpolated, or "" when they can. */
function mismatch(A: FieldScene, B: FieldScene): string {
  if (A.chains.length !== B.chains.length) return "chain count";
  for (let i = 0; i < A.chains.length; i++) {
    if (A.chains[i].id !== B.chains[i].id || A.chains[i].closed !== B.chains[i].closed) return "chain id";
    if (A.chains[i].pts.length !== B.chains[i].pts.length) return "chain samples";
  }
  if (A.crossings.length !== B.crossings.length) return "crossing count";
  for (let i = 0; i < A.crossings.length; i++) {
    const a = A.crossings[i];
    const b = B.crossings[i];
    if (a.a.chain !== b.a.chain || a.b.chain !== b.b.chain || a.over !== b.over || !!a.emergent !== !!b.emergent) return "crossing";
  }
  if (A.junctions.length !== B.junctions.length) return "junction count";
  for (let i = 0; i < A.junctions.length; i++) {
    const a = A.junctions[i];
    const b = B.junctions[i];
    if (a.id !== b.id || a.arms.length !== b.arms.length) return "junction";
    for (let k = 0; k < a.arms.length; k++) if (a.arms[k].chain !== b.arms[k].chain || a.arms[k].dir !== b.arms[k].dir || a.arms[k].kind !== b.arms[k].kind) return "junction arms";
    if (JSON.stringify(a.corners ?? null) !== JSON.stringify(b.corners ?? null)) return "corner styles";
  }
  if (A.deadEnds.length !== B.deadEnds.length) return "dead ends";
  for (let i = 0; i < A.deadEnds.length; i++) if (A.deadEnds[i].chain !== B.deadEnds[i].chain) return "dead ends";
  return "";
}
function chainLen(pts: number[], closed: boolean): number {
  let L = 0;
  const n = pts.length / 2;
  for (let k = 0; k + 1 < n; k++) L += Math.sqrt((pts[2 * k + 2] - pts[2 * k]) ** 2 + (pts[2 * k + 3] - pts[2 * k + 1]) ** 2);
  if (closed && n > 1) L += Math.sqrt((pts[0] - pts[2 * n - 2]) ** 2 + (pts[1] - pts[2 * n - 1]) ** 2);
  return L;
}
/** A and B interpolated at t (they must match); s on a closed chain takes the short way round. */
function lerpScene(A: FieldScene, B: FieldScene, t: number): FieldScene {
  const L = (a: number, b: number) => a + (b - a) * t;
  const chains = A.chains.map((c, i) => ({ ...c, pts: c.pts.map((v, k) => L(v, B.chains[i].pts[k])), z: c.z.map((v, k) => L(v, B.chains[i].z[k])) }));
  const lens = chains.map((c, i) => [chainLen(A.chains[i].pts, c.closed), chainLen(B.chains[i].pts, c.closed), chainLen(c.pts, c.closed)]);
  const idx = new Map(A.chains.map((c, i) => [c.id, i]));
  const sL = (chain: number, a: number, b: number) => {
    const i = idx.get(chain) ?? chain;
    if (!chains[i]?.closed) return L(a, b);
    const [la, lb, lt] = lens[i];
    const fa = a / la;
    let fb = b / lb;
    if (fb - fa > 0.5) fb -= 1;
    else if (fa - fb > 0.5) fb += 1;
    const fr = L(fa, fb);
    return (fr - Math.floor(fr)) * lt;
  };
  return {
    ...A,
    chains,
    crossings: A.crossings.map((c, i) => ({ ...c, a: { ...c.a, s: sL(c.a.chain, c.a.s, B.crossings[i].a.s) }, b: { ...c.b, s: sL(c.b.chain, c.b.s, B.crossings[i].b.s) } })),
    junctions: A.junctions.map((j, i) => ({ ...j, c: [L(j.c[0], B.junctions[i].c[0]), L(j.c[1], B.junctions[i].c[1])] as [number, number], arms: j.arms.map((a, k) => ({ ...a, s: sL(a.chain, a.s, B.junctions[i].arms[k].s) })) })),
    deadEnds: A.deadEnds.map((d, i) => ({ ...d, s: sL(d.chain, d.s, B.deadEnds[i].s) })),
  };
}

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
  nc: number;
}
const P: Piece[] = [];
function trace(fb: FormB, x: number, y: number): Tr {
  const r = fb.evalPoint(x, y);
  fb.pieces(x, y, P);
  let nu = 0;
  for (const A of P) if (A.g >= 0 && A.ramp > 0 && A.ramp < 1) nu++;
  const t = r.term;
  return { ink: r.ink, top: r.top, kind: t ? t.kind : 0, chain: t ? t.chain : -1, own: t ? t.surf >= OWN : false, w: t ? t.w : 0, nSurf: r.nSurf, np: P.length, nu, merged: mergedAt(fb, x, y), fade: r.fade, nc: (fb as unknown as { cornersNear(x: number, y: number): number[] }).cornersNear(x, y).length };
}
function mech(a: Tr, b: Tr): string {
  if (a.merged || b.merged) return "merge";
  if (a.kind !== b.kind || a.chain !== b.chain) return `winner ${KN[a.kind]}>${KN[b.kind]}${a.top !== b.top ? "/top" : ""}`;
  if (a.own !== b.own) return `handoff ${KN[a.kind]}`;
  if (Math.abs(a.w - b.w) > 0.125) return `weight ${KN[a.kind]}`;
  if (a.nSurf !== b.nSurf || a.np !== b.np) return `gate ${KN[a.kind]}`;
  return `motion ${KN[a.kind]}`;
}
/** What differs across a hard switch, causes first. */
function mechSwitch(a: Tr, b: Tr): string {
  if (a.merged !== b.merged) return "merge";
  if (a.np !== b.np) return `gate pieces ${KN[a.kind]}>${KN[b.kind]}`;
  if (a.nSurf !== b.nSurf) return `gate surfaces ${KN[a.kind]}>${KN[b.kind]}`;
  if ((a.fade ^ b.fade) & 4) return "tie";
  if (a.own !== b.own) return `handoff ${KN[a.kind]}`;
  if (a.kind === b.kind && a.chain === b.chain && Math.abs(a.w - b.w) > 0.05) return `weight ${KN[a.kind]}`;
  if (a.kind !== b.kind || a.chain !== b.chain) return `winner ${KN[a.kind]}>${KN[b.kind]}${a.top !== b.top ? "/top" : ""}`;
  if (a.fade !== b.fade) return `fade ${bitNames(a.fade ^ b.fade)}`;
  return `jump ${KN[a.kind]}`;
}
/**
 * The corner solves that jump across a bisected switch (2^-LEV of the pair, so a
 * continuous field moves far less than 1e-6): among the corners whose fill can
 * reach (x, y) on either side, a corner that exists on one side only, or whose
 * fillet center q jumps at the same r (a different root of the equidistance
 * solve), whose r jumps (the feasibility bisection), or whose ω jumps (the
 * overlap gate). Empty when no corner jumps.
 */
const CF = ["Vx", "Vy", "qx", "qy", "r", "r1", "rV", "theta", "room", "omega", "ov", "dA", "dB", "tax", "tay", "tbx", "tby"];
function cornerSwitch(f1: FormB, f2: FormB, x: number, y: number): { tag: string; detail: string } | null {
  type C = Record<string, number>;
  const near = (f: FormB) => {
    const cs = (f as unknown as { corners: C[] }).corners;
    const m = new Map<string, C>();
    for (const i of f.cornersNear(x, y)) {
      const c = cs[i];
      if (Math.hypot(x - c.qx, y - c.qy) <= c.rV + f.W + 4 * f.aa) m.set(`${c.j}/${c.a}/${c.b}`, c);
    }
    return { m, all: new Map(cs.map((c) => [`${c.j}/${c.a}/${c.b}`, c])) };
  };
  const A = near(f1);
  const B = near(f2);
  const keys = new Set([...A.m.keys(), ...B.m.keys()]);
  const found: { rank: number; tag: string; detail: string }[] = [];
  for (const k of keys) {
    const c = A.all.get(k);
    const d = B.all.get(k);
    if (!c || !d) {
      found.push({ rank: 0, tag: c ? "gone" : "new", detail: `${k}` });
      continue;
    }
    const jumped = CF.filter((f) => Math.abs(c[f] - d[f]) > 1e-6);
    if (!jumped.length) continue;
    const q = jumped.includes("qx") || jumped.includes("qy");
    const tag = jumped.includes("r") ? "radius" : q ? "root" : jumped.includes("omega") ? "overlap" : `fields`;
    found.push({ rank: tag === "radius" ? 1 : tag === "root" ? 2 : 3, tag, detail: `${k} ${jumped.map((f) => `${f} ${r3(c[f])}>${r3(d[f])}`).join(" ")}` });
  }
  if (!found.length) return null;
  found.sort((p, q) => p.rank - q.rank);
  return { tag: found[0].tag, detail: found.map((f) => `${f.tag} ${f.detail}`).join("; ") };
}
const placeOf =(near: string) => (near === "junction" ? "junction" : near === "crossing60+" ? "crossing60+" : "elsewhere");

interface Pop {
  px: number;
  at: [number, number];
  near: string;
  pix: number[];
}
interface Cell {
  pops: number;
  px: number;
  worst: { seq: string; from: number; to: number; at: [number, number]; px: number; mix: Record<string, number>; sw?: Record<string, unknown>; crop?: string }[];
}
const table: Record<string, Record<string, Cell>> = {};
/** Every pop with its mechanism and sweep, for corner_why.ts. */
const allPops: unknown[] = [];
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
    const kA = kOf.get(pair.from)!;
    const kB = kOf.get(pair.to)!;
    const fa = get(kA);
    const fbb = get(kB);
    const why = SWEEP ? mismatch(frames[kA].scene, frames[kB].scene) : "";
    const tc = new Map<number, FormB>([
      [0, fa],
      [1, fbb],
    ]);
    const at = (t: number) => {
      let fb = tc.get(t);
      if (!fb) {
        const t0 = performance.now();
        fb = new FormB(lerpScene(frames[kA].scene, frames[kB].scene, t), extra);
        msBuild += performance.now() - t0;
        nBuild++;
        if (Number.isInteger(t * NC)) tc.set(t, fb);
      }
      return fb;
    };
    const left = new Uint8Array(nx * ny);
    for (const pop of pair.pops) {
      const mix: Record<string, number> = {};
      let mergedPx = 0;
      let rep: [number, number] = [0, 0];
      let repD = -1;
      for (const o of pop.pix) {
        const x0 = ((o % nx) + 0.5 - e) as number;
        const y0 = (Math.floor(o / nx) + 0.5 - f) as number;
        const x = (d * x0 - c * y0) / det;
        const y = (-b * x0 + a * y0) / det;
        const ta = trace(fa, x, y);
        const tb = trace(fbb, x, y);
        const m = mech(ta, tb);
        mix[m] = (mix[m] ?? 0) + 1;
        if (Math.abs(tb.ink - ta.ink) > repD) {
          repD = Math.abs(tb.ink - ta.ink);
          rep = [x, y];
        }
        const uk = `${Math.max(ta.nu, tb.nu)}`;
        units[uk] = (units[uk] ?? 0) + 1;
        if (m === "merge") mergedPx++;
        else left[o] = 1;
      }
      mergeAcc.pops++;
      mergeAcc.px += pop.px;
      mergeAcc.mergedPx += mergedPx;
      if (mergedPx === pop.px) mergeAcc.whollyMerged++;
      let top = Object.entries(mix).sort((p, q) => q[1] - p[1])[0][0];
      let sw: Record<string, unknown> | undefined;
      if (SWEEP && why) top = `scene ${why}`;
      else if (SWEEP) {
        const [x, y] = rep;
        const iv: number[] = [];
        for (let j = 0; j <= NC; j++) iv.push(at(j / NC).evalPoint(x, y).ink);
        let js = 0;
        for (let j = 1; j < NC; j++) if (Math.abs(iv[j + 1] - iv[j]) > Math.abs(iv[js + 1] - iv[js])) js = j;
        let lo = js / NC;
        let hi = (js + 1) / NC;
        let ilo = iv[js];
        let ihi = iv[js + 1];
        for (let l = 0; l < LEV; l++) {
          const mt = (lo + hi) / 2;
          const im = at(mt).evalPoint(x, y).ink;
          if (Math.abs(im - ilo) >= Math.abs(ihi - im)) {
            hi = mt;
            ihi = im;
          } else {
            lo = mt;
            ilo = im;
          }
        }
        const jump = Math.abs(ihi - ilo);
        let fm = 0;
        for (let j = 1; j < NC; j++) fm |= at(j / NC).evalPoint(x, y).fade;
        if (jump > JUMP) {
          const t1 = trace(at(lo), x, y);
          const t2 = trace(at(hi), x, y);
          const cs = cornerSwitch(at(lo), at(hi), x, y);
          top = cs ? `switch corner ${cs.tag}` : `switch ${mechSwitch(t1, t2)}`;
          sw = { at: [r3(x), r3(y)], t: lo, jump: r3(jump), total: r3(repD), a: t1, b: t2, corners: cs?.detail };
        } else {
          top = fm ? `smooth fade ${bitNames(fm)}` : "smooth motion";
          sw = { at: [r3(x), r3(y)], total: r3(repD), maxStep: r3(Math.abs(iv[js + 1] - iv[js])), fadeMid: fm };
        }
      }
      byMech[top] = (byMech[top] ?? 0) + 1;
      const place = placeOf(pop.near);
      const cell = ((table[top] ??= {})[place] ??= { pops: 0, px: 0, worst: [] });
      cell.pops++;
      cell.px += pop.px;
      cell.worst.push({ seq, from: pair.from, to: pair.to, at: pop.at, px: pop.px, mix, sw });
      allPops.push({ seq, from: pair.from, to: pair.to, at: pop.at, px: pop.px, place, top, sw });
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
if (SWEEP) lines.push(`sweep: ${nBuild} interpolated scenes built in ${Math.round(msBuild / 1000)} s (NC ${NC}, LEV ${LEV}, jump > ${JUMP})`);
writeFileSync(join(outDir, "mech.txt"), `${lines.join("\n")}\n`);
writeFileSync(join(outDir, "mech.json"), JSON.stringify({ merge: mergeAcc, units, table, all: allPops, lines:lines.filter((l) => l.includes(": by mechanism")) }, null, 1));
for (const l of lines) console.log(l);
