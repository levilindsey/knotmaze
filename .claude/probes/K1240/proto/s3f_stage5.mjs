// S3f stage 5: a diagram station the frame builder did not create
// (an arm with no corner, so no junction station) gets a synthesized
// frame ref on its own border at the feature's frame s, instead of
// collapsing every run that touches it to one point.
import { readFileSync, writeFileSync } from "node:fs";
const target = ".claude/probes/K1240/proto/outline.ts";
let text = readFileSync(target, "utf8").replace(/\r\n/g, "\n");
function once(find, replace, label) {
  const n = text.split(find).length - 1;
  if (n !== 1) { console.error(label + ": found " + n); process.exit(1); }
  text = text.replace(find, replace);
}
once("        const stA = stationByKey.get(keyA); const stB = stationByKey.get(keyB);",
`        const synthStation = (dgs: DiagramStation): Station => {
          const p = polys[dgs.pi];
          let sF = p.s0;
          if (dgs.kind === "cross" || dgs.kind === "crossOver") { const cp = crossPt[dgs.crossing]; if (cp) sF = dgs.pi === cp.under ? cp.sUnder : cp.sOver; }
          else if (dgs.kind === "junction") { const a = arms[dgs.arm]; if (a) sF = a.sR; }
          else if (dgs.kind === "capEnd") sF = p.s0 + p.len;
          const mk = (sideW: number): PtRef => {
            const bp = borderPointAt(dgs.pi, sideW, sF);
            const B = borders[dgs.pi][bIdx(sideW)];
            let best = 0; let bd = Infinity;
            for (let i = 0; i < B.pts.length; i++) { const d = Math.hypot(B.pts[i].x - bp.x, B.pts[i].y - bp.y); if (d < bd) { bd = d; best = i; } }
            return { pi: dgs.pi, side: sideW, x: bp.x, y: bp.y, s: B.pts[best] ? B.pts[best].s : sF, idx: best };
          };
          return { pi: dgs.pi, cS: sF, left: mk(1), right: mk(-1), kind: dgs.kind, key: dgs.key };
        };
        let stA = stationByKey.get(keyA); if (!stA) stA = synthStation(dg.stationsD[ivD.aSt]);
        let stB = stationByKey.get(keyB); if (!stB) stB = synthStation(dg.stationsD[ivD.bSt]);`, "synth station");
writeFileSync(target, text.replace(/\n/g, "\r\n"));
console.log("stage5 applied");
