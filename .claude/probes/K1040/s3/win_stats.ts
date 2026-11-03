// K1040 S3b step 3: the merge scan's windows and the span walk, per scene.
// Per segment k: its window (m- + m+), the capsule quad's area against its
// slab's (the overdraw the slab clip removes), and the spans its chain walks.
// Weighted by segment length (the fragments a slab owns, about l * 2h).
//   node scripts/run_node.mjs .claude/probes/K1040/s3/win_stats.ts [scenes]
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FormB } from "../../../../src/render/field/form_b";
import { buildLabelB } from "../../../../src/render/field/label_b";
import type { FieldScene } from "../../../../src/render/field/scene";

const sceneDir = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const ALL = ["muse_hash", "muse_default_tw", "def", "fat", "ring", "user_tw42.lightpaper", "g41_def_tw42", "g41_def_tw64", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64"];
const SCENES = process.argv.length > 2 ? process.argv.slice(2) : ALL;
for (const name of SCENES) {
  const s = JSON.parse(readFileSync(join(sceneDir, `${name}.json`), "utf8")) as FieldScene;
  s.look.ctrlArc ??= 0.47;
  const fb = new FormB(s);
  const T = buildLabelB(fb);
  const h = fb.h;
  let wSum = 0; // sum of l
  let winW = 0; // sum of l * (m- + m+)
  let quad = 0; // sum of (l + 2h) * 2h
  let slab = 0; // sum of l * 2h
  let spanW = 0; // sum of l * spans walked (half the chain's spans, the mean)
  let maxWin = 0;
  const hist = new Map<number, number>();
  let nseg = 0;
  let lSum = 0;
  for (let ci = 0; ci < fb.polys.length; ci++) {
    const p = fb.polys[ci];
    const off = T.ptOff[ci];
    const nsp = T.spans[ci].length;
    for (let k = 0; k < p.nseg; k++) {
      const l = p.segLen[k];
      const w = T.nb[4 * (off + k)] + T.nb[4 * (off + k) + 1];
      wSum += l;
      winW += l * w;
      quad += (l + 2 * h) * 2 * h;
      slab += l * 2 * h;
      spanW += l * Math.min(nsp, 255) / 2;
      maxWin = Math.max(maxWin, w);
      const b = w <= 2 ? w : w <= 4 ? 4 : w <= 8 ? 8 : w <= 16 ? 16 : w <= 32 ? 32 : w <= 64 ? 64 : 999;
      hist.set(b, (hist.get(b) ?? 0) + l);
      nseg++;
      lSum += l;
    }
  }
  const hs = [...hist.entries()].sort((a, b) => a[0] - b[0]).map(([b, v]) => `<=${b}:${((100 * v) / wSum).toFixed(0)}%`).join(" ");
  console.log(`${name}: h ${h.toFixed(3)} seg l/h ${(lSum / nseg / h).toFixed(3)} | window mean ${(winW / wSum).toFixed(1)} max ${maxWin} [${hs}] | quad/slab ${(quad / slab).toFixed(1)} | spans walked ${(spanW / wSum).toFixed(1)} | foldR/h ${(T.foldR / h).toFixed(2)}`);
}
