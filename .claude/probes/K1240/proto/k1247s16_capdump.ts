import { readFileSync, readdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join } from "node:path";
import { structure, frame, debugCache, type SceneIn } from "./outline";
const dir = join(import.meta.dirname, "..", "out", "s15", "rec_" + (process.argv[4] ?? "def"));
const files = readdirSync(dir).filter((f) => f.endsWith(".json.gz")).sort();
const L = (f: string): SceneIn => { const s = JSON.parse(gunzipSync(readFileSync(join(dir, f))).toString("utf8")) as SceneIn; (s.look as any).ctrlArc ??= 0.47; return s; };
const F = +(process.argv[2] ?? 23); const PI = +(process.argv[3] ?? 27);
const sc = files.slice(0, F + 1).map(L);
const st = structure(sc[0]); const S = sc[0].camera.pxPerUnit * 2;
for (let f = 0; f <= F; f++) { frame(st, sc[f]); if (f >= F - 1) { const C: any = debugCache(st); const p = C.polys[PI];
  const sp = sc[f].chains[PI].pts; console.log(`f${f} chain ${PI} closed ${p.closed} s0 ${p.s0} len ${p.len} scene end (${sp[sp.length-2]},${sp[sp.length-1]}) start (${sp[0]},${sp[1]}) npts ${sp.length/2}`);
  for (let ci = 0; ci < C.capStation.length; ci++) { const slot = C.capStation[ci]; if (C.slotPi?.[slot] !== PI) continue; const n = C.capArcN[ci]; const ax = C.capArcX[ci], ay = C.capArcY[ci];
    console.log(`  cap ${ci} slot ${slot} centre (${C.capCx[ci].toFixed(5)},${C.capCy[ci].toFixed(5)}) n ${n}: ` + Array.from({ length: n }, (_, i) => `(${ax[i].toFixed(4)},${ay[i].toFixed(4)})`).join(" ")); }
  for (const B of [C.bords[PI*2], C.bords[PI*2+1]]) { const nb = B.nb; console.log(`  border nb ${nb}: last 4 base: ` + [nb-4,nb-3,nb-2,nb-1].map((i) => `s${B.bs[i].toFixed(4)}(${B.bx[i].toFixed(4)},${B.by[i].toFixed(4)})`).join(" ") + "  first 3: " + [0,1,2].map((i) => `s${B.bs[i].toFixed(4)}(${B.bx[i].toFixed(4)},${B.by[i].toFixed(4)})`).join(" ")); }
} }
