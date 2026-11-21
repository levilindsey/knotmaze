// K1482 s36: which outline term makes a flagged blob fat, by switching terms off in the CPU mirror (GfEval) only.
// Per blob of group36.py's groups.json: the mirror's border ink (>= 0.5) over a box of +-HALF device px around the
// blob's widest px, and the widest inscribed disc there (Euclidean, 2 * dist to the nearest un-inked px centre - 1,
// in strokes of the mirror's own W px; a lone band reads about 1, two bands side by side about 2), for
//   base    the mirror as it is
//   novtx   the vertex cap off (E.vtx = () => 0)
// and, when the process runs with GF_TANG=0 (eval.ts's own switch), the same two without the tangent-point terms.
//   $env:GF_KRETRY='1'; node scripts/run_node.mjs .claude/probes/K1482/s36/ball36.ts <scene.json> <sites.json> <groups.json> <out.tsv>
//   ($env:GF_TANG='0' for the second run; Remove-Item Env:GF_TANG after)
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const SRC = resolve(import.meta.dirname, "../../../..");
const { buildTables, withHome } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/tables.ts")).href);
const { CTRL_ARC } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/gf_build.ts")).href);
const { GfEval } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/eval.ts")).href);
const dec = (v: any): any => { if (v === "Inf") return Infinity; if (v === "-Inf") return -Infinity; if (v === "NaN") return NaN; if (Array.isArray(v)) return v.map(dec); if (v && typeof v === "object") { if (v.__t) return (globalThis as any)[v.__t].from(v.v.map(dec)); const o: any = {}; for (const k of Object.keys(v)) o[k] = dec(v[k]); return o; } return v; };
const [, , sceneP, sitesP, groupsP, outP] = process.argv;
const HALF = Number(process.env.HALF ?? 14); const NEAR = Number(process.env.NEAR ?? 6);
const scene = dec(JSON.parse(readFileSync(sceneP, "utf8"))); scene.look.ctrlArc ??= CTRL_ARC;
const SJ = JSON.parse(readFileSync(sitesP, "utf8")); const [a, , , d, e, f] = SJ.toDevA;
const T: any = withHome(buildTables(scene, { aa: 0.5 / a, kRetry: true }), true);
const E: any = new GfEval(T); const Wpx = T.W * a; const vtx0 = E.vtx.bind(E);
const G = JSON.parse(readFileSync(groupsP, "utf8"));
const tang = process.env.GF_TANG === "0" ? "notan" : "tan";
const N = 2 * HALF + 1;
function widest(mx: number, my: number): number {
  const ink = new Uint8Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const wx = (mx - HALF + i + 0.5 - e) / a; const wy = (my - HALF + j + 0.5 - f) / d;
    ink[j * N + i] = E.eval(wx, wy).ink >= 0.5 ? 1 : 0;
  }
  let best = 0;
  for (let j = HALF - NEAR; j <= HALF + NEAR; j++) for (let i = HALF - NEAR; i <= HALF + NEAR; i++) {
    if (!ink[j * N + i]) continue;
    let m = Math.min(i + 1, j + 1, N - i, N - j); m = m * m; // the box edge bounds what can be seen
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!ink[y * N + x]) { const q = (x - i) * (x - i) + (y - j) * (y - j); if (q < m) m = q; }
    if (m > best) best = m;
  }
  return (2 * Math.sqrt(best) - 1) / Wpx;
}
const rows = [`maze\tsig\tsites\tcensus\t${tang}_base\t${tang}_novtx`];
for (const g of G) {
  E.vtx = vtx0; const b = widest(g.mx, g.my);
  E.vtx = () => 0; const nv = widest(g.mx, g.my);
  rows.push([g.maze, g.sig, g.sites.join(","), g.strokes, b.toFixed(2), nv.toFixed(2)].join("\t"));
}
E.vtx = vtx0;
writeFileSync(outP, rows.join("\n") + "\n"); console.log(rows.join("\n")); console.log(`W ${Wpx.toFixed(2)} px; box +-${HALF}, widest within +-${NEAR} of the blob's px; tangent terms ${tang === "tan" ? "on" : "off"}`);
