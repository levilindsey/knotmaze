// K1000 probe: ext19.ts = for junctions (by id) at blend steps of t -> t+1,
// each arm's corner extent (ext0), the extent the cut loop starts from
// (after the first part walk), its first cap and its final span, under
// oracle_*19d.ts; plus the junction's corners (r, feet).
// node node_modules\vite-node\vite-node.mjs .claude\probes\S3a\ext19.ts <seq> <t> <j112,j100> [--k 2] [--oracles c19fd,m19d]
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
const ids = JS.split(",");
for (let s = S0; s <= S1; s++) {
  const sc = lerp(A, B, s / K) as FieldScene;
  for (const [o, M] of mods) {
    const m = new M.FieldModel(sc, paramsOf(M, sc));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mm = m as any;
    const [e0, e1] = mm.cutExt as [Map<string, number>, Map<string, number>];
    for (const id of ids) {
      const ji = sc.junctions.findIndex((x) => `${x.id}` === id);
      const j = sc.junctions[ji];
      const arms = j.arms.map((arm, ai) => {
        const key = `${ji}:${arm.chain}:${arm.s}:${arm.dir}`;
        const sp = (mm.junctionSpans[ji] as number[][]).find((x) => x[3] === ai);
        const len = sp ? (sp[2] - sp[1]) / h : NaN;
        return `${ai}: ext0 ${((e0.get(key) ?? NaN) / h).toFixed(3)} ext ${((e1.get(key) ?? NaN) / h).toFixed(3)} cap ${(mm.armCaps[ji][ai].len / h).toFixed(3)} span ${len.toFixed(3)}`;
      });
      const cs = m.corners.filter((c) => c.junction === ji).map((c) => `${c.index}: r ${(c.r / h).toFixed(3)} rule ${(((c as unknown as { rRule?: number }).rRule ?? 0) / h).toFixed(3)} arms ${c.armIdxA}/${c.armIdxB} ok ${c.ok}`);
      const pm = (mm.partMoves as { junction: number; arm: number; from: number; to: number; round: number }[]).filter((x) => x.junction === ji).map((x) => `${x.arm}: ${(x.from / h).toFixed(2)}->${(x.to / h).toFixed(2)} r${x.round}`);
      const cc = ((mm.cutCorners ?? []) as { j: number; i: number; a: number; b: number; r: number; noV: boolean; g2: boolean; ea: number; eb: number; ok: boolean }[]).filter((c) => c.j === ji).map((c) => `${c.i}: ${c.a}/${c.b} r ${c.r.toFixed(3)} noV ${c.noV} g2 ${c.g2} ok ${c.ok} ea ${c.ea.toFixed(3)} eb ${c.eb.toFixed(3)}`);
      console.log(`s${s} ${o} ${id} | ${arms.join(" | ")}\n    corners ${cs.join("; ")}\n    loop corners ${cc.join("; ")}\n    final part walk ${pm.join("; ")}`);
    }
  }
}
