import { buildModel } from "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K1314/k1314_census.ts";
import { gfTablesOf } from "./k1362s1_census";
(globalThis as { __gfDbg?: number }).__gfDbg = Number(process.argv[3]);
gfTablesOf(buildModel(process.argv[2]));