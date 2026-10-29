// K992 s4: one corner along a blend of a two-frame fixture (crop23.ts's output):
// r, the march's rule, q, V, the feet and the fold at each step.
// node node_modules\vite-node\vite-node.mjs .claude\probes\S3a\blend23.ts <fixture.json> <jid/ci> <u0,u1,n> [--oracles c21w,c23w]
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { FieldModel, OracleParams } from "../../../src/render/field/oracle";
import type { FieldScene } from "../../../src/render/field/scene";
import { dS, type Poly } from "../../../src/render/field/geom";

const argv = process.argv.slice(2);
const opt = (k: string, d: string): string => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : d;
};
const [FX, KEY, UR] = argv;
const [JID, CI] = KEY.split("/");
const [u0, u1, n] = UR.split(",").map(Number);
const ORS = opt("oracles", "c21w,c23w").split(",");
type M = { FieldModel: new (s: FieldScene, p: OracleParams) => FieldModel; cornerRadius: (cr: number, h: number, th: number) => number };
const { a, b } = JSON.parse(readFileSync(FX, "utf8")) as { a: FieldScene; b: FieldScene };
const lerp = (x: unknown, y: unknown, u: number): unknown => {
  if (typeof x === "number" && typeof y === "number") return x + (y - x) * u;
  if (Array.isArray(x)) return Array.isArray(y) && x.length === y.length ? x.map((v, i) => lerp(v, y[i], u)) : x;
  if (x && y && typeof x === "object" && typeof y === "object") {
    const o: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(x)) o[k] = k in y ? lerp(v, (y as Record<string, unknown>)[k], u) : v;
    return o;
  }
  return x;
};
const f4 = (x: number) => (Number.isFinite(x) ? x.toFixed(4) : "inf");
for (const name of ORS) {
  const mod = (await import(/* @vite-ignore */ resolve(process.cwd(), `.claude/probes/S3a/oracle_${name}.ts`).replace(/\\/g, "/"))) as M;
  console.log(`== ${name} ${KEY}`);
  for (let i = 0; i <= n; i++) {
    const u = u0 + ((u1 - u0) * i) / n;
    const s = lerp(a, b, u) as FieldScene;
    const h = s.look.halfWidth;
    const p = { rRound: 0, rOf: (_j: number, _i: number, th: number, st: string) => (st === "round" ? mod.cornerRadius(3, h, th) : 0), crMax: 3, spans: "k883", labelOnly: true } as OracleParams;
    (globalThis as any).__dbg23 = `${s.junctions.findIndex((j) => j.id === JID)}/${CI}`;
    const fm = new mod.FieldModel(s, p);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mm = fm as any;
    const c = fm.corners.find((x) => s.junctions[x.junction].id === JID && `${x.index}` === CI);
    if (!c) {
      console.log(`u ${f4(u)}: no corner`);
      continue;
    }
    const pa = mm.polys[c.a] as Poly;
    const pb = mm.polys[c.b] as Poly;
    const ft = (pl: Poly, arm: { s: number; dir: number }, sv: number) => f4((arm.dir * dS(pl, arm.s, sv)) / h);
    console.log(
      `u ${f4(u)}: r ${f4(c.r / h)} rule ${f4((c.rRule ?? NaN) / h)} fold ${c.fold === undefined ? "-" : f4((c.fold - h) / h)} q ${f4(c.q[0] / h)},${f4(c.q[1] / h)}` +
        ` | V feet ${ft(pa, c.armA, c.sVA)} ${ft(pb, c.armB, c.sVB)} | q feet ${ft(pa, c.armA, c.sTA)} ${ft(pb, c.armB, c.sTB)} | fmax ${f4((c.footMaxA ?? NaN) / h)} ${f4((c.footMaxB ?? NaN) / h)} | fit ${c.fit ?? "-"}`,
    );
  }
}
