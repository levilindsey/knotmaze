import { readFileSync, readdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join } from "node:path";
import { structure, frame, type SceneIn } from "./outline";
const dir = join(import.meta.dirname, "..", "out", "s15", "rec_def");
const files = readdirSync(dir).filter((f) => f.endsWith(".json.gz")).sort();
const L = (f: string): SceneIn => { const s = JSON.parse(gunzipSync(readFileSync(join(dir, f))).toString("utf8")) as SceneIn; (s.look as any).ctrlArc ??= 0.47; return s; };
const F = +(process.argv[2] ?? 23); const R = +(process.argv[3] ?? 2056); const X = +(process.argv[4] ?? 32.514), Y = +(process.argv[5] ?? 3.662);
const sc = files.slice(0, F + 1).map(L);
const st = structure(sc[0]); const snap: any[] = [];
for (let f = F - 1; f <= F; f++) { }
let ta: any, tb: any;
for (let f = 0; f <= F; f++) { const t: any = frame(st, sc[f]); if (f >= F - 1) { const c = { regions: t.regions.map((r: any) => ({ ...r, pts: Array.from(r.pts), pieces: [...(r.pieces ?? [])] })), pieces: t.pieces.map((p: any) => ({ ...p, pts: Array.from(p.pts) })) }; if (f === F - 1) ta = c; else tb = c; } }
const S = sc[0].camera.pxPerUnit * 2;
const ra = ta.regions[R], rb = tb.regions[R];
const keys = Object.keys(ra).filter((k) => k !== "pts"); console.log(keys.map((k) => `${k}=${JSON.stringify(ra[k])}`).join(" "));
for (const [nm, r] of [["A", ra], ["B", rb]] as const) { const p = r.pts; let bi = 0, bd = Infinity; for (let k = 0; k < p.length; k += 2) { const d = Math.hypot(p[k] - X, p[k + 1] - Y); if (d < bd) { bd = d; bi = k >> 1; } }
  console.log(nm, "n", p.length >> 1, "nearest", bi); for (let k = 0; k < p.length >> 1; k++) console.log(`  ${k}: ${p[2*k].toFixed(4)},${p[2*k+1].toFixed(4)}  r=${Math.hypot(p[2*k]-32.28812, p[2*k+1]-3.44385).toFixed(4)}`); }
