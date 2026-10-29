// K1040 S1d: per scene, how many corners the overlap gate ω turns off (0) or
// fades (0 < ω < 1), under the committed form B (form_b_head.ts, see
// corner_ab.ts) and the working tree's, and how many of the faded ones sit
// where the margin gate bound r (r < r0).
// Run: npx vite-node .claude/probes/K1040/s1/omega_census.ts > out/s1d/omega_census_<tag>.txt
import { readFileSync } from "node:fs";
import type { FieldScene } from "../../../../src/render/field/scene";
import { FormB } from "../../../../src/render/field/form_b";
import { FormB as FormBHead } from "./form_b_head";

const names = ["muse_hash", "muse_default_tw", "def", "fat", "ring", "user_tw42.lightpaper", "g41_def_tw42", "g41_def_tw64", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64"];
const tot = { head: [0, 0, 0, 0], src: [0, 0, 0, 0] };
for (const n of names) {
  const s = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/${n}.json`, "utf8")) as FieldScene;
  s.look.ctrlArc ??= 0.47;
  const row: string[] = [];
  for (const [tag, fb] of [
    ["head", new FormBHead(s)],
    ["src", new FormB(s)],
  ] as const) {
    const cs = fb.corners as unknown as { omega: number; r: number; r0: number }[];
    const off = cs.filter((c) => c.omega <= 0).length;
    const part = cs.filter((c) => c.omega > 0 && c.omega < 1);
    const bound = part.filter((c) => c.r < c.r0 - 1e-9).length;
    const t = tot[tag];
    t[0] += cs.length;
    t[1] += off;
    t[2] += part.length;
    t[3] += bound;
    row.push(`${tag} ${cs.length} corners, ω 0 on ${off}, partial on ${part.length} (r bound on ${bound})`);
  }
  console.log(`${n}: ${row.join("; ")}`);
}
console.log(`all: head ${tot.head.join("/")}; src ${tot.src.join("/")} (corners/off/partial/bound)`);
