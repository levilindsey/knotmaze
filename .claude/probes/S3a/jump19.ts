// K1000 probe: where one arm's cap jumps in a cap19_continuity sweep, and why.
// node node_modules\vite-node\vite-node.mjs .claude\probes\S3a\jump19.ts <A|B|C|D> <from> <to> <arm> [--n 400] [--oracles m14,m19b]
import { resolve } from "node:path";
import type { FieldModel, OracleParams } from "../../../src/render/field/oracle";
import type { FieldScene } from "../../../src/render/field/scene";
import { pairCrossScene } from "../../../test/render/field/scenes/gen";

const argv = process.argv.slice(2);
const opt = (k: string, d: string): string => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : d;
};
const [which, from, to, armS] = argv;
const n = Number(opt("n", "400"));
const arm = Number(armS);
const make: Record<string, (u: number) => FieldScene> = {
  A: (phi) => pairCrossScene({ phi }),
  B: (X) => pairCrossScene({ X, tAt: 2 }),
  C: (X) => pairCrossScene({ X, bendAt: 2, bendR: 6 }),
  D: (X) => pairCrossScene({ X }),
};
type M = { FieldModel: new (s: FieldScene, p: OracleParams) => FieldModel; cornerRadius: (cr: number, h: number, th: number) => number };
for (const name of opt("oracles", "m14,m19b").split(",")) {
  const mod = (await import(/* @vite-ignore */ resolve(process.cwd(), `.claude/probes/S3a/oracle_${name}.ts`).replace(/\\/g, "/"))) as M;
  const at = (u: number) => {
    const s = make[which](u);
    const h = s.look.halfWidth;
    const p = { rRound: 0, rOf: (_j: number, _i: number, th: number, st: string) => (st === "round" ? mod.cornerRadius(3, h, th) : 0), crMax: 3, spans: "k883", labelOnly: true } as OracleParams;
    const fm = new mod.FieldModel(s, p);
    const caps = fm.armCaps.flat() as { len: number; why?: string }[];
    return { h, c: caps[arm] };
  };
  console.log(`${name}: ${which} arm ${arm} over [${from}, ${to}] in ${n} steps`);
  let prev = at(Number(from));
  console.log(`  u ${Number(from).toFixed(5)} cap ${(prev.c.len / prev.h).toFixed(4)}h  ${prev.c.why ?? ""}`);
  for (let i = 1; i <= n; i++) {
    const u = Number(from) + ((Number(to) - Number(from)) * i) / n;
    const cur = at(u);
    const d = Math.abs(cur.c.len - prev.c.len) / cur.h;
    if (d > 0.002 || (cur.c.why ?? "") !== (prev.c.why ?? "")) console.log(`  u ${u.toFixed(5)} cap ${(cur.c.len / cur.h).toFixed(4)}h (d ${d.toFixed(4)}h)  ${cur.c.why ?? ""}`);
    prev = cur;
  }
}
