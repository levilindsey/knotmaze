// K1460: fade.mjs's frozen-state captures, nothing measured. Saves <outDir>/shot_<tag>_<fl>.png per
// (mode, fl) and prints each load's physics hash. With HASH=<h>, a load whose hash differs is retried (up to
// TRIES) so every shot shows the same state; a load that lost its WebGL context or timed out is retried too.
// K1460 s4: the capture itself is cap.mjs (shared with oneshot.mjs): --disable-gpu-watchdog, the EARLY freeze
// then __knotStepUntil(SIMT), a redraw wait that times out. WARM=1 first warms this profile on the gf link
// (and gfh's when a gfh job is listed): one profile per build, reused.
//
//   node .claude/probes/K1460/shot.mjs <base> <outDir> <profileDir> "<mode>:<fl>[:tag],..." [extra query]
//     mode = today | gf | gfh; env SIMT=20 DSF=2 HASH= TRIES=6 WARM=0 Q=3
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { launch, load, warm } from "./cap.mjs";
const [, , base, outDir, profileDir, jobArg, extra = ""] = process.argv;
const SIMT = +(process.env.SIMT ?? 20), DSF = +(process.env.DSF ?? 2), TRIES = +(process.env.TRIES ?? 6);
let want = process.env.HASH ?? "";
mkdirSync(outDir, { recursive: true });
const Q = process.env.Q ?? "3"; // K1460 s5: the link's token (Q=3.FGH1HtvQeDjm6e4BII)
const linkOf = (mode, fl) => `${base}/?${Q}&xp=off&am=instant&prp=off&phw=0&fw=0&bg=none&snd=none&fl=${fl}` +
  (mode === "gf" ? "&rp=gf" : mode === "gfh" ? "&rp=gf&gfh=1" : "") + extra;
const browser = await launch(profileDir);
try {
  const jobs = jobArg.split(",").map((j) => j.split(":"));
  if (process.env.WARM === "1") {
    for (const m of ["gf", "gfh"]) if (jobs.some(([mode]) => mode === m)) {
      const w = await warm(browser, linkOf(m, 0.5));
      console.log(`[warm ${m}] ${w.ok ? "ok" : "NOT WARM"} after ${w.secs.toFixed(0)} s ${JSON.stringify(w.s)}`);
    }
  }
  for (const [mode, fl, tag = mode] of jobs) {
    let r = null;
    for (let t = 0; t < TRIES; t++) {
      r = await load(browser, linkOf(mode, fl), { tag: `${tag} ${fl}`, gf: mode !== "today", simT: SIMT, dsf: DSF });
      const h = r.hash.split(" ")[0];
      if (!want && r.ok) want = h;
      if (r.ok && h === want) break;
      console.log(`[${tag} ${fl}] retry: ok=${r.ok} lost=${r.lost} hash ${r.hash} (want ${want}) ${JSON.stringify(r.stat)}`);
      await r.page.close();
      r = null;
    }
    if (!r) { console.log(`[${tag} ${fl}] no good same-state load`); continue; }
    writeFileSync(join(outDir, `shot_${tag}_${fl}.png`), await r.page.screenshot({ type: "png" }));
    console.log(`[${tag} ${fl}] hash ${r.hash} lost ${r.lost}`);
    await r.page.close();
  }
} finally { await browser.close(); }
