// K1290: a corner's arc ends frame by frame near a point, on the recorded
// motion (out/s15/rec_<name>). Run through k1290_vite.config.mjs for the
// forward table (K1290_FWD=0 there is master's).
//   node scripts/run_node.mjs --config .claude/probes/K1240/proto/k1290_vite.config.mjs .claude/probes/K1240/proto/k1290_corner.ts <name> <x> <y> [--r=0.3] [--f=a-b]
import { readFileSync, readdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as O from "./outline";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const pos = args.filter((a) => !a.startsWith("--"));
const name = pos[0] ?? "def"; const X = Number(pos[1]); const Y = Number(pos[2]);
const R = Number(opt("r") ?? "0.3");
const dir = join(here, "..", "out", "s15", `rec_${name}`);
const files = readdirSync(dir).filter((f) => f.endsWith(".json.gz")).sort();
const fr = (opt("f") ?? `0-${files.length - 1}`).split("-").map(Number);
const loadScene = (f: string): O.SceneIn => { const s = JSON.parse(gunzipSync(readFileSync(join(dir, f))).toString("utf8")) as O.SceneIn; (s.look as { ctrlArc?: number }).ctrlArc ??= 0.47; return s; };
const s0 = loadScene(files[0]);
const st = O.structure(s0);
const S = s0.camera.pxPerUnit * 2;
const near = (x: number, y: number): boolean => Math.hypot(x - X, y - Y) < R;
let prev: O.OutlineCorner[] | null = null;
const stats = (O as unknown as { fwdStats?: Record<string, number> }).fwdStats;
for (let f = fr[0]; f <= fr[1]; f++) {
  const sc = loadScene(files[f]);
  const before = stats ? { ...stats } : null;
  const t = O.frame(st, sc);
  const out: string[] = [];
  t.corners.forEach((c, ci) => {
    if (!(near(c.Vx, c.Vy) || near(c.tax, c.tay) || near(c.tbx, c.tby))) return;
    const p = prev?.[ci];
    const dA = p ? Math.hypot(c.tax - p.tax, c.tay - p.tay) * S : 0; const dB = p ? Math.hypot(c.tbx - p.tbx, c.tby - p.tby) * S : 0;
    const dQ = p ? Math.hypot(c.qx - p.qx, c.qy - p.qy) * S : 0;
    out.push(`c${ci}${c.ok ? "" : `(${c.why})`} r ${c.r.toFixed(4)} Q (${c.qx.toFixed(4)},${c.qy.toFixed(4)}) dQ ${dQ.toFixed(3)} TA (${c.tax.toFixed(4)},${c.tay.toFixed(4)}) d ${dA.toFixed(3)}${dA > 0.1 ? "!" : ""} TB (${c.tbx.toFixed(4)},${c.tby.toFixed(4)}) d ${dB.toFixed(3)}${dB > 0.1 ? "!" : ""}`);
  });
  const ds = stats && before ? Object.keys(stats).map((k) => `${k} ${stats[k] - before[k]}`).join(" ") : "";
  console.log(`f${f} ${ds}\n  ${out.join("\n  ")}`);
  prev = t.corners;
}
