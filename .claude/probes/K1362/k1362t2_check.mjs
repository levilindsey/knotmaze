import { readFileSync } from "node:fs";
import { join } from "node:path";
const dir = join(process.env.TEMP, "k1362t2bench");
for (const s of ["verify", "before", "after", "nopool"]) {
  const d = JSON.parse(readFileSync(join(dir, `${s}.json`), "utf8"));
  for (const r of d.runs) {
    const gf = (r.drag && r.drag.gf) || (r.rest && r.rest.gf) || {};
    console.log(s, r.url.split("?")[1].slice(0, 24), "errors:", JSON.stringify(r.errors ?? []).slice(0, 160));
    console.log("   gf keys:", JSON.stringify({ worker: gf.worker, rebuilds: gf.rebuilds, verified: gf.verified, mismatch: gf.mismatch, fallback: gf.fallback, pool: gf.pool, workP50: gf.workMs?.p50, workP90: gf.workMs?.p95, mainP50: gf.mainPerRebuild?.p50 }).slice(0, 300));
  }
}
// verify logs
import { existsSync } from "node:fs";
for (const s of ["verify"]) {
  const log = readFileSync(join(dir, `${s}.log`), "utf8");
  console.log(s, "log tail:", log.slice(-500));
}
