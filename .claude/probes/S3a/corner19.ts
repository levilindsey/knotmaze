// K1000 step 5: one corner, frame by frame, under several oracles: r, the rule's r,
// the fit's reason and the two arms' caps (CPU only; the census's recorded frames).
// node node_modules\vite-node\vite-node.mjs .claude\probes\S3a\corner19.ts <seq> <key,key> <f0> <f1> [--oracles c17f,c19fb]
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
const [seq, keysS, f0S, f1S] = argv;
const keys = keysS.split(",");
type M = { FieldModel: new (s: FieldScene, p: OracleParams) => FieldModel; cornerRadius: (cr: number, h: number, th: number) => number };
const same = (a: FieldScene, b: FieldScene) => a.chains.every((c, i) => c.pts.length === b.chains[i].pts.length && c.pts.every((v, k) => v === b.chains[i].pts[k]));
const raw = gunzipSync(readFileSync(join(".claude/probes/S3a/seq13", `${seq}.jsonl.gz`))).toString("utf8").split("\n");
const frames: FieldScene[] = [];
for (let k = 1; k < raw.length; k++) {
  if (!raw[k]) continue;
  const f = JSON.parse(raw[k]).scene as FieldScene;
  f.look.ctrlArc ??= 0.47;
  if (frames.length && same(frames[frames.length - 1], f)) continue;
  frames.push(f);
}
const f2 = (x: number) => (Number.isFinite(x) ? x.toFixed(3) : "inf");
for (const name of opt("oracles", "c17f,c19fb").split(",")) {
  const mod = (await import(/* @vite-ignore */ resolve(process.cwd(), `.claude/probes/S3a/oracle_${name}.ts`).replace(/\\/g, "/"))) as M;
  console.log(`== ${name}`);
  for (let fi = Number(f0S); fi <= Number(f1S); fi++) {
    const s = frames[fi];
    const h = s.look.halfWidth;
    const p = { rRound: 0, rOf: (_j: number, _i: number, th: number, st: string) => (st === "round" ? mod.cornerRadius(3, h, th) : 0), crMax: 3, spans: "k883", labelOnly: true } as OracleParams;
    const fm = new mod.FieldModel(s, p);
    for (const key of keys) {
      const c = fm.corners.find((x) => `${s.junctions[x.junction].id}/${x.index}` === key);
      if (!c) {
        console.log(`  f${fi} ${key}: no corner`);
        continue;
      }
      const capA = fm.armCaps[c.junction][c.armIdxA ?? -1];
      const capB = fm.armCaps[c.junction][c.armIdxB ?? -1];
      console.log(
        `  f${fi} ${key}: r ${f2(c.r / h)}h rule ${f2((c.rRule ?? NaN) / h)}h ok ${c.ok} ${c.style} th ${((c.theta * 180) / Math.PI).toFixed(2)} fit ${c.fit ?? "-"}` +
          ` | A arm ${c.armIdxA} cap ${capA ? f2(capA.len / h) : "?"}h ${capA?.why ?? ""} | B arm ${c.armIdxB} cap ${capB ? f2(capB.len / h) : "?"}h ${capB?.why ?? ""}`,
      );
    }
  }
}
