// K1321: form_b_fillet's dropped corners (vfail: V outside the arms' spans) per scene, and junction centres.
//   node scripts/run_node.mjs .claude/probes/K1321/k1321_vfail.ts <scene>[,<scene>...] [j<id>...]
// Prints the count per scene; with junction ids, each one's centre and its dropped corners' V.
import { buildModel, filletOf } from "../K1314/k1314_census";

const [names, ...js] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
for (const nm of names.split(",")) {
  const m = buildModel(nm);
  const f = filletOf(m) as unknown as { vfail: { ji: number; a: number; b: number; Vx: number; Vy: number; ca: number; cb: number }[] };
  console.log(`${nm}: ${f.vfail.length} dropped corners (h ${m.scene.look.halfWidth})`);
  for (const js0 of js) {
    const ji = +js0.replace(/^j/, ""); const J = m.scene.junctions[ji];
    const vs = f.vfail.filter((v) => v.ji === ji).map((v) => `V (${v.Vx.toFixed(3)},${v.Vy.toFixed(3)}) c${v.ca}/c${v.cb}`);
    console.log(`  j${ji} at (${J.c[0].toFixed(3)},${J.c[1].toFixed(3)}) ${vs.join(" ") || "no dropped corner"}`);
  }
}
