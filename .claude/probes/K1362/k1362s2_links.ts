// K1362 s2: today's links for the 12 census scenes, from each scene's captured
// params (K868 scenes/<name>.diag.json) and the seed of its source url.
import { readFileSync } from "node:fs";
import { encodeParams, paramsFromValues, seedFromText } from "../../../src/ui/url_state";
const dir = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const names = ["muse_hash", "g41_def_tw42", "g41_ring_tw64", "user_tw42.lightpaper", "def", "fat", "g41_def_tw64", "g41_user_tw42", "muse_default_tw", "ring", "g41_ring_tw42", "g41_user_tw64"];
const out: Record<string, string> = {};
for (const n of names) {
  const d = JSON.parse(readFileSync(`${dir}/${n}.diag.json`, "utf8"));
  const url = new URL(d.pageUrl ?? JSON.parse(readFileSync(`${dir}/${n}.json`, "utf8")).source.url);
  const seed = seedFromText(url.search.slice(1).split(".")[0])!;
  out[n] = encodeParams(paramsFromValues(seed, d.params));
}
console.log(JSON.stringify(out));
