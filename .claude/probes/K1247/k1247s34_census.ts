// K1247 s34: k1247s33_census.ts writing out/s34/census (scenes k1247s34_*), the same check (c).
// K1247 s33: k1247s32_census.ts with KF_INC.jlocal on (kf.jlocal=false for s32's closure), scenes k1247s34_*, out/s34/census.
// K1247 s32 check (c): the K1314 census (as it is) on snapped mid-drag frames against the true ones.
// Per drag, a model with the snap on is fed every frame (rebuilt where its update throws, as the worker runs it);
// at each chosen frame its snapped input (the model's committed SnapState) and the true input are written as
// scenes (k1247s34_<drag>_f<N>_snap / _true, in out/s34/census/scenes/, the drag captures' GPU look keys dropped:
// the census paints the CPU fill and band). k1314_census's census() reads scenes from its SCENE_DIR (the main
// checkout's, which this stage must not write), so its readFileSync / existsSync are redirected for these names
// only (node:module syncBuiltinESMExports). Its default ppu 80 and min 12; it waits on the perf lock before each
// scene as its main does; its shared form B cache writes itself. Prints each pair's bar counts (ARTIFACT_KINDS)
// and every bar find of the snapped scene with no find of the same kind within 0.1 world of it in the true one.
//   node scripts/run_node.mjs .claude/probes/K1247/k1247s34_census.ts def:80,244 muse_hash:26 [sub=10] [T=0.5] [kf.jlocal=true]
import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import { basename, join, resolve } from "node:path";
import { OutlineModel } from "../../../src/render/outline/outline_model";
import { KF_INC, type SceneIn, type SnapState } from "../../../src/render/outline/outline";
import { loadDrag } from "./k1247s32_lib";

const args = process.argv.slice(2);
const arg = (k: string, d: string): string => args.find((a) => a.startsWith(`${k}=`))?.slice(k.length + 1) ?? d;
const sub = +arg("sub", "10");
const outDir = resolve(".claude/probes/K1247/out/s34/census"); const sceneDir = join(outDir, "scenes");
fs.mkdirSync(sceneDir, { recursive: true });
const rd = fs.readFileSync; const ex = fs.existsSync;
const redirect = (p: unknown): unknown => (typeof p === "string" && /k1247s34_[^\\/]*\.json$/.test(p) ? join(sceneDir, basename(p)) : p);
(fs as { readFileSync: unknown }).readFileSync = (p: unknown, ...a: unknown[]): unknown => (rd as (...x: unknown[]) => unknown)(redirect(p), ...a);
(fs as { existsSync: unknown }).existsSync = (p: unknown): boolean => ex(redirect(p) as string);
syncBuiltinESMExports();
const C = await import("../K1314/k1314_census");

const clean = (s: SceneIn): SceneIn => { const t = structuredClone(s); const look = t.look as Record<string, unknown>; delete look.fillRec; delete look.bandRec; delete look.bandRecGpu; return t; };
const pairs: { drag: string; f: number }[] = [];
const snap0 = KF_INC.snap; const cache0 = KF_INC.cache; const T0 = KF_INC.T;
KF_INC.snap = true; KF_INC.cache = true; KF_INC.T = +arg("T", String(T0)); const jl0 = KF_INC.jlocal; KF_INC.jlocal = arg("kf.jlocal", "true") === "true"; // K1247 s33: the span-local holds
for (const spec of args.filter((a) => a.includes(":"))) {
  const [drag, fl] = spec.split(":"); const frames = fl.split(",").map(Number);
  const { cap, raw } = loadDrag(join(".claude/probes/K1247/out/s18/drag", drag), sub);
  let M = new OutlineModel(cap[0]); let rebuilt = 0;
  for (let i = 1; i <= Math.max(...frames); i++) {
    try { M.update(raw[i]); } catch { M = new OutlineModel(raw[i]); rebuilt = i; }
    if (!frames.includes(i)) continue;
    const S = (M as unknown as { snap: SnapState }).snap; const r = raw[i];
    if (rebuilt === i || S.chains.length !== r.chains.length) { console.log(`${drag} f${i}: the model rebuilt here (snapped = true), skipped`); continue; }
    const sn: SceneIn = { ...r, chains: r.chains.map((c, k) => ({ ...c, pts: (S.chains[k] ?? c.pts) as number[] })), crossings: r.crossings.map((x, k) => S.cross[k] ?? x), junctions: r.junctions.map((j, k) => S.junc[k] ?? j) };
    const held = S.dChains.reduce((a, d) => a + (d ? 0 : 1), 0);
    fs.writeFileSync(join(sceneDir, `k1247s34_${drag}_f${i}_snap.json`), JSON.stringify(clean(sn)));
    fs.writeFileSync(join(sceneDir, `k1247s34_${drag}_f${i}_true.json`), JSON.stringify(clean(r)));
    console.log(`${drag} f${i}: wrote the snapped scene (${held} of ${r.chains.length} chains held) and the true one`);
    pairs.push({ drag, f: i });
  }
}
KF_INC.snap = snap0; KF_INC.cache = cache0; KF_INC.T = T0; KF_INC.jlocal = jl0;

const waitLock = (): void => {
  const lock = join(process.env.TEMP ?? "", "claude-perf.lock"); const sab = new Int32Array(new SharedArrayBuffer(4));
  let said = false;
  while (ex(lock) && Date.now() - fs.statSync(lock).mtimeMs < 30 * 60e3) { if (!said) { console.log(`waiting on the perf lock: ${rd(lock, "utf8").trim()}`); said = true; } Atomics.wait(sab, 0, 0, 10e3); }
};
const K = C.ARTIFACT_KINDS; const res: Record<string, unknown> = {};
for (const { drag, f } of pairs) {
  const got: Record<string, ReturnType<typeof C.census>["arts"]> = {};
  for (const v of ["true", "snap"]) {
    const nm = `k1247s34_${drag}_f${f}_${v}`; waitLock(); const t0 = Date.now();
    got[v] = C.census(nm, 80, 12).arts.filter((a) => (K as readonly string[]).includes(a.kind));
    console.log(`  ${nm}: ${K.map((k) => `${k} ${got[v].filter((a) => a.kind === k).length}`).join(", ")} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  }
  const fresh = got.snap.filter((a) => !got.true.some((b) => b.kind === a.kind && Math.hypot(b.x - a.x, b.y - a.y) < 0.1));
  const gone = got.true.filter((a) => !got.snap.some((b) => b.kind === a.kind && Math.hypot(b.x - a.x, b.y - a.y) < 0.1));
  console.log(`${drag} f${f}: bar finds true ${got.true.length}, snapped ${got.snap.length}; only snapped ${fresh.length}, only true ${gone.length}`);
  for (const a of fresh.slice(0, 6)) console.log(`    + ${a.kind} ${a.sub} at (${a.x.toFixed(3)}, ${a.y.toFixed(3)}) ${a.px} px, ${a.part}, near ${a.near}; ${a.file}`);
  for (const a of gone.slice(0, 4)) console.log(`    - ${a.kind} ${a.sub} at (${a.x.toFixed(3)}, ${a.y.toFixed(3)}) ${a.px} px, ${a.part}, near ${a.near}`);
  res[`${drag}_f${f}`] = { true: got.true, snap: got.snap };
}
fs.writeFileSync(join(outDir, "census_c.json"), JSON.stringify(res, null, 1));
