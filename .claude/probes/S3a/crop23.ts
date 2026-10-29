// K992 s4: two recorded frames cropped around one junction, for a test sweep
// that blends them. Keeps every chain that comes within R·h of the junction's
// centre whole (so arc lengths, passes and dead ends stay valid), the
// junctions whose arms all lie on kept chains, and the crossings between kept
// chains; chain indices are renumbered. Prints the corner under each oracle on
// the full and the cropped frames, so the crop can be checked to change nothing.
// node node_modules\vite-node\vite-node.mjs .claude\probes\S3a\crop23.ts <seq> <jid/ci> <f0,f1> <R> <out.json> [--oracles c21w,c23w]
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import type { FieldModel, OracleParams } from "../../../src/render/field/oracle";
import type { FieldScene } from "../../../src/render/field/scene";

const argv = process.argv.slice(2);
const opt = (k: string, d: string): string => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : d;
};
const [SEQ, KEY, FR, RS, OUT] = argv;
const [JID, CI] = KEY.split("/");
const [f0, f1] = FR.split(",").map(Number);
const R = Number(RS);
const ORS = opt("oracles", "c21w,c23w").split(",");
type M = { FieldModel: new (s: FieldScene, p: OracleParams) => FieldModel; cornerRadius: (cr: number, h: number, th: number) => number };
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
const A = frames[f0];
const B = frames[f1];
const h = A.look.halfWidth;
const ji = A.junctions.findIndex((j) => j.id === JID);
if (ji < 0) throw new Error(`no junction ${JID}`);
const [cx, cy] = A.junctions[ji].c;
const keep = new Set<number>();
for (const S of [A, B])
  S.chains.forEach((c, i) => {
    for (let k = 0; k < c.pts.length; k += 2) if (Math.hypot(c.pts[k] - cx, c.pts[k + 1] - cy) < R * h) return void keep.add(i);
  });
for (const a of A.junctions[ji].arms) keep.add(a.chain);
const js = A.junctions.map((j, i) => i).filter((i) => A.junctions[i].arms.every((a) => keep.has(a.chain)) && Math.hypot(A.junctions[i].c[0] - cx, A.junctions[i].c[1] - cy) < R * h);
const order = [...keep].sort((a, b) => a - b);
const map = new Map(order.map((c, i) => [c, i]));
const crop = (S: FieldScene): FieldScene => {
  if (S.chains.length !== A.chains.length) throw new Error("chain count differs");
  return {
    ...S,
    name: `${SEQ} ${JID} crop`,
    chains: order.map((c) => ({ ...S.chains[c], id: map.get(c)! })),
    crossings: S.crossings.filter((x) => keep.has(x.a.chain) && keep.has(x.b.chain)).map((x) => ({ ...x, a: { ...x.a, chain: map.get(x.a.chain)! }, b: { ...x.b, chain: map.get(x.b.chain)! } })),
    junctions: js.map((i) => ({ ...S.junctions[i], arms: S.junctions[i].arms.map((a) => ({ ...a, chain: map.get(a.chain)! })) })),
    deadEnds: S.deadEnds.filter((d) => keep.has(d.chain)).map((d) => ({ ...d, chain: map.get(d.chain)! })),
    pois: undefined,
    highlights: undefined,
  };
};
const round = (x: number) => Math.round(x * 1e6) / 1e6;
const slim = (s: FieldScene): FieldScene => ({ ...s, chains: s.chains.map((c) => ({ ...c, pts: c.pts.map(round), z: c.z.map(round) })) });
const cA = slim(crop(A));
const cB = slim(crop(B));
const npts = cA.chains.reduce((n, c) => n + c.pts.length / 2, 0);
console.log(`kept chains ${order.length} of ${A.chains.length} (${npts} points), junctions ${js.length}, crossings ${cA.crossings.length}`);
for (const k of [0, 1]) {
  const a = [cA, cB][k];
  const b = [B, A][k];
  if (k === 0) a.chains.forEach((c, i) => { if (c.pts.length !== cB.chains[i].pts.length) console.log(`chain ${i} (was ${order[i]}): ${c.pts.length / 2} points, then ${cB.chains[i].pts.length / 2}`); });
  void b;
}
const f3 = (x: number) => (Number.isFinite(x) ? x.toFixed(4) : "inf");
for (const name of ORS) {
  const mod = (await import(/* @vite-ignore */ resolve(process.cwd(), `.claude/probes/S3a/oracle_${name}.ts`).replace(/\\/g, "/"))) as M;
  for (const [lab, s] of [["full f0", A], ["crop f0", cA], ["full f1", B], ["crop f1", cB]] as [string, FieldScene][]) {
    const p = { rRound: 0, rOf: (_j: number, _i: number, th: number, st: string) => (st === "round" ? mod.cornerRadius(3, h, th) : 0), crMax: 3, spans: "k883", labelOnly: true } as OracleParams;
    const fm = new mod.FieldModel(s, p);
    const c = fm.corners.find((x) => s.junctions[x.junction].id === JID && `${x.index}` === CI);
    console.log(`${name} ${lab}: ${c ? `r ${f3(c.r / h)} rule ${f3((c.rRule ?? NaN) / h)} V ${f3(c.V[0])},${f3(c.V[1])} q ${f3(c.q[0])},${f3(c.q[1])} fit ${c.fit ?? "-"}` : "no corner"}`);
  }
}
if (OUT) {
  writeFileSync(OUT, JSON.stringify({ a: cA, b: cB }));
  console.log(`wrote ${OUT}`);
}
