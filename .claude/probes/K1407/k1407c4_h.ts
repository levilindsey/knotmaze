// K1407 c4: print a scene's half-width h (the crops' frame is 2.5h wide). node scripts/run_node.mjs <this> <scene>
import { buildModel } from "../K1314/k1314_census.ts";
import { gfTablesOf } from "../K1362/k1362s1_census.ts";
console.log((gfTablesOf(buildModel(process.argv[2])) as any).h);
