import { structure, frame } from "./outline";
import { loadScene } from "./k1279_census";
import { fillResolution, fillStructure } from "./fill_tri";
const scene = loadScene(process.argv[2] ?? "def");
const st = structure(scene); const t = frame(st, scene);
const fs = fillStructure(st, fillResolution(st, t));
console.log(t.diagnostics.slice(0, 8).join("\n"));
for (const it of fs.items) {
  if (it.kind === "strip") { const L = t.pieces[it.pL]; const R = t.pieces[it.pR]; if (!L || !R || L.pts.length < 2 || R.pts.length < 2) console.log(`strip iv ${it.iv} ghost ${it.ghost} pi ${it.pi} L ${L?.pts.length} R ${R?.pts.length} s ${L?.s0}..${L?.s1} st ${JSON.stringify(st.stationsD[st.intervalsD[it.iv].aSt])} ${JSON.stringify(st.stationsD[st.intervalsD[it.iv].bSt])}`); }
  if (it.kind === "cap") { const p = t.pieces[it.piece]; if (!p || p.pts.length < 2) console.log(`cap ${it.piece} n ${p?.pts.length}`); }
  if (it.kind === "junc") for (const a of it.arms) { const P = t.pieces[a.pP]; const N = t.pieces[a.pN]; if (!P || !N || P.pts.length < 2 || N.pts.length < 2) console.log(`junc ${it.ji} arm ${a.ai} P ${P?.pts.length} N ${N?.pts.length}`); }
}
