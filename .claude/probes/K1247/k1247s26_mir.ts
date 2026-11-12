// K1247 s26: how many record strips carry K1314 s7's mirror bits (rec_glsl mode bits 2, 3), per scene,
// and where (the strip's junction ends). node scripts/run_node.mjs .claude/probes/K1247/k1247s26_mir.ts [--scene=a,b]
import { existsSync, readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { frame, structure, type SceneIn } from "../../../src/render/outline/outline";
import { zChains } from "../../../src/render/outline/draw";
import { REC_TEXELS, fillFrame, fillResolution, fillStructure, recStrips } from "../../../src/render/outline/fill_tri";

const SC = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/"; // read only (the main checkout's census scenes)
const all = ["ring", "muse_hash", "muse_default_tw", "def", "fat", "g41_ring_tw42", "g41_user_tw64", "g41_def_tw64"];
const arg = process.argv.find((a) => a.startsWith("--scene="));
const names = arg ? arg.slice(8).split(",") : all;
const load = (n: string): SceneIn | null => {
  if (n === "ring") return JSON.parse(gunzipSync(readFileSync("test/render/fixtures/outline_ring.json.gz")).toString()) as SceneIn;
  const p = `${SC}${n}.json`; if (!existsSync(p)) return null;
  const s = JSON.parse(readFileSync(p, "utf8")) as SceneIn; (s.look as { ctrlArc?: number }).ctrlArc ??= 0.47; return s;
};
// --wave: ring under the rec_tie test's smooth wave (amplitude a, phase t) over a grid, to find a mirrored case.
if (process.argv.includes("--wave")) {
  const r0 = load("ring")!;
  for (const a of [0.04, 0.08, 0.12, 0.16, 0.2]) for (const t of [0, 0.6, 1.2, 1.8, 2.4, 3.0]) {
    const chains = r0.chains.map((c) => { const p = c.pts.slice(); for (let i = 0; i + 1 < p.length; i += 2) { const x = p[i]; const y = p[i + 1]; p[i] = x + a * Math.cos(0.7 * y + t); p[i + 1] = y + a * Math.sin(0.9 * x + 1.3 * t); } return { ...c, pts: p }; });
    const sc = { ...r0, chains, look: { ...r0.look, fillRec: 2 } } as SceneIn;
    const st = structure(sc); const table = frame(st, sc); const zz = zChains(sc); const fs = fillStructure(st, fillResolution(st, table));
    const T = fillFrame(fs, st, table, sc, zz).rec!.strip; const ns = recStrips(fs).length; let m = 0;
    for (let o = 0; o < ns; o++) if (Math.round(T[4 * REC_TEXELS * o + 7]) & 12) m++;
    if (m) console.log(`wave a ${a} t ${t}: mirrored ${m}`);
  }
  process.exit(0);
}
for (const n of names) {
  const sc0 = load(n); if (!sc0) { console.log(`${n}: no scene`); continue; }
  const sc = { ...sc0, look: { ...sc0.look, fillRec: 2 } } as SceneIn;
  const st = structure(sc); const table = frame(st, sc); const zz = zChains(sc);
  const fs = fillStructure(st, fillResolution(st, table));
  const fr = fillFrame(fs, st, table, sc, zz); const T = fr.rec!.strip; const strips = recStrips(fs);
  let a = 0; let b = 0; let m = 0;
  for (let o = 0; o < strips.length; o++) { const w = Math.round(T[4 * REC_TEXELS * o + 7]); if (w & 4) a++; if (w & 8) b++; if (w & 12) m++; }
  console.log(`${n}: strips ${strips.length}, mirrored ${m} (end A ${a}, end B ${b})`);
}
