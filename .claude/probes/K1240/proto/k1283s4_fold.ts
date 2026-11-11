// K1283 s4: the fold cut's diagnostics (frame()'s first 20 'fold ch<pi> side<sig>' lines). With a temporary
// console.log in cutFoldsC gated on globalThis.__foldDbg === pi it showed every cluster spending its 8 rounds on
// j = i + 2 (the shared vertex, segInt t = 1, u = 0): the fold cut never cuts (census k1283s4a2 = with j from i + 3).
//   node scripts/run_node.mjs --config .claude/probes/K1240/proto/k1283_vite.config.mjs \
//     .claude/probes/K1240/proto/k1283s4_fold.ts <scene> <chain> <x> <y> [R=0.8]
import { loadScene } from "./k1279_census";
import * as O from "./outline";

const [name, chs, xs, ys, rs] = process.argv.slice(2);
const scene = loadScene(name) as unknown as O.SceneIn & { chains: { x: number[]; y: number[] }[] };
(globalThis as unknown as { __foldDbg?: number }).__foldDbg = Number(process.argv[3]);
const st = O.structure(scene); const t = O.frame(st, scene) as unknown as { diagnostics: string[] };
const ch = Number(chs); const x = Number(xs); const y = Number(ys); const R = Number(rs ?? 0.8);
console.log("fold diag:", t.diagnostics.filter((d) => d.startsWith("fold")).join(" | "));
const c = (scene as unknown as { chains: { pts?: number[]; x?: number[]; y?: number[] }[] }).chains?.[ch];
console.log("chain keys:", c ? Object.keys(c).join(",") : "none", "scene keys:", Object.keys(scene).join(","));


