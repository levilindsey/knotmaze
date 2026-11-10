// K1247 s15: a recording's per-frame record: the sim's maxMove (meta), the
// drawn samples' max motion from the previous frame (device px), and what
// differs in the diagram from frame 0 (chains' point counts, crossings,
// junction arms, dead ends).
//   node .claude/probes/K1240/proto/k1247s15_motion.mjs <name>
import { readFileSync, readdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const name = process.argv[2] ?? "def";
const dir = join(here, "..", "out", "s15", `rec_${name}`);
const meta = JSON.parse(readFileSync(join(dir, "meta.json"), "utf8"));
const files = readdirSync(dir).filter((f) => f.endsWith(".json.gz")).sort();
let prev = null; let s0 = null;
for (let f = 0; f < files.length; f++) {
  const s = JSON.parse(gunzipSync(readFileSync(join(dir, files[f]))).toString("utf8"));
  if (!s0) s0 = s;
  const S = s.camera.pxPerUnit * 2;
  let mv = 0; let nMv = 0; const diffs = [];
  if (prev) {
    for (let c = 0; c < s.chains.length; c++) {
      const p = s.chains[c].pts; const o = prev.chains[c]?.pts;
      if (!o || o.length !== p.length) { diffs.push(`chain ${c} pts ${o?.length / 2} -> ${p.length / 2}`); continue; }
      let m = 0; for (let i = 0; i < p.length; i += 2) m = Math.max(m, Math.hypot(p[i] - o[i], p[i + 1] - o[i + 1]));
      mv = Math.max(mv, m); if (m * S > 0.25) nMv++;
    }
  }
  if (s.crossings.length !== s0.crossings.length) diffs.push(`crossings ${s0.crossings.length} -> ${s.crossings.length}`);
  else s.crossings.forEach((x, i) => { const y = s0.crossings[i]; if (x.a.chain !== y.a.chain || x.b.chain !== y.b.chain || x.over !== y.over) diffs.push(`crossing ${i}`); });
  if (s.junctions.length !== s0.junctions.length) diffs.push(`junctions ${s0.junctions.length} -> ${s.junctions.length}`);
  else s.junctions.forEach((j, i) => { const k = s0.junctions[i]; const a = j.arms.map((x) => `${x.chain}${x.kind}${x.dir}`).join(); const b = k.arms.map((x) => `${x.chain}${x.kind}${x.dir}`).join(); if (a !== b || j.id !== k.id) diffs.push(`junction ${j.id}: ${b} -> ${a}`); });
  if (s.deadEnds.map((d) => d.chain).join() !== s0.deadEnds.map((d) => d.chain).join()) diffs.push("dead ends");
  const m = meta.frames[f];
  if (f < 70 || f % 10 === 0 || diffs.length) console.log(`${String(f).padStart(4)} ${m.phase.padEnd(7)} sim ${m.simTime.toFixed(3)} maxMove/substep ${(m.maxMove * S).toFixed(3)} px  drawn max ${(mv * S).toFixed(3)} px, chains > 0.25 px ${nMv}${diffs.length ? "  DIFF " + diffs.slice(0, 4).join("; ") : ""}`);
  prev = s;
}
