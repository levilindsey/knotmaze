// K1283 s6: the fast frame's fold cuts on given chains, with their points (diagnostics carry the first 20 only).
import * as O from "../../../../src/render/outline/outline";
import { loadScene } from "./k1279_census";
const [nm, ...chs] = process.argv.slice(2);
const sc = loadScene(nm); const st = O.structure(sc); const tb = O.frame(st, sc) as unknown as { diagnostics: string[] };
const want = new Set(chs.map(Number));
console.log(tb.diagnostics.filter((d) => (d.startsWith("fold") || d.startsWith("corner") || d.startsWith("  cj"))).filter((d) => !want.size || want.has(Number(/ch(\d+)/.exec(d)?.[1]))).join("\n"));
// Corner skips (cutFoldsC's diag, when present): the bend's distance from its junction's centre, in h.
{
  const ds = tb.diagnostics; const h = (tb as unknown as { h: number }).h;
  for (let i = 1; i < ds.length; i++) {
    const m = /^corner ch(\d+) side(-?1) at s=([\d.-]+) \(([\d.-]+), ([\d.-]+)\)/.exec(ds[i]); const mj = /cj j(\d+)/.exec(ds[i - 1]);
    if (!m || !mj) continue;
    const c = sc.junctions[Number(mj[1])].c;
    console.log(`D j${mj[1]} ch${m[1]} side${m[2]} s=${m[3]}: |bend - c| ${(Math.hypot(Number(m[4]) - c[0], Number(m[5]) - c[1]) / h).toFixed(2)} h`);
  }
}
