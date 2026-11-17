import { buildModel } from "../K1314/k1314_census.ts";
import { gfTablesOf } from "../K1362/k1362s1_census.ts";
const m = buildModel(process.argv[2]); const T = gfTablesOf(m) as any; const sc = m.scene as any;
const js = sc.junctions ?? sc.field?.junctions; console.log(Object.keys(sc).join(","));
for (const ji of process.argv[3].split(",").map(Number)) {
  const J = js[ji]; console.log(`j${ji} c=(${J.c[0].toFixed(3)},${J.c[1].toFixed(3)}) kind=${J.kind ?? ""} corners=${JSON.stringify(J.corners ?? [])}`);
  J.arms.forEach((a: any, i: number) => console.log(`  arm${i} ${JSON.stringify(a)}`));
}
for (let k = 0; k < T.nK; k++) if (process.argv[3].split(",").map(Number).includes(T.kJ[k])) console.log(`k${k} j${T.kJ[k]} A${T.kA[k]} B${T.kB[k]} c=(${T.kCx[k].toFixed(3)},${T.kCy[k].toFixed(3)}) r=${T.kR[k].toFixed(3)} th=${T.kTheta[k].toFixed(3)}`);
