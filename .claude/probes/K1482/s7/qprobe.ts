import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const SRC = resolve(import.meta.dirname, "../../../..");
const { GfEval } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/eval.ts")).href);
const raw = JSON.parse(readFileSync(process.argv[2], "utf8")); const T: any = {};
for (const [k, v] of Object.entries<any>(raw)) { if (v && typeof v === "object" && v.__t) { const C = (globalThis as any)[v.__t]; T[k] = C.from(v.v.map((x: any) => (x === "Inf" ? Infinity : x === "-Inf" ? -Infinity : x === "NaN" ? NaN : x))); } else T[k] = v; }
T.homeOn = true; const E: any = new GfEval(T);
const x = +process.argv[3], y = +process.argv[4]; E.eval(x, y); const h = T.h;
for (let j = 0; j < E.np; j++) {
  const X = E.pd[j]; const qx = E.pfx[j] + (h * (x - E.pfx[j])) / X; const qy = E.pfy[j] + (h * (y - E.pfy[j])) / X;
  const ds = Array.from({ length: E.np }, (_, m) => Math.sqrt(E.pieceD(m, qx, qy)).toFixed(3));
  console.log(`piece ${j} c ${E.pc[j]} foot ${E.pfx[j].toFixed(3)},${E.pfy[j].toFixed(3)} q ${qx.toFixed(3)},${qy.toFixed(3)} d(q, pieces) ${ds.join(" ")} plo ${E.plo[j]} phi ${E.phi[j]}`);
}
