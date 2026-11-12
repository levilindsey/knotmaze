import { buildModel } from "./k1314_census";
const g = globalThis as unknown as { __k1314dbg?: string[] }; g.__k1314dbg = [];
const nm = process.argv[2]; const want = process.argv.slice(3).map(Number);
buildModel(nm);
for (const l of g.__k1314dbg) if (!want.length || want.some((c) => l.startsWith(`c${c} `))) console.log(l);
