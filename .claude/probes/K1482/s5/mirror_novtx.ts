// K1482 s5: mirror_tiles.ts with the K1407 c3 vertex cap (GfEval.vtx) switched off: does a fragment go with it?
//   npx tsx s5/mirror_novtx.ts <tables.json> <sites.json> <out.json> <sites> [R]
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const SRC = resolve(import.meta.dirname, "../../../..");
const { GfEval } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/eval.ts")).href);
(GfEval.prototype as any).vtx = function () { this.vtxA = -1; this.vtxB = -1; return 0; };
await import(pathToFileURL(resolve(import.meta.dirname, "../mirror_tiles.ts")).href);
