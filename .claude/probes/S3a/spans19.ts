// K1000 probe: spans19.ts = for chains (by id) at blend steps of t -> t+1, the
// chain's spans (cluster = its junction ids) and, per junction arm rooted on the
// chain, ext0 (corner extent), ext (after the first part walk), cap (why), span.
// node node_modules\vite-node\vite-node.mjs .claude\probes\S3a\spans19.ts <seq> <t> <66,67> [--k 1] [--oracles c19fd,m19d]
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import type { FieldModel, OracleParams } from "../../../src/render/field/oracle";
import type { FieldScene } from "../../../src/render/field/scene";
const argv = process.argv.slice(2);
const opt = (k: string, d: string): string => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : d;
};
const [SEQ, TS, JS] = argv;
const T = Number(TS);
const K = Number(opt("k", "2"));
const ORS = opt("oracles", "c19fd,m19d").split(",");
const S0 = Number(opt("s0", "0"));
const S1 = Number(opt("s1", String(K)));
interface OracleModule {
  FieldModel: new (scene: FieldScene, params: OracleParams) => FieldModel;
  cornerRadius: (cr: number, h: number, theta: number) => number;
}
const mods: [string, OracleModule][] = [];
for (const o of ORS) mods.push([o, (await import(/* @vite-ignore */ resolve(process.cwd(), `.claude/probes/S3a/oracle_${o}.ts`).replace(/\\/g, "/"))) as OracleModule]);
const paramsOf = (M: OracleModule, scene: FieldScene): OracleParams => {
  const h = scene.look.halfWidth;
  return { rRound: 0, rOf: (_j, _i, th, st) => (st === "round" ? M.cornerRadius(3, h, th) : 0), spans: "k883", crMax: 3, labelOnly: true } as OracleParams;
};
const same = (a: FieldScene, b: FieldScene) => a.chains.every((c, i) => c.pts.length === b.chains[i].pts.length && c.pts.every((v, k) => v === b.chains[i].pts[k]));
const raw = gunzipSync(readFileSync(join(".claude/probes/S3a/seq13", `${SEQ}.jsonl.gz`))).toString("utf8").split("\n");
const frames: FieldScene[] = [];
for (let k = 1; k < raw.length; k++) {
  if (!raw[k]) continue;
  const f = JSON.parse(raw[k]).scene as FieldScene;
  f.look.ctrlArc ??= 0.47;
  if (frames.length && same(frames[frames.length - 1], f)) continue;
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
const ids = JS.split(",").map(Number);
for (let s = S0; s <= S1; s++) {
  const sc = lerp(A, B, s / K) as FieldScene;
  for (const [o, M] of mods) {
    const m = new M.FieldModel(sc, paramsOf(M, sc));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mm = m as any;
    const [e0, e1] = mm.cutExt as [Map<string, number>, Map<string, number>];
    const cls = (mm.clusters as { junctions: number[] }[]).map((c) => c.junctions.map((j) => sc.junctions[j].id).sort((a, b) => a - b).join("+"));
    for (const id of ids) {
      const ci = (mm.idOf as number[]).indexOf(id);
      const sps = ((mm.chainSpans[ci] ?? []) as number[][]).map(([lo, hi, c]) => `${(lo / h).toFixed(2)}..${(hi / h).toFixed(2)} [${c >= 0 ? cls[c] : "-"}]`);
      const arms: string[] = [];
      sc.junctions.forEach((j, ji) =>
        j.arms.forEach((arm, ai) => {
          if (arm.chain !== id) return;
          const key = `${ji}:${arm.chain}:${arm.s}:${arm.dir}`;
          const sp = (mm.junctionSpans[ji] as number[][]).find((x) => x[3] === ai);
          const len = sp ? (sp[2] - sp[1]) / h : NaN;
          arms.push(`j${j.id}/${ai} @${(arm.s / h).toFixed(2)} dir ${arm.dir}: ext0 ${((e0.get(key) ?? NaN) / h).toFixed(2)} ext ${((e1.get(key) ?? NaN) / h).toFixed(2)} cap ${(mm.armCaps[ji][ai].len / h).toFixed(2)} (${mm.armCaps[ji][ai].why}) span ${len.toFixed(2)}`);
        })
      );
      console.log(`s${s} ${o} chain ${id}: ${sps.join(" | ")}\n    ${arms.join("\n    ")}`);
    }
  }
}