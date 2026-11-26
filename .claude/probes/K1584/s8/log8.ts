// K1584 s8: runs s7/tabdiff.ts with a stage 8 variant (env GF_SRCP = out/v_s8<Var>, mkv8.ps1) and prints the variant's
// __s8Log rows (pair-corner tangent points "tp" and flags "flag") for one under/over pair (or all with "-").
//   npx tsx log8.ts <capDir> <under|-> <over|->      (env GF_SRCP, GF_KRETRY=1)
import { join } from "node:path"; import { pathToFileURL } from "node:url";
(globalThis as any).__s8Log = [];
const [, , cap, under, over] = process.argv;
process.argv = [process.argv[0], process.argv[1], cap, join(process.env.TEMP!, "log8_tab.json")];
await import(pathToFileURL(join(import.meta.dirname, "../s7/tabdiff.ts")).href);
for (const r of (globalThis as any).__s8Log) if ((under === "-" || r[1] === +under) && (over === "-" || r[2] === +over)) console.log(JSON.stringify(r));
