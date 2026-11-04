// K1040 S3c: spans per chain and per segment-length, to size the tent FS's span walk.
//   node scripts/run_node.mjs .claude/probes/K1040/s3/span_stats.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FormB } from "../../../../src/render/field/form_b";
import type { FieldScene } from "../../../../src/render/field/scene";
import { buildLabelB } from "../../../../src/render/field/label_b";
const sceneDir = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const SCENES = ["muse_hash", "muse_default_tw", "def", "fat", "ring", "user_tw42.lightpaper", "g41_def_tw42", "g41_def_tw64", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64"];
for (const name of SCENES) {
  const s = JSON.parse(readFileSync(join(sceneDir, `${name}.json`), "utf8")) as FieldScene;
  s.look.ctrlArc ??= 0.47;
  const fb = new FormB(s, { dpr: 2 });
  const T = buildLabelB(fb);
  const ns = T.spans.map((x) => x.length);
  // walk length per segment = index of the span holding the segment's start s (+1)
  let tot = 0, mx = 0, segs = 0, multi = 0;
  fb.polys.forEach((p, ci) => {
    const sp = T.spans[ci];
    for (let k = 0; k < p.nseg; k++) {
      let i = 0;
      while (i + 1 < sp.length && sp[i + 1].lo <= p.s[k]) i++;
      tot += i + 1; mx = Math.max(mx, i + 1); segs++;
      const kb = k + 1 === p.n ? 0 : k + 1;
      const sb = kb === 0 ? p.s0 + p.len : p.s[kb];
      let j = i; while (j + 1 < sp.length && sp[j + 1].lo <= sb) j++;
      if (j > i) multi++;
    }
  });
  console.log(`${name.padEnd(22)} chains ${T.nChains} open ${fb.polys.filter((p) => !p.closed).length} spans/chain max ${Math.max(...ns)} sum ${ns.reduce((a, b) => a + b, 0)} walk mean ${(tot / segs).toFixed(2)} max ${mx}; segs crossing a span switch ${multi}`);
}
