// K992 s3: corner_continuity (B)/(C)'s graze sweep on probe oracles: r, the
// rule, the fold and the tangent feet per step (arc length, in h).
// node node_modules\vite-node\vite-node.mjs .claude\probes\S3a\graze21.ts [--oracles c17f,c21] [--n 20] [--from 2.3] [--to 3.3] [--rise 10 (degrees, the END's far part)]
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { FieldModel, OracleParams } from "../../../src/render/field/oracle";
import type { FieldScene } from "../../../src/render/field/scene";
const argv = process.argv.slice(2);
const opt = (k: string, d: string): string => (argv.indexOf(`--${k}`) >= 0 ? argv[argv.indexOf(`--${k}`) + 1] : d);
const ORS = opt("oracles", "c17f").split(",");
const N = Number(opt("n", "20"));
const FROM = Number(opt("from", "2.3"));
const TO = Number(opt("to", "3.3"));
const RISE = (Number(opt("rise", "0")) * Math.PI) / 180;
const scene = (name: string) => JSON.parse(readFileSync(join("test/render/field/scenes", `${name}.json`), "utf8")) as FieldScene;
function grazing(H0: number): FieldScene {
  const s = scene("acute30");
  const h = s.look.halfWidth;
  const H = H0 * h;
  const a = 30 * (Math.PI / 180);
  const x0 = 0.1 * h * Math.cos(a);
  const y0 = 0.1 * h * Math.sin(a);
  const run = (H - y0) / Math.tan(a);
  const pts: number[] = [];
  const n1 = 60;
  for (let i = 0; i <= n1; i++) pts.push(x0 + (run * i) / n1, y0 + ((H - y0) * i) / n1);
  const n2 = 90;
  for (let i = 1; i <= n2; i++) pts.push(x0 + run + (18 * h * i) / n2, H + ((18 * h * i) / n2) * Math.tan(RISE));
  s.chains[1].pts = pts;
  s.chains[1].z = new Array(pts.length / 2).fill(0);
  let len = 0;
  for (let i = 2; i < pts.length; i += 2) len += Math.hypot(pts[i] - pts[i - 2], pts[i + 1] - pts[i - 1]);
  s.deadEnds = s.deadEnds.filter((d) => d.chain !== 1).concat([{ chain: 1, s: len, offscreen: true }]);
  return s;
}
type M = { FieldModel: new (s: FieldScene, p: OracleParams) => FieldModel; cornerRadius: (cr: number, h: number, th: number) => number };
for (const name of ORS) {
  const mod = (await import(/* @vite-ignore */ resolve(process.cwd(), `.claude/probes/S3a/oracle_${name}.ts`).replace(/\\/g, "/"))) as M;
  const rows: string[] = [];
  for (let i = 0; i <= N; i++) {
    const H = FROM + ((TO - FROM) * i) / N;
    const sc = grazing(H);
    const h = sc.look.halfWidth;
    const p = { rRound: 0, rOf: (_j: number, _i: number, th: number, st: string) => (st === "round" ? mod.cornerRadius(3, h, th) : 0), crMax: 3, spans: "k883" } as OracleParams;
    const c = new mod.FieldModel(sc, p).corners.find((x) => x.junction === 0 && x.index === 0)!;
    const f = (x: number | undefined) => (x === undefined ? "-" : (x / h).toFixed(4));
    rows.push(`H ${H.toFixed(3)} r ${f(c.r)} rule ${f(c.rRule)} fold ${c.fold === undefined ? "-" : f(c.fold - h)} sTA ${f(c.sTA)} sTB ${f(c.sTB)} armA ${c.a}/${c.armA.dir} armB ${c.b}/${c.armB.dir}`);
  }
  console.log(`== ${name}\n${rows.join("\n")}`);
}