// K1283 s10: an FNV-1a hash of every typed array fillFrame returns on a scene (a refactor's bit-for-bit check).
//   node scripts/run_node.mjs --config .claude/probes/K1240/proto/k1283_vite.config.mjs .claude/probes/K1240/proto/k1283s10_hash.ts [scene=def]
import * as O from "./outline";
import * as F from "./fill_tri";
import { loadScene } from "./k1279_census";
const name = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "def";
const scene = loadScene(name); const st = O.structure(scene); const t0 = O.frame(st, scene);
const fs = F.fillStructure(st, F.fillResolution(st, t0));
const r = F.fillFrame(fs, st, t0, scene) as unknown as Record<string, unknown>;
let h = 0x811c9dc5 >>> 0; let nb = 0;
for (const [, v] of Object.entries(r)) if (ArrayBuffer.isView(v)) { const b = new Uint8Array(v.buffer, v.byteOffset, v.byteLength); nb += b.length; for (let i = 0; i < b.length; i++) h = Math.imul(h ^ b[i], 0x01000193) >>> 0; }
console.log(`${name}: fill hash ${h.toString(16)} over ${nb} bytes`);