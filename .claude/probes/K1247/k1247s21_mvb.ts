// Cold and warm OutlineModel construction, master's source vs the branch's, one captured frame. argv: frameJson order(MB|BM) R
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
const [fj, order, Rs] = process.argv.slice(2);
const M = await import(pathToFileURL("C:/Users/lsl/AppData/Local/Temp/k1247s20m/src-2d547152/src/render/outline/outline_model.ts").href);
const B = await import(pathToFileURL("C:/Users/lsl/Repositories/knotmaze/.claude/worktrees/agent-afc77e62550888b86/src/render/outline/outline_model.ts").href);
const ld = (rec) => { const s = JSON.parse(readFileSync(fj, "utf8")); s.look.ctrlArc ??= 0.47; if (rec) s.look.fillRec = rec; else delete s.look.fillRec; return s; };
const run = (k) => { const s = ld(k === "B" ? 2 : 0); const t = performance.now(); const m = new (k === "B" ? B : M).OutlineModel(s); return [performance.now() - t, m.structureMs]; };
const cold = {}; for (const k of order) cold[k] = run(k);
const warm = { M: [], B: [] }; for (let r = 0; r < Number(Rs); r++) for (const k of order) warm[k].push(run(k)[0]);
const med = (a) => [...a].sort((x, y) => x - y)[a.length >> 1];
console.log(`${order}: cold M ${cold.M[0].toFixed(0)} (structureMs ${cold.M[1].toFixed(0)}), B ${cold.B[0].toFixed(0)} (${cold.B[1].toFixed(0)}) | warm p50 M ${med(warm.M).toFixed(0)}, B ${med(warm.B).toFixed(0)}`);
