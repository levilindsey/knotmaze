// K1362 s12: dump a tier's fragment source: node scripts/run_node.mjs .claude/probes/K1362/k1362s13_dump.ts <out> [kz|-] [fj]
import { writeFileSync } from "node:fs";
import { gfFs, type GfTier } from "../../../src/render/gpu_field/gf_glsl";
const T: GfTier = { p: 3, k: 2, ramps: true, s: 3, lab: true, grp: true, ks: true };
const kz = process.argv[3] && process.argv[3] !== "-" ? (process.argv[3] as GfTier["kz"]) : undefined;
writeFileSync(process.argv[2], gfFs(false, true, { ...T, kz, fj: process.argv[4] === "fj" }));