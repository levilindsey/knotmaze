// K1000 probe: cut19.ts = cap16.ts's blend, printing for one corner each
// step's arm caps and the cut loop's decisions (oracle_*19d.ts, the dbg
// mode of mk_cap19.mjs) on the passes its two arms hold or nearly hold:
// per entry the iteration, crossing, side (A = the pass on the crossing's
// a chain), the arm's margin (h; > 0 holds), its distance to the pass, its
// cluster root; then same-cluster, fa, fb, n and the cut.
// node node_modules\vite-node\vite-node.mjs .claude\probes\S3a\cut19.ts <seq> <t> <key> [--k 2] [--oracles m19d] [--arms all] [--cx 216,348]
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import type { Corner, FieldModel, OracleParams } from "../../../src/render/field/oracle";
import type { FieldScene } from "../../../src/render/field/scene";

const argv = process.argv.slice(2);
const opt = (k: string, d: string): string => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : d;
};
const [SEQ, TS, KEY] = argv;
const T = Number(TS);
const K = Number(opt("k", "2"));
const ORS = opt("oracles", "m19d").split(",");
const CXS = opt("cx", "").split(",").filter(Boolean).map(Number);
const S0 = Number(opt("s0", "0"));
const S1 = Number(opt("s1", String(K)));
const ROOT = process.cwd();
interface OracleModule {
  FieldModel: new (scene: FieldScene, params: OracleParams) => FieldModel;
  cornerRadius: (cr: number, h: number, theta: number) => number;
}
const mods: [string, OracleModule][] = [];
for (const o of ORS) mods.push([o, (await import(/* @vite-ignore */ resolve(ROOT, `.claude/probes/S3a/oracle_${o}.ts`).replace(/\\/g, "/"))) as OracleModule]);
const paramsOf = (M: OracleModule, scene: FieldScene): OracleParams => {
  const h = scene.look.halfWidth;
  return { rRound: 0, rOf: (_j, _i, th, st) => (st === "round" ? M.cornerRadius(3, h, th) : 0), spans: "k883", crMax: 3, labelOnly: true } as OracleParams;
};
function sameScene(a: FieldScene, b: FieldScene): boolean {
  if (a.chains.length !== b.chains.length) return false;
  for (let c = 0; c < a.chains.length; c++) {
    const pa = a.chains[c].pts;
    const pb = b.chains[c].pts;
    if (pa.length !== pb.length) return false;
    for (let k = 0; k < pa.length; k++) if (pa[k] !== pb[k]) return false;
  }
  return true;
}
const raw = gunzipSync(readFileSync(join(".claude/probes/S3a/seq13", `${SEQ}.jsonl.gz`))).toString("utf8").split("\n");
const frames: FieldScene[] = [];
for (let k = 1; k < raw.length; k++) {
  if (!raw[k]) continue;
  const f = JSON.parse(raw[k]).scene as FieldScene;
  f.look.ctrlArc ??= 0.47;
  if (frames.length && sameScene(frames[frames.length - 1], f)) continue;
  frames.push(f);
}
const A = frames[T];
const B = frames[T + 1];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const lerp = (a: any, b: any, u: number): any => {
  if (typeof a === "number" && typeof b === "number") return a + (b - a) * u;
  if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) return a.map((x, i) => lerp(x, b[i], u));
  if (a && b && typeof a === "object" && !Array.isArray(a) && typeof b === "object") {
    const o: Record<string, unknown> = {};
    for (const k of Object.keys(a)) o[k] = k in b ? lerp(a[k], b[k], u) : a[k];
    return o;
  }
  return a;
};
const h = A.look.halfWidth;
for (let s = S0; s <= S1; s++) {
  const sc = lerp(A, B, s / K) as FieldScene;
  for (const [o, M] of mods) {
    const m = new M.FieldModel(sc, paramsOf(M, sc));
    const c = m.corners.find((x) => `${sc.junctions[x.junction].id}/${x.index}` === KEY);
    if (!c) {
      console.log(`s${s} ${o}: none`);
      continue;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mm = m as any;
    const caps = mm.armCaps[c.junction];
    const J = c.junction;
    const arms = [c.armIdxA!, c.armIdxB!];
    console.log(`s${s} ${o}: r ${(c.r / h).toFixed(3)}h | capA(${arms[0]}) ${(caps[arms[0]].len / h).toFixed(3)}h ${caps[arms[0]].why} | capB(${arms[1]}) ${(caps[arms[1]].len / h).toFixed(3)}h ${caps[arms[1]].why} | fit ${c.fit ?? "-"}`);
    const LOG = (mm.cutLog ?? []) as Record<string, unknown>[];
    for (const e of LOG) {
      const mA = e.mA as number[][];
      const mB = e.mB as number[][];
      const mine = (l: number[][]) => l.some(([ji, ai]) => ji === J && arms.includes(ai));
      if (!(mine(mA) || mine(mB) || CXS.includes(e.cx as number))) continue;
      const f = (l: number[][]) => l.map(([ji, ai, mg, d, rt]) => `${sc.junctions[ji].id}/${ai}${ji === J && arms.includes(ai) ? "*" : ""} m${mg} d${d} c${rt}`).join("; ");
      console.log(`   it${e.it} cx${e.cx} pad ${e.pad}h | A: ${f(mA)} | B: ${f(mB)} | same ${e.same ?? "-"} fa ${e.fa ?? "-"} fb ${e.fb ?? "-"} n ${e.n ?? "-"} cut ${e.cut ?? "-"}`);
    }
  }
}
