// K1240 S3f (Claude, run 3): how far the moved checks' S' puts a crossing's
// two pass points apart. s3f_exact.ts's perturb moves chain points but keeps
// each crossing's s, and frame() places a crossing at pointAt(chain, s); on a
// consistent scene both passes' points coincide.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/s3f_claude_drift.ts [scene,...]
import { readFileSync } from "node:fs";
import type { SceneIn } from "./outline";

const names = (process.argv[2] ?? "def,ring,fat").split(",");
function perturb(scene: SceneIn, A: number): SceneIn { // copied from s3f_exact.ts
  const sc = JSON.parse(JSON.stringify(scene)) as SceneIn;
  for (const c of sc.chains) {
    for (let i = 0; i + 1 < c.pts.length; i += 2) {
      const x = c.pts[i]; const y = c.pts[i + 1];
      c.pts[i] = x + A * (0.7 * Math.sin(0.31 * y + 1.7) + 0.3 * Math.sin(0.83 * x + 0.4));
      c.pts[i + 1] = y + A * (0.7 * Math.cos(0.27 * x + 0.9) + 0.3 * Math.sin(0.71 * y + 2.3));
    }
  }
  return sc;
}
type Ch = { id: number; closed: boolean; pts: number[] };
const at = (c: Ch, s: number): [number, number] => {
  const p = c.pts; const n = p.length / 2; const segs = c.closed ? n : n - 1;
  let len = 0; for (let i = 0; i < segs; i++) { const j = (i + 1) % n; len += Math.hypot(p[2 * j] - p[2 * i], p[2 * j + 1] - p[2 * i + 1]); }
  if (c.closed && len > 0) s = ((s % len) + len) % len;
  let acc = 0;
  for (let i = 0; i < segs; i++) {
    const j = (i + 1) % n; const l = Math.hypot(p[2 * j] - p[2 * i], p[2 * j + 1] - p[2 * i + 1]);
    if (acc + l >= s || i === segs - 1) { const t = l > 0 ? Math.min(1, Math.max(0, (s - acc) / l)) : 0; return [p[2 * i] + (p[2 * j] - p[2 * i]) * t, p[2 * i + 1] + (p[2 * j + 1] - p[2 * i + 1]) * t]; }
    acc += l;
  }
  return [p[0], p[1]];
};
for (const name of names) {
  const S = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/${name}.json`, "utf8")) as SceneIn;
  const h = (S.look as { halfWidth: number }).halfWidth;
  for (const mult of [0, 0.1, 0.5]) {
    const Sp = mult ? perturb(S, mult * h) : S;
    const byId = new Map((Sp.chains as Ch[]).map((c) => [c.id, c]));
    const gaps: { g: number; s: number }[] = [];
    for (const x of Sp.crossings) {
      const ca = byId.get(x.a.chain); const cb = byId.get(x.b.chain);
      if (!ca || !cb) continue;
      const pa = at(ca, x.a.s); const pb = at(cb, x.b.s);
      gaps.push({ g: Math.hypot(pa[0] - pb[0], pa[1] - pb[1]) / h, s: Math.max(x.a.s, x.b.s) });
    }
    gaps.sort((a, b) => a.g - b.g);
    const q = (f: number): number => (gaps.length ? gaps[Math.min(gaps.length - 1, Math.floor(f * gaps.length))].g : NaN);
    const over1 = gaps.filter((g) => g.g > 1).length;
    const worst = gaps[gaps.length - 1];
    console.log(`${name} move ${mult}h: crossings ${gaps.length}, pass gap /h p50 ${q(0.5).toFixed(3)} p90 ${q(0.9).toFixed(3)} max ${worst ? worst.g.toFixed(3) : "-"} (at s ${worst ? worst.s.toFixed(1) : "-"}), over 1h: ${over1}`);
  }
}
