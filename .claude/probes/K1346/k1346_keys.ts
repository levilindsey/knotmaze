import { buildModel } from "../K1314/k1314_census";
const m = buildModel(process.argv[2]); const p = m.table.pieces[Number(process.argv[3])] as any;
console.log(Object.keys(p).join(","), "s0", p.s0, "s1", p.s1, "region", p.region);
