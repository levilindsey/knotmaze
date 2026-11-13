// K1247 s34: the snap alone, as OutlineModel.update runs it (alignJunctionArms, then snapScene), over a captured drag.
// Prints (1) a sha1 of every frame's snapped scene and dirty set (chains' point bits, crossings' and junctions'
// fields), so two builds of snapScene can be compared frame by frame (out=<file> writes them, one line a frame);
// (2) snapScene's own time p50/p95 (rep passes, the first discarded); (3) the dirty share at 32-point spans: a span
// is dirty when any of its committed points changed bits since the last frame (the snap's output), against the
// span's own move (any true point moved more than T since that span's own last commit: the per-span ceiling).
//   node scripts/run_node.mjs .claude/probes/K1247/k1247s34_snap.ts <dragDir> [sub=10] [rep=3] [out=file] [kf.x=v]
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { OutlineModel } from "../../../src/render/outline/outline_model";
import { KF_INC, alignJunctionArms, newSnapState, snapScene } from "../../../src/render/outline/outline";
import type { DiagramStructure, SceneIn } from "../../../src/render/outline/outline";
import { loadDrag } from "./k1247s32_lib";

const arg = (k: string, d: string): string => process.argv.find((a) => a.startsWith(`${k}=`))?.slice(k.length + 1) ?? d;
const dir = process.argv[2]; const sub = +arg("sub", "10"); const rep = +arg("rep", "3"); const out = arg("out", "");
for (const kv of process.argv.slice(3)) { const m = /^kf\.(\w+)=(.*)$/.exec(kv); if (m) (KF_INC as unknown as Record<string, unknown>)[m[1]] = m[2] === "true" ? true : m[2] === "false" ? false : +m[2]; }
KF_INC.snap = true;
const { cap, raw } = loadDrag(dir, sub);
const st = (new OutlineModel(cap[0]) as unknown as { st: DiagramStructure }).st;
const SPAN = 32;
const px = cap[0].camera.pxPerUnit * cap[0].camera.dpr; const T = KF_INC.T; const tw2 = (T / px) ** 2;
const hashOf = (sc: SceneIn, S: ReturnType<typeof newSnapState>): string => {
  const h = createHash("sha1");
  for (const c of sc.chains) { h.update(Float64Array.from(c.pts as ArrayLike<number>)); h.update("|"); }
  for (const x of sc.crossings) h.update(`${x.a.chain},${x.a.s},${x.b.chain},${x.b.s},${x.over};`);
  for (const j of sc.junctions) h.update(JSON.stringify(j));
  h.update(S.dChains); h.update(S.dCross); h.update(S.dJunc);
  return h.digest("hex").slice(0, 16);
};
const times: number[] = []; const hashes: string[] = [];
const dSpan: number[] = []; const cSpan: number[] = []; const dPt: number[] = [];
for (let r = 0; r < rep; r++) {
  const S = newSnapState(); let prev: number[][] | null = null;
  // per-span own commit (the ceiling): the true points at the span's last release
  let own: number[][] | null = null;
  for (let f = 0; f < raw.length; f++) {
    const al = alignJunctionArms(st, raw[f]);
    const t0 = performance.now(); const sc = snapScene(S, al); const dt = performance.now() - t0;
    if (r > 0) times.push(dt);
    if (r !== rep - 1) continue;
    hashes.push(hashOf(sc, S));
    const cur = sc.chains.map((c) => Array.from(c.pts as ArrayLike<number>));
    const tru = al.chains.map((c) => Array.from(c.pts as ArrayLike<number>));
    if (prev && own) {
      let ns = 0; let nd = 0; let nc = 0; let np = 0; let na = 0;
      for (let i = 0; i < cur.length; i++) {
        const c = cur[i]; const o = prev[i]; const t = tru[i]; const w = own[i]; const n = c.length >> 1;
        for (let s0 = 0; s0 < n; s0 += SPAN) {
          ns++; let d = 0; let mv = 0;
          for (let k = s0; k < Math.min(n, s0 + SPAN); k++) {
            na++;
            if (!o || o.length !== c.length || c[2 * k] !== o[2 * k] || c[2 * k + 1] !== o[2 * k + 1]) { d = 1; np++; }
            if (!w || w.length !== t.length || (t[2 * k] - w[2 * k]) ** 2 + (t[2 * k + 1] - w[2 * k + 1]) ** 2 > tw2) mv = 1;
          }
          nd += d; nc += mv;
          if (mv && w && w.length === t.length) for (let k = s0; k < Math.min(n, s0 + SPAN); k++) { w[2 * k] = t[2 * k]; w[2 * k + 1] = t[2 * k + 1]; }
          else if (mv) own[i] = t.slice();
        }
      }
      dSpan.push(nd / ns); cSpan.push(nc / ns); dPt.push(np / na);
    } else own = tru.map((t) => t.slice());
    prev = cur;
  }
}
const q = (a: number[], p: number): number => { const b = [...a].sort((x, y) => x - y); return b.length ? b[Math.min(b.length - 1, Math.floor(p * b.length))] : NaN; };
const pc = (a: number[]): string => `p50 ${(100 * q(a, 0.5)).toFixed(1)}% p95 ${(100 * q(a, 0.95)).toFixed(1)}% mean ${(100 * a.reduce((x, y) => x + y, 0) / Math.max(1, a.length)).toFixed(1)}%`;
const all = createHash("sha1"); for (const h of hashes) all.update(h);
console.log(`${dir} sub ${sub}: ${raw.length} frames, T ${T}, jlocal ${KF_INC.jlocal} jx ${KF_INC.jx} jxw ${KF_INC.jxw} jxs ${KF_INC.jxs} jR ${KF_INC.jR} jM ${KF_INC.jM}; all-frames hash ${all.digest("hex").slice(0, 16)}`);
console.log(`  snap ms p50 ${q(times, 0.5).toFixed(2)} p95 ${q(times, 0.95).toFixed(2)} max ${Math.max(...times).toFixed(2)}`);
console.log(`  dirty spans (snapped pts changed): ${pc(dSpan)}`);
console.log(`  dirty points:                      ${pc(dPt)}`);
console.log(`  span ceiling (own move > T):       ${pc(cSpan)}`);
if (out) writeFileSync(out, hashes.join("\n") + "\n");
