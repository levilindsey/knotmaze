import { loadScene } from "../../../../test/render/outline_digest";
import { structure, frame } from "../../../../src/render/outline/outline";
import { bandData, zChains } from "../../../../src/render/outline/draw";
import { bandGpu, BAND_SLOTS } from "../../../../src/render/outline/band_gpu";
// K1240 S4b: the GPU band's CPU cost (bandGpu) against bandData's, on a K868
// scene. Usage: node scripts/run_node.mjs <this> [def] (env NOBD=1 skips
// bandData, REPS=n repeats bandGpu).
const name = process.argv[2] ?? "def";
const s0 = loadScene(`.claude/probes/K868/scenes/${name}.json`);
const st = structure(s0);
const tb = frame(st, s0);
const zz = zChains(s0);
const T = (l: string, f: () => any): any => { const t = performance.now(); const r = f(); console.log(l, (performance.now() - t).toFixed(1)); return r; };
let b: any = null;
const reps = Number(process.env.REPS) || 5;
for (let k = 0; k < reps; k++) b = T("bandGpu", () => bandGpu(tb, s0, zz));
console.log("verts", b.count, "dropped", b.dropped, "chainTexH", b.chainTexH, "passTexH", b.passTexH);
const slotHist = new Array(BAND_SLOTS + 1).fill(0);
for (let v = 0; v < b.count; v += 6) { let n = 0; for (let k = 0; k < BAND_SLOTS; k++) if (b.slots[BAND_SLOTS * v + k] >= 0) n++; slotHist[n]++; }
console.log("slots per quad", slotHist.join(" "));
if (!process.env.NOBD) { const bd = T("bandData", () => bandData(tb, s0, zz)); console.log("bandData verts", bd.bandCount); }
