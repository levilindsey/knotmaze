// K1240 S4: the port (src/render/outline, through OutlineModel) against the
// prototype's default path, bit for bit, on the 12 scenes.
//   node scripts/run_node.mjs .claude/probes/K1240/s4/k1240s4_eq.ts [protoDir] [sceneDir]
// Frame 0: proto buildOutline + buildDrawData(.., "app") vs new OutlineModel.
// Frame 1 (every chain point rotated 0.3 rad and moved; a deformation would
// move the chain ends off the arms' s, which the app's scenes never do): the proto's own
// functions in the carried order (structure and fill from frame 0, then
// frame / fillFrame / paintFrame / the band) vs OutlineModel.update.
// Prints one line per scene and the digests to pin; exit 1 on a mismatch.
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { OUTLINE_SCENES, digestOut, loadScene, type OutlineOut } from "../../../../test/render/outline_digest";
import { OutlineModel } from "../../../../src/render/outline/outline_model";
import type { SceneIn } from "../../../../src/render/outline/outline";

const here = resolve(process.argv[1], "..");
const protoDir = resolve(process.argv[2] ?? "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K1240/proto");
const sceneDir = resolve(process.argv[3] ?? join(here, "../../K868/scenes"));
for (const k of Object.keys(process.env)) if (/^K1[0-9]+_|^KF_/.test(k)) throw new Error(`env switch ${k} set: the proto would leave its default path`);

const imp = async (f: string): Promise<Record<string, any>> => import(/* @vite-ignore */ pathToFileURL(join(protoDir, f)).href);
const PO = await imp("outline.ts");
const PD = await imp("draw.ts");
const PF = await imp("fill_tri.ts");
const PP = await imp("paint.ts");

const moved = (s: SceneIn): SceneIn => {
  const t = structuredClone(s);
  for (const c of t.chains) for (let i = 0; i < c.pts.length; i += 2) {
    const x = c.pts[i]; const y = c.pts[i + 1];
    c.pts[i] = 1.3 + Math.cos(0.3) * x - Math.sin(0.3) * y;
    c.pts[i + 1] = -0.7 + Math.sin(0.3) * x + Math.cos(0.3) * y;
  }
  return t;
};
const outOf = (table: unknown, pd: any, ks: number, band: any): OutlineOut => ({
  table,
  paint: { idx: pd.idx, run: pd.run, src: pd.src, pos: pd.pos, key: pd.key, w: pd.w, s: pd.s, tex: pd.tex, copies: pd.copies, ks },
  band: { bandPos: band.bandPos, bandCol: band.bandCol, bandAlpha: band.bandAlpha, bandCount: band.bandCount },
});

let bad = 0;
const pins: Record<string, unknown> = {};
for (const name of OUTLINE_SCENES) {
  const path = join(sceneDir, `${name}.json`);
  if (!existsSync(path)) { console.log(`${name}: missing ${path}`); bad++; continue; }
  const s0 = loadScene(path);
  const s1 = moved(s0);
  // Proto, frame 0: the page's default path.
  const t0 = performance.now();
  const pTable = PO.buildOutline(s0);
  const pData = PD.buildDrawData(pTable, s0, undefined, "app");
  const pMs = performance.now() - t0;
  const p0 = digestOut(outOf(pTable, pData.paint, pData.fillKS, pData));
  // Proto, frame 1 in the carried order.
  const st = PO.structure(s0);
  const tb0 = PO.frame(st, s0);
  const fs = PF.fillStructure(st, PF.fillResolution(st, tb0));
  const pd = PD.paintData(fs, st, PF.fillFrame(fs, st, tb0, s0, PD.zChains(s0)), s0, "app", PD.baseHueFor(s0.name));
  let p1: ReturnType<typeof digestOut> | string;
  try {
    const tb1 = PO.frame(st, s1);
    const fr1 = PF.fillFrame(fs, st, tb1, s1, PD.zChains(s1));
    PD.paintFrame(pd, fr1, PP.sectionPaint(s1, "app", PD.baseHueFor(s1.name)));
    const d1 = PD.buildDrawData(tb1, s1, { st, fs }, "flat");
    p1 = digestOut(outOf(tb1, pd, d1.fillKS, d1));
  } catch (e) { p1 = `throws ${(e as Error).message}`; }
  // Port.
  const t1 = performance.now();
  const m = new OutlineModel(s0);
  const mMs = performance.now() - t1;
  const q0 = digestOut(outOf(m.table, m.pd, m.ks, m.band));
  let q1: ReturnType<typeof digestOut> | string;
  try { m.update(s1); q1 = digestOut(outOf(m.table, m.pd, m.ks, m.band)); } catch (e) { q1 = `throws ${(e as Error).message}`; }
  const warm: number[] = [];
  if (typeof q1 !== "string" && name === "def") for (let k = 0; k < 3; k++) { m.update(k % 2 ? s1 : s0); warm.push(m.frameMs); }
  const same0 = JSON.stringify(p0) === JSON.stringify(q0);
  const same1 = JSON.stringify(p1) === JSON.stringify(q1);
  if (!same0 || !same1) bad++;
  pins[name] = { f0: q0, f1: q1 };
  console.log(`${name}: frame0 ${same0 ? "EQUAL" : "DIFF"} ${same0 ? "" : JSON.stringify({ p0, q0 })} frame1 ${same1 ? "EQUAL" : "DIFF"} ${same1 ? "" : JSON.stringify({ p1, q1 })} | proto ${pMs.toFixed(0)} ms, port structure+frame ${mMs.toFixed(0)} ms, port frames ${warm.map((v) => v.toFixed(0)).join("/")} ms`);
}
console.log(JSON.stringify(pins, null, 1));
console.log(bad ? `${bad} scene(s) differ` : "all 12 scenes equal (frame 0 and frame 1)");
process.exit(bad ? 1 : 0);
