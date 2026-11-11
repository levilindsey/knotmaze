// K1247 s16: one border's points near an s over frames F-1, F (base bs/bc
// and final s/sc), to see a border's s map change.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1247s16_bdump.ts <F> <chain> <side 0|1> <s> [rad] [scene]
import { readFileSync, readdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join } from "node:path";
import { structure, frame, debugCache, type SceneIn } from "./outline";
const a = process.argv.slice(2);
const F = +a[0]; const PI = +a[1]; const SIDE = +a[2]; const S0 = +a[3]; const R = +(a[4] ?? 0.1);
const dir = join(import.meta.dirname, "..", "out", "s15", "rec_" + (a[5] ?? "def"));
const files = readdirSync(dir).filter((f) => f.endsWith(".json.gz")).sort();
const L = (f: string): SceneIn => { const s = JSON.parse(gunzipSync(readFileSync(join(dir, f))).toString("utf8")) as SceneIn; (s.look as { ctrlArc?: number }).ctrlArc ??= 0.47; return s; };
const sc = files.slice(0, F + 1).map(L);
const st = structure(sc[0]); const Spx = sc[0].camera.pxPerUnit * 2;
for (let f = 0; f <= F; f++) {
  frame(st, sc[f]);
  if (f < F - 1) continue;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const C: any = debugCache(st); const B = C.bords[PI * 2 + SIDE];
  console.log(`f${f} chain ${PI} side ${SIDE}: nb ${B.nb} nf ${B.nf}`);
  const rows: string[] = [];
  for (let i = 0; i < B.nb; i++) if (Math.abs(B.bs[i] - S0) < R) rows.push(`  b${i} bs ${B.bs[i].toFixed(5)} bc ${B.bc[i].toFixed(5)} (${(B.bx[i] * Spx).toFixed(2)},${(B.by[i] * Spx).toFixed(2)})`);
  console.log(rows.join("\n"));
  const fr: string[] = [];
  for (let i = 0; i < B.nf; i++) if (Math.abs(B.s[i] - S0) < R) fr.push(`  p${i} s ${B.s[i].toFixed(5)} sc ${B.sc[i].toFixed(5)} (${(B.xy[2 * i] * Spx).toFixed(2)},${(B.xy[2 * i + 1] * Spx).toFixed(2)})`);
  console.log(fr.join("\n"));
}
