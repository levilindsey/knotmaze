// K1479 Done 2: decode g41_user_tw42's and user_tw42.lightpaper's links with the app's own
// readers (parseParams for the key=value job links, decodeToken for the exported page tokens)
// and print every param that differs, so "one physics state by design" is a measured claim.
//   node scripts/run_node.mjs .claude/probes/K1479/decode_pair.ts
import { readFileSync } from "node:fs";
import { parseParams, PARAM_DEFAULTS } from "../../../src/ui/url_state.ts";
import { decodeToken } from "../../../src/ui/param_codec.ts";

const dir = new URL("../../../.claude/probes/K868/scenes/", import.meta.url);
const load = (n: string) => JSON.parse(readFileSync(new URL(`${n}.diag.json`, dir), "utf8"));
const a = load("g41_user_tw42"), b = load("user_tw42.lightpaper");

function diffParams(x: Record<string, unknown>, y: Record<string, unknown>, label: string) {
  const keys = [...new Set([...Object.keys(x), ...Object.keys(y)])].sort();
  const diffs = keys.filter((k) => JSON.stringify(x[k]) !== JSON.stringify(y[k]));
  console.log(`${label}: ${diffs.length} differing params`);
  for (const k of diffs) console.log(`  ${k}: g41_user_tw42=${JSON.stringify(x[k])} lightpaper=${JSON.stringify(y[k])}`);
  return diffs;
}

const pa = parseParams(new URL(a.job.url).search) as unknown as Record<string, unknown>;
const pb = parseParams(new URL(b.job.url).search) as unknown as Record<string, unknown>;
console.log(`job links: g41 seed=${pa.seed} lightpaper seed=${pb.seed}`);
diffParams(pa, pb, "parseParams(job.url)");

const ta = decodeToken(new URL(a.pageUrl).search.slice(1), PARAM_DEFAULTS as never);
const tb = decodeToken(new URL(b.pageUrl).search.slice(1), PARAM_DEFAULTS as never);
console.log(`page tokens: g41 seed=${ta.seed} err=${ta.error}; lightpaper seed=${tb.seed} err=${tb.error}`);
diffParams(ta.values as Record<string, unknown>, tb.values as Record<string, unknown>, "decodeToken(pageUrl)");

console.log(`diag: g41 frozenHash=${a.step.frozenHash} frozenSim=${a.step.frozenSim}; lightpaper frozenHash=${b.step.frozenHash} frozenSim=${b.step.frozenSim}`);
console.log(`substeps: g41=${Math.round(a.step.frozenSim * 120)} lightpaper=${Math.round(b.step.frozenSim * 120)}`);
