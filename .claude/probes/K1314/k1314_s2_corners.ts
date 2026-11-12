import { buildModel } from "./k1314_census";
const scenes = process.argv.slice(2);
for (const nm of scenes) {
  const m = buildModel(nm);
  let nf = 0; let ns = 0; const rows: string[] = [];
  m.table.corners.forEach((c, i) => {
    if (c.r > 1e-9) return;
    if (c.ok) ns++; else nf++;
    if (nm === "muse_hash" && (c.junction === "j103" || c.junction === "j104")) rows.push(`  ${i} ${c.junction} a${c.aChain} b${c.bChain} ok ${c.ok} th ${c.theta.toFixed(3)} V (${c.Vx.toFixed(3)},${c.Vy.toFixed(3)}) ${c.why ?? ""}`);
  });
  console.log(`${nm}: r=0 corners: ok ${ns}, failed ${nf}`); rows.forEach((r) => console.log(r));
}
