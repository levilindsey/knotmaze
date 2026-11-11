// K1283 s3: every cap piece's band middle against form B's ink: how many caps form B fades
// (mean ink below 0.9), per scene. Caps carry no alpha yet (bandData draws them at 1).
//   node scripts/run_node.mjs --config .claude/probes/K1240/proto/k1283_vite.config.mjs .claude/probes/K1240/proto/k1283s3_capcmp.ts [scene ...]
import * as O from "../../../../src/render/outline/outline";
import { FormB } from "../../../../src/render/field/form_b";
import { ALL, loadScene } from "./k1279_census";

const names = process.argv.slice(2).filter((a) => !a.startsWith("--"));
for (const nm of names.length ? names : ALL) {
  const scene = loadScene(nm);
  const table = O.frame(O.structure(scene), scene);
  const fb = new FormB(JSON.parse(JSON.stringify(scene)) as never, { dpr: 2 }) as unknown as { evalPoint(x: number, y: number): { ink: number } };
  const W = table.W;
  let caps = 0; let faded = 0; const worst: string[] = [];
  table.pieces.forEach((p, pi) => {
    if (p.kind !== "cap") return;
    const np = p.pts.length / 2; if (np < 1) return;
    caps++;
    let sum = 0; let n = 0;
    for (let i = 0; i < np; i++) {
      const x = p.pts[2 * i]; const y = p.pts[2 * i + 1];
      let dx = p.cpts[2 * i] - x; let dy = p.cpts[2 * i + 1] - y; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      sum += fb.evalPoint(x + dx * W * 0.5, y + dy * W * 0.5).ink; n++;
    }
    const m = sum / Math.max(1, n);
    if (m < 0.9) { faded++; worst.push(`cap ${pi} chain ${p.chain} (${p.pts[0].toFixed(2)}, ${p.pts[1].toFixed(2)}) np ${np} formB ink ${m.toFixed(2)}`); }
  });
  console.log(`${nm}: caps ${caps}, form B fades ${faded}${worst.length ? "; " + worst.slice(0, 4).join("; ") : ""}`);
}