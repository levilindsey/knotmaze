// K1247 s27 (K1328): a census scene with its numbers rounded (pts and every other float to D decimals), gzipped,
// and what rec_tie needs of it: strips, mirrored strips (K1314 s7's mirA / mirB) and the fillFrame / fillRec 3 tie.
//   node scripts/run_node.mjs .claude/probes/K1247/k1247s27_fixture.ts <scene.json> <D> [<out.json.gz>]
import { readFileSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { frame, structure, type SceneIn } from "../../../src/render/outline/outline";
import { zChains } from "../../../src/render/outline/draw";
import { REC_TEXELS, fillFrame, fillResolution, fillStructure, recStrips, type StripItem } from "../../../src/render/outline/fill_tri";

const [src, dArg, out] = process.argv.slice(2);
const D = Number(dArg); const q = 10 ** D;
const round = (v: unknown): unknown => {
  if (typeof v === "number") return Number.isInteger(v) ? v : Math.round(v * q) / q;
  if (Array.isArray(v)) return v.map(round);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === "look" ? x : round(x)]));
  return v;
};
const sc0 = round(JSON.parse(readFileSync(src, "utf8"))) as SceneIn;
const text = JSON.stringify(sc0); const gz = gzipSync(Buffer.from(text, "utf8"), { level: 9 });
const sc = { ...sc0, look: { ...sc0.look } } as SceneIn; (sc.look as { ctrlArc?: number }).ctrlArc ??= 0.47; delete (sc.look as { fillRec?: number }).fillRec;
const st = structure(sc); const table = frame(st, sc); const zz = zChains(sc);
const fs = fillStructure(st, fillResolution(st, table));
const a = fillFrame(fs, st, table, sc, zz);
const b = fillFrame(fs, st, table, { ...sc, look: { ...sc.look, fillRec: 3 } } as SceneIn, zz);
const T = fillFrame(fs, st, table, { ...sc, look: { ...sc.look, fillRec: 2 } } as SceneIn, zz).rec!.strip;
const mir: number[] = []; const rs = recStrips(fs); for (let o = 0; o < rs.length; o++) if (Math.round(T[4 * REC_TEXELS * o + 7]) & 12) mir.push(o);
let dKey = 0; let dS = 0; let strips = 0;
for (const it of fs.items) {
  if (it.kind !== "strip") continue; const S = it as StripItem; strips++;
  for (let v = S.base; v < S.base + 3 * (S.N + 1); v++) { dKey = Math.max(dKey, Math.abs(a.key[v] - b.key[v])); dS = Math.max(dS, Math.abs(a.s[v] - b.s[v])); }
}
console.log(`D ${D}: raw ${text.length} gz ${gz.length}; strips ${strips}, mirrored ${mir.length} (o ${mir.join(",")}: ${mir.map((o) => `c${sc.chains[(fs.items[rs[o]] as StripItem).pi].id}`).join(",")}); dKey ${dKey.toExponential(2)} dS ${dS.toExponential(2)}`);
if (out) { writeFileSync(out, gz); console.log(`wrote ${out}`); }
