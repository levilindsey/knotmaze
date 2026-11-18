import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const [, , tp, sp, nm, box, Rs] = process.argv; const R = +(Rs ?? 24);
const SRC = resolve(import.meta.dirname, "../../../..");
const { GfEval } = await import(pathToFileURL(process.env.GFX ?? join(SRC, "src/render/gpu_field/eval.ts")).href);
const raw = JSON.parse(readFileSync(tp, "utf8")); const T: any = {};
for (const [k, v] of Object.entries<any>(raw)) { if (v && typeof v === "object" && v.__t) { const C = (globalThis as any)[v.__t]; T[k] = C.from(v.v.map((x: any) => (x === "Inf" ? Infinity : x === "-Inf" ? -Infinity : x === "NaN" ? NaN : x))); } else T[k] = v; }
T.homeOn = true;
const SJ = JSON.parse(readFileSync(sp, "utf8")); const [a, , , d, e, f] = SJ.toDevA; const s = SJ.sites.find((q: any) => q.site === nm);
const [x0, x1, y0, y1] = box.split(",").map(Number); const E: any = new GfEval(T);
console.log(`h ${T.h} W ${T.W} aa ${T.aa} zt ${T.zt} sigma ${T.sigma} px/world ${a}`);
const chs = (process.env.CH ?? "23,43").split(",").map(Number);
for (const c of chs) {
  console.log(`-- h - d(chain ${c}) in px, '#' = ink`);
  for (let ty = y0; ty < y1; ty++) {
    let row = `${String(ty).padStart(2)} `;
    for (let tx = x0; tx < x1; tx++) {
      const px = Math.round(s.x) - R + tx + 0.5, py = Math.round(s.y) - R + ty + 0.5; const o = E.eval((px - e) / a, (py - f) / d);
      let dd = Infinity; for (let j = 0; j < E.np; j++) if (E.pc[j] === c) dd = Math.min(dd, E.pd[j]);
      const v = (T.h - dd) * a; row += (dd === Infinity ? "   ." : (v >= 0 ? " " : "") + v.toFixed(0).padStart(3)) + (o.ink >= 0.5 ? "#" : " ");
    }
    console.log(row);
  }
}
