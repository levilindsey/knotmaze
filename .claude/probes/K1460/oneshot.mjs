// K1460: one frozen capture of one link: node oneshot.mjs <url> <profileDir> <out.png>
// K1460 s4: the same capture as shot.mjs (cap.mjs: the EARLY freeze, then __knotStepUntil(SIMT=20)), so both
// land on one state; prints the hash. GF=0 for a today link.
import { writeFileSync } from "node:fs";
import { launch, load } from "./cap.mjs";
const [, , url, prof, out] = process.argv;
const b = await launch(prof);
try {
  const r = await load(b, url, { tag: "one", gf: process.env.GF !== "0", simT: +(process.env.SIMT ?? 20), dsf: +(process.env.DSF ?? 2) });
  console.log("hash", r.hash, "ok", r.ok, "lost", r.lost, JSON.stringify(r.stat));
  writeFileSync(out, await r.page.screenshot({ type: "png" }));
} finally { await b.close(); }
