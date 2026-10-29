// K1000 probe: m19b's cut-loop state (oracle_m19bx.ts, dbg19) for one arm at given u.
// node node_modules\vite-node\vite-node.mjs .claude\probes\S3a\dbg19.ts <A|B|C|D> <ji> <ai> <u1> [<u2> ...]
import { resolve } from "node:path";
import type { FieldModel, OracleParams } from "../../../src/render/field/oracle";
import type { FieldScene } from "../../../src/render/field/scene";
import { pairCrossScene } from "../../../test/render/field/scenes/gen";

const [which, jiS, aiS, ...us] = process.argv.slice(2);
const make: Record<string, (u: number) => FieldScene> = {
  A: (phi) => pairCrossScene({ phi }),
  B: (X) => pairCrossScene({ X, tAt: 2 }),
  C: (X) => pairCrossScene({ X, bendAt: 2, bendR: 6 }),
  D: (X) => pairCrossScene({ X }),
};
type M = { FieldModel: new (s: FieldScene, p: OracleParams) => FieldModel; cornerRadius: (cr: number, h: number, th: number) => number };
const mod = (await import(/* @vite-ignore */ resolve(process.cwd(), ".claude/probes/S3a/oracle_m19bx.ts").replace(/\\/g, "/"))) as M;
const [ji, ai] = [Number(jiS), Number(aiS)];
for (const uS of us) {
  const s = make[which](Number(uS));
  const h = s.look.halfWidth;
  const p = { rRound: 0, rOf: (_j: number, _i: number, th: number, st: string) => (st === "round" ? mod.cornerRadius(3, h, th) : 0), crMax: 3, spans: "k883", labelOnly: true } as OracleParams;
  const fm = new mod.FieldModel(s, p) as unknown as { armCaps: { len: number; why: string }[][]; dbg19: { reach: number[][]; base: number[][]; q1: number[]; cuts: { k: number; c: number; w: number; d: number }[][][] }[] };
  const arm = s.junctions[ji].arms[ai];
  console.log(`u ${uS}: arm j${ji}/${ai} (chain ${arm.chain}, dir ${arm.dir}) cap ${(fm.armCaps[ji][ai].len / h).toFixed(4)}h  ${fm.armCaps[ji][ai].why}`);
  fm.dbg19.forEach((r, it) => {
    const cs = r.cuts[ji][ai].map((c) => `k${c.k} w ${c.w.toFixed(5)} c ${(c.c / h).toFixed(3)} d ${(c.d / h).toFixed(3)}`).join("; ");
    console.log(`  round ${it}: base ${(r.base[ji][ai] / h).toFixed(3)} reach ${(r.reach[ji][ai] / h).toFixed(3)} q1 ${r.q1.map((x) => x.toFixed(4)).join(",")} | ${cs}`);
  });
}
