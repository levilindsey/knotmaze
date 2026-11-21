// K1482 s43: the switch-off check. The mirror at the stage's start (77ac869d6's eval.ts + tables.ts, copied beside
// the live ones as eval_b43.ts / tables_b43.ts by off43.ps1) against today's with every bend switch unset, on a
// device-pixel grid over the whole frame (every STEP-th pixel) plus full windows. Prints differing pixel counts.
//   $env:GF_KRETRY='1'; node scripts/run_node.mjs .claude/probes/K1482/s43/off43.ts <scene.json> <sites.json> <W> <H> <step> [x0,y0,n]...
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const SRC = resolve(import.meta.dirname, "../../../..");
const G = join(SRC, "src/render/gpu_field");
const imp = (p: string) => import(pathToFileURL(join(G, p)).href);
const { CTRL_ARC } = await imp("gf_build.ts");
const now = { t: await imp("tables.ts"), e: await imp("eval.ts") };
const base = { t: await imp("tables_b43.ts"), e: await imp("eval_b43.ts") };
const dec = (v: any): any => { if (v === "Inf") return Infinity; if (v === "-Inf") return -Infinity; if (v === "NaN") return NaN; if (Array.isArray(v)) return v.map(dec); if (v && typeof v === "object") { const o: any = {}; for (const k in v) o[k] = dec(v[k]); return o; } return v; };
const [, , sceneP, sitesP, Ws, Hs, steps, ...wins] = process.argv;
const SJ = JSON.parse(readFileSync(sitesP, "utf8")); const [a, , , d, e, f] = SJ.toDevA;
const mk = (M: any) => { const scene = dec(JSON.parse(readFileSync(sceneP, "utf8"))); scene.look.ctrlArc ??= CTRL_ARC; const T = M.t.withHome(M.t.buildTables(scene, { aa: 0.5 / a, kRetry: true }), true); return new M.e.GfEval(T); };
if (now.e.GfEval.BEND !== 0) throw new Error("GF_BEND is set");
const E0: any = mk(base), E1: any = mk(now);
let n = 0, diff = 0, ink = 0; const worst: string[] = [];
const at = (X: number, Y: number) => {
  const x = (X + 0.5 - e) / a, y = (Y + 0.5 - f) / d;
  const o0 = E0.eval(x, y); const i0 = o0.ink, c0 = o0.cov, h0 = o0.chain;
  const o1 = E1.eval(x, y); n++; if (i0 > 0) ink++;
  if (o1.ink !== i0 || o1.cov !== c0 || o1.chain !== h0) { diff++; if (worst.length < 5) worst.push(`${X},${Y} ink ${i0}->${o1.ink}`); }
};
const S = +steps;
for (let Y = 0; Y < +Hs; Y += S) for (let X = 0; X < +Ws; X += S) at(X, Y);
console.log(`grid step ${S}: ${n} px, ${ink} inked, differing ${diff}`);
for (const w of wins) { const [x0, y0, N] = w.split(",").map(Number); const d0 = diff, n0 = n; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) at(x0 + c, y0 + r); console.log(`window ${w}: ${n - n0} px, differing ${diff - d0}`); }
console.log(`total differing ${diff}${worst.length ? ": " + worst.join("; ") : ""}`);
