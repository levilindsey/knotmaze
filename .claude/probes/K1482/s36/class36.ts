// K1482 s36: what inks each wedge-flagged site's fat blob, read from the CPU mirror (GfEval). Input: a capture's
// scene_gf.json and sites_gf.json (cap34.mjs SCENE=1) and blob36.py's JSON of the same frame. Per flagged site and
// blob (the widest first): the inscribed disc's px (radius = the blob's dt) evaluated by the mirror: how much of the
// disc the mirror inks (>= 0.5), which outline terms win there (side cN+-, arc kN, cap cN, tan kN, thru kN, with px
// counts), how many chains and junctions they belong to, the pieces at the widest px, and the corners within reach.
//   $env:GF_KRETRY='1'; node scripts/run_node.mjs .claude/probes/K1482/s36/class36.ts <scene.json> <sites.json> <blobs.json> [out.tsv] [V=1 pieces]
// aa = 0.5 / toDevA[0] (gf_app.ts: aa = 0.5 / scale).
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const SRC = resolve(import.meta.dirname, "../../../..");
const { buildTables, withHome } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/tables.ts")).href);
const { CTRL_ARC } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/gf_build.ts")).href);
const { GfEval } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/eval.ts")).href);
const dec = (v: any): any => { if (v === "Inf") return Infinity; if (v === "-Inf") return -Infinity; if (v === "NaN") return NaN; if (Array.isArray(v)) return v.map(dec); if (v && typeof v === "object") { if (v.__t) return (globalThis as any)[v.__t].from(v.v.map(dec)); const o: any = {}; for (const k of Object.keys(v)) o[k] = dec(v[k]); return o; } return v; };
const [, , sceneP, sitesP, blobsP, outP] = process.argv;
const scene = dec(JSON.parse(readFileSync(sceneP, "utf8"))); scene.look.ctrlArc ??= CTRL_ARC;
const SJ = JSON.parse(readFileSync(sitesP, "utf8")); const [a, , , d, e, f] = SJ.toDevA;
const T: any = withHome(buildTables(scene, { aa: 0.5 / a, kRetry: true }), true);
const E: any = new GfEval(T); const h = T.h;
const BJ = JSON.parse(readFileSync(blobsP, "utf8"));
const rows: string[] = ["site\twedge\tblobs\tn\tstrokes\tlen\twid\tdisc\tmirInk\tchains\tjuncs\tnSide\tnArc\tnCap\tnTan\tnThru\tends\tterms\tnear"];
const wkName = ["none", "side", "arc", "cap", "tan", "thru", "vtx"];
for (const s of BJ.sites) {
  if (!s.flag) continue;
  const b = s.blobs[0]; const r = Math.ceil(b.dt); const r2 = b.dt * b.dt + 0.01;
  const terms = new Map<string, number>(); const chains = new Set<number>(); const juncs = new Set<number>();
  let disc = 0, inked = 0; const cnt = [0, 0, 0, 0, 0, 0, 0]; let ends = 0;
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (dx * dx + dy * dy > r2) continue; disc++;
    const wx = (b.mx + dx + 0.5 - e) / a; const wy = (b.my + dy + 0.5 - f) / d; const o = E.eval(wx, wy);
    if (o.ink < 0.5) continue; inked++;
    const wk = o.winKind; cnt[wk]++;
    let key = wkName[wk];
    if (wk === 1 || wk === 3) { key += ` c${o.winA}${o.winB > 0 ? "+" : "-"}`; chains.add(o.winA); }
    else if (wk === 6) { key += ` a${o.winA}/${o.winB}`; } else if (wk === 2 || wk === 4 || wk === 5) { key += ` k${o.winA}`; juncs.add(T.kJ[o.winA]); chains.add(T.kCa[o.winA]); if (T.kCb) chains.add(T.kCb[o.winA]); }
    terms.set(key, (terms.get(key) ?? 0) + 1);
    for (let j = 0; j < E.np; j++) if (E.pend[j] && E.pd[j] < h * 1.5) { ends++; break; }
  }
  const wx = (b.mx + 0.5 - e) / a; const wy = (b.my + 0.5 - f) / d; E.eval(wx, wy);
  const P: string[] = []; for (let k = 0; k < E.np; k++) P.push(`c${E.pc[k]}s${E.ps[k].toFixed(2)} d${(E.pd[k] / h).toFixed(2)} g${E.pg[k]} r${E.pramp[k].toFixed(2)} e${E.pend[k]} z${E.pz[k].toFixed(2)}${T.cClosed[E.pc[k]] ? "" : " open L" + T.cLen[E.pc[k]].toFixed(1)}`);
  // corners within 3 h of the widest px
  const near: string[] = [];
  for (let k = 0; k < T.kCx.length; k++) { const q = Math.hypot(T.kCx[k] - wx, T.kCy[k] - wy); if (q < 3 * h + T.kR[k]) near.push(`k${k}:j${T.kJ[k]} R${(T.kR[k] / h).toFixed(2)} q${(q / h).toFixed(2)}${T.kThru[k] ? " thru" : ""}`); }
  const ts = [...terms.entries()].sort((p, q) => q[1] - p[1]).map(([k, n]) => `${k} x${n}`).join("; ");
  rows.push([s.site, s.wedge, s.blobs.length, b.n, b.strokes, b.len, b.wid, disc, inked, chains.size, juncs.size, cnt[1], cnt[2], cnt[3], cnt[4], cnt[5], ends, ts, near.join(", ")].join("\t"));
  console.log(`${s.site} wedge ${s.wedge} at ${b.mx},${b.my} (site ${s.x},${s.y}; ${Math.hypot(b.mx - s.x, b.my - s.y).toFixed(0)} px off) disc ${disc} px, mirror inks ${inked}; chains ${chains.size} juncs ${juncs.size}; ends ${ends}\n   terms: ${ts}\n   corners: ${near.join(", ") || "-"}`);
  if (process.env.V) console.log(`   pieces: ${P.join(" | ")}`);
}
if (outP) writeFileSync(outP, rows.join("\n") + "\n");
console.log(`h ${h.toFixed(4)} W ${T.W.toFixed(4)} (${(T.W * a).toFixed(2)} px) aa ${T.aa.toFixed(6)}; frame W ${BJ.W.toFixed(2)} px`);
