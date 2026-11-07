import { readFileSync } from "node:fs";
import { FormB } from "../../../../src/render/field/form_b";
const scene = JSON.parse(readFileSync("C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/def.json", "utf8"));
scene.look.ctrlArc ??= 0.47;
const fb = new FormB(scene, { dpr: 2 }) as any;
const pts = process.argv.slice(2).map((s) => s.split(",").map(Number));
for (const [x, y] of pts) {
  const buf: any[] = []; fb.pieces(x, y, buf);
  console.log(`(${x},${y}) h=${fb.h.toFixed(3)}`);
  for (const pc of buf) console.log(`  piece chain ${pc.chain ?? pc.c ?? pc.ci} surf ${pc.surf} key ${pc.key?.toFixed?.(3) ?? pc.key} d ${(pc.d / fb.h).toFixed(2)}h kind ${pc.kind ?? ""} ${Object.keys(pc).join("/")}`);
  const surfs = [...new Set(buf.map((p) => p.surf))];
  for (const ci of fb.cornersNear(x, y)) { const g = fb.corners[ci].g; if (!surfs.includes(g)) surfs.push(g); }
  for (const s of surfs) { const io = fb.inkOf(s, x, y, buf); console.log(`  surf ${s}: a ${io.a?.toFixed(3)} v ${io.v?.toFixed(3)} Dexp ${(io.Dexp / fb.h).toFixed(3)}h`); }
}
