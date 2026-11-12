import { buildModel } from "./k1314_census";
const m = buildModel(process.argv[2]) as any;
const all: string[] = m.table.diagnostics ?? [];
const d = all.filter((x: string) => x.includes("fold"));
console.log(`${d.length} fold lines (first 20 only) of ${all.length}`); for (const x of d) if (x.startsWith("end fold")) console.log(x);
