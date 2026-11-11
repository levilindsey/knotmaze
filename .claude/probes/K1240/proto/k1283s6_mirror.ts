// K1283 s6: the fallback builder (buildOutlineFull with a structure) vs the fast frame: fold cuts and the table's arrays.
import * as O from "../../../../src/render/outline/outline";
import { loadScene } from "./k1279_census";
for (const nm of process.argv.slice(2)) {
  const sc = loadScene(nm); const st = O.structure(sc);
  const fa = O.frame(st, sc) as unknown as Record<string, unknown>;
  const fb = O.buildOutlineFull(sc, st).table as unknown as Record<string, unknown>;
  const folds = (t: Record<string, unknown>): string[] => (t.diagnostics as string[]).filter((d) => d.startsWith("fold"));
  console.log(`${nm}: folds fast ${folds(fa).length} builder ${folds(fb).length}; same first 20: ${JSON.stringify(folds(fa)) === JSON.stringify(folds(fb))}`);
  for (const k of Object.keys(fa)) {
    const a = fa[k]; const b = fb[k];
    if (Array.isArray(a) && Array.isArray(b)) {
      const ja = JSON.stringify(a); const jb = JSON.stringify(b);
      console.log(`  ${k}: n ${a.length} vs ${b.length}${ja === jb ? " same" : ""}`);
    }
  }
}
// Numeric difference of the pieces, piece by piece (flattened numbers).
{
  const nm = process.argv[2]; const sc = loadScene(nm); const st = O.structure(sc);
  const fa = O.frame(st, sc); const fb = O.buildOutlineFull(sc, st).table;
  const flat = (o: unknown, out: number[]): number[] => { if (typeof o === "number") out.push(o); else if (Array.isArray(o)) for (const v of o) flat(v, out); else if (o && typeof o === "object") for (const v of Object.values(o)) flat(v, out); return out; };
  let worst = 0; let nDiff = 0; let nLen = 0; let wi = -1;
  fa.pieces.forEach((p, i) => { const a = flat(p, []); const b = flat(fb.pieces[i], []); if (a.length !== b.length) { nLen++; return; } let m = 0; for (let k = 0; k < a.length; k++) m = Math.max(m, Math.abs(a[k] - b[k])); if (m > 1e-6) nDiff++; if (m > worst) { worst = m; wi = i; } });
  console.log(`pieces: ${nLen} differ in length, ${nDiff} differ by > 1e-6, worst ${worst.toExponential(2)} at ${wi}`);
}
