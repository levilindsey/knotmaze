import { buildModel, filletOf } from "../K1314/k1314_census";
const [nm, ...cis] = process.argv.slice(2);
const m = buildModel(nm); const f = filletOf(m) as unknown as { corners: Record<string, number>[]; h: number; W: number; aa: number };
console.log(`h ${f.h} W ${f.W.toFixed(4)} aa ${f.aa.toFixed(4)}`);
for (const ci of cis) { const c = f.corners[+ci]; console.log(`c${ci}: ` + Object.entries(c).filter(([, v]) => typeof v === "number").map(([k, v]) => `${k} ${(+v).toFixed(3)}`).join(" ")); }
