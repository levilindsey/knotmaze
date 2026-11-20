import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const t = ".claude/probes/K1479/out/dedup_test";
const f = (hash) => JSON.stringify({ cap: "x", hash, cnt: { "cut:plain": 1 }, finds: [{ kind: "cut", cls: "plain", x: 1, y: 2, px: 10 }] });
const meta = (hash) => JSON.stringify({ freeze: { ok: true, tries: 1, seen: [hash], expected: hash } });
for (const side of ["base", "ref"]) for (const sc of ["g41_user_tw42", "user_tw42.lightpaper"]) {
  mkdirSync(join(t, side, "cap", sc), { recursive: true });
  const hash = sc === "g41_user_tw42" ? "aaaaaaaa" : "bbbbbbbb";
  writeFileSync(join(t, side, `${sc}.screen.json`), f(hash));
  writeFileSync(join(t, side, "cap", sc, "meta.json"), meta(hash));
}
console.log("fixtures written");
