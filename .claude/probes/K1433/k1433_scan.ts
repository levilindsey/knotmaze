// K1433: the bar test over one whole scene, one evaluator / mode. Writes the finds (JSON) and prints counts + the cost proxy.
//   node scripts/run_node.mjs .claude/probes/K1433/k1433_scan.ts <eval:u|d547|1336> <mode> <scene> <ppu> <out.json>
import { writeFileSync } from "node:fs";
import { loadEval, makeJudge, modelOf, tablesOf, rasterJudge, allFinds } from "./k1433_lib.ts";
const [which, mode, nm, ppuS, out] = process.argv.slice(2);
const ppu = +ppuS; const G = await loadEval(which); if (which === "u") G.MODE = mode;
if (process.env.K1433_SK) G.SK = +process.env.K1433_SK;
const T = tablesOf(nm); modelOf(nm);
let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
for (let i = 0; i < T.vx.length; i++) { const x = T.vx[i], y = T.vy[i]; if (!(x === x) || !(y === y)) continue; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
const pad = T.h * 2; const c0 = Math.floor((x0 - pad) * ppu), r0 = Math.floor((y0 - pad) * ppu);
const w = Math.ceil((x1 + pad) * ppu) - c0, h = Math.ceil((y1 + pad) * ppu) - r0;
const J0 = makeJudge(new G(T));
let segs = 0, pcalls = 0, cfgs = 0, act = 0, nSeg = 0, nK = 0;
const J = (x: number, y: number) => { const j = J0(x, y); if (j.cov > 0 || j.ink > 0) { act++; segs += j.segs; pcalls += j.pcalls; cfgs += j.cfgs; nSeg += j.nSeg; nK += j.nK; } return j; };
const t0 = Date.now(); const R = rasterJudge(J, c0, r0, w, h, ppu); const ms = Date.now() - t0;
const fs = allFinds(R, T, c0, r0, 3);
const cnt: Record<string, number> = {}; const px: Record<string, number> = {};
for (const f of fs) { const k = `${f.kind}:${f.cls}`; cnt[k] = (cnt[k] ?? 0) + 1; px[k] = (px[k] ?? 0) + f.px; }
const cost = { px: w * h, act, msPerMpx: +(ms / (w * h / 1e6)).toFixed(0), usPerAct: +(1000 * ms / act).toFixed(2), pcallsPerAct: +(pcalls / act).toFixed(2), segsPerAct: +(segs / act).toFixed(1), cfgsPerAct: +(cfgs / act).toFixed(3), nSegPerAct: +(nSeg / act).toFixed(1), nKPerAct: +(nK / act).toFixed(2) };
writeFileSync(out, JSON.stringify({ scene: nm, which, mode, ppu, w, h, cnt, px, cost, finds: fs }));
console.log(`${nm}\t${which === "u" ? mode : which}\tfinds ${fs.length}\t${JSON.stringify(cnt)}\t${JSON.stringify(cost)}`);
