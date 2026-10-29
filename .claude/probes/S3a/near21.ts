// K992 s3: the corners near a window pixel, frame by frame, under each oracle:
// r, θ, fit, the feet and the corner's fill outline size. For attributing a
// window census pop to a corner (census window cams: label_pops' log).
// node node_modules\vite-node\vite-node.mjs .claude\probes\S3a\near21.ts <seq> <px,py> <f0,f1> [--cam cx,cy] [--ppw 276.92] [--wh 1240,900] [--rad 1.5] [--oracles c19fb,c21w]
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import type { FieldModel, OracleParams } from "../../../src/render/field/oracle";
import type { FieldScene } from "../../../src/render/field/scene";
import { dS } from "../../../src/render/field/geom";

const argv = process.argv.slice(2);
const opt = (k: string, d: string): string => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : d;
};
const [SEQ, PXY, FR] = argv;
const [px, py] = PXY.split(",").map(Number);
const [f0, f1] = FR.split(",").map(Number);
const [cx, cy] = opt("cam", "31.549,10.427").split(",").map(Number);
const PPW = Number(opt("ppw", "276.92"));
const [W, H] = opt("wh", "1240,900").split(",").map(Number);
const RAD = Number(opt("rad", "1.5"));
const ORS = opt("oracles", "c19fb,c21w").split(",");
const wx = cx + (px - W / 2) / PPW;
const wy = cy + (py - H / 2) / PPW;
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
const f3 = (x: number) => (Number.isFinite(x) ? x.toFixed(3) : "inf");
console.log(`${SEQ} pixel (${px}, ${py}) = world (${f3(wx)}, ${f3(wy)}), radius ${RAD}`);
for (const name of ORS) {
  const mod = (await import(/* @vite-ignore */ resolve(process.cwd(), `.claude/probes/S3a/oracle_${name}.ts`).replace(/\\/g, "/"))) as M;
  console.log(`== ${name}`);
  for (let f = f0; f <= f1; f++) {
    const s = frames[f];
    const h = s.look.halfWidth;
    const p = { rRound: 0, rOf: (_j: number, _i: number, th: number, st: string) => (st === "round" ? mod.cornerRadius(3, h, th) : 0), crMax: 3, spans: "k883", labelOnly: true } as OracleParams;
    const fm = new mod.FieldModel(s, p);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mm = fm as any;
    for (const c of fm.corners) {
      const d = Math.hypot(c.V[0] - wx, c.V[1] - wy);
      if (d > RAD) continue;
      const pa = mm.polys[c.a];
      const pb = mm.polys[c.b];
      const fa = (c.armA.dir * dS(pa, c.armA.s, c.sTA)) / h;
      const fb = (c.armB.dir * dS(pb, c.armB.s, c.sTB)) / h;
      console.log(
        `f${f} j${s.junctions[c.junction].id}/${c.index} d ${f3(d)} r ${f3(c.r / h)} rule ${f3((c.rRule ?? NaN) / h)} th ${((c.theta * 180) / Math.PI).toFixed(2)} fit ${c.fit ?? "-"} ok ${c.ok ?? "-"}` +
          ` | feet ${f3(fa)} ${f3(fb)} | V ${f3(c.V[0])},${f3(c.V[1])} q ${f3(c.q[0])},${f3(c.q[1])}`,
      );
    }
  }
}
