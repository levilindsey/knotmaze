import { buildModel } from "./k1314_census";
const [nm, pis] = process.argv.slice(2); const m = buildModel(nm); const st = m.st as any;
for (const pi of pis.split(",").map(Number)) {
  const arms = st.arms.map((a: any, i: number) => ({ i, ...a })).filter((a: any) => a.pi === pi);
  console.log(`c${pi} len ${st.chains?.[pi]?.len ?? "?"} arms: ` + arms.map((a: any) => `a${a.i} j${a.ji} ${a.kind} dir ${a.dir} sR ${a.sR?.toFixed?.(3)}`).join("; "));
}
