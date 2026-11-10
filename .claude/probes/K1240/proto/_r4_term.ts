// K1240 r4 scratch: form B's terms along a crop row (which term draws a black border).
//   node scripts/run_node.mjs .claude/probes/K1240/proto/_r4_term.ts <scene> <cx> <cy> <cropH> <py> <px0> <px1>
import { readFileSync } from "node:fs";
import { FormB } from "../../../../src/render/field/form_b";
const [name, cxS, cyS, cropS, pyS, p0S, p1S] = process.argv.slice(2);
const scene = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/${name}.json`, "utf8"));
scene.look.ctrlArc ??= 0.47;
const fb = new FormB(scene as never, { dpr: 2 }) as any;
const h = scene.look.halfWidth; const T = 300; const S = T / (Number(cropS) * h);
const cx = Number(cxS); const cy = Number(cyS);
const x0 = cx - T / (2 * S); const y0 = cy - T / (2 * S);
const py = Number(pyS);
const ids = scene.chains.map((c: any) => c.id);
for (let px = Number(p0S); px <= Number(p1S); px++) {
  const x = x0 + (px + 0.5) / S; const y = y0 + (py + 0.5) / S;
  const ev = fb.evalPoint(x, y);
  const buf: any[] = []; fb.pieces(x, y, buf);
  const surfs: number[] = []; for (const pc of buf) if (!surfs.includes(pc.surf)) surfs.push(pc.surf);
  const parts = surfs.map((s) => { const io = fb.inkOf(s, x, y, buf); const t = io.term; return `S${s}:v${io.v.toFixed(2)} Dx${(io.Dexp * 1).toFixed(3)} a${io.a.toFixed(2)} ${t ? `${["?", "foot", "ta", "tb", "V", "arc"][t.kind] ?? t.kind} ch${t.chain >= 0 ? ids[t.chain] : -1} s${t.s.toFixed(3)} D${t.D.toFixed(3)} w${t.w.toFixed(2)}` : "-"}`; });
  const pcs = buf.map((pc: any) => `ch${ids[pc.chain]} s${pc.s.toFixed(2)} d${pc.d.toFixed(3)} S${pc.surf} sw${pc.selfW.toFixed(2)} key${pc.key.toFixed(3)}`).join(" ; ");
  console.log(`px${px} (${x.toFixed(3)},${y.toFixed(3)}) top${ev.top} ink${ev.ink.toFixed(2)} fade${ev.fade} | ${parts.join(" | ")} || ${pcs}`);
}
