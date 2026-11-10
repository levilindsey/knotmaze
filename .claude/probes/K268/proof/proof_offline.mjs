// K268 proof stage: re-judge saved PROOF frames (census3a.mjs's
// OUT/proofdata/<tag>.json + _S/_R/_F.png) with judge.mjs, no Chrome.
//   node proof_offline.mjs <OUT>/proofdata [tagFilter] [--img] [--far=slot]
// Prints per slot the AFTER numbers (the line-for-line ideal), BEFORE (the
// stage 3a ideal) and farOther (the far branch fed the other flags: the
// slot's, the slip before the far-flag fix, unless --far=slot).
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { decodePNG, encodePNG } from "./png.mjs";
import { judgeSlot } from "./judge.mjs";

const [, , DIR, FILTER = ""] = process.argv;
const IMG = process.argv.includes("--img");
const FAR = process.argv.includes("--far=slot") ? "slot" : "profile";
const img = (b) => { const p = decodePNG(b); return { W: p.W, H: p.H, ch: p.ch ?? p.channels ?? 4, data: p.data }; };
const tot = { px: 0, ghosts: 0, under: 0, between: 0, prot: 0, fmiss: 0, errs: [] };
for (const f of readdirSync(DIR).filter((f) => f.endsWith(".json") && f.includes(FILTER)).sort()) {
  const tag = f.slice(0, -5);
  const d = JSON.parse(readFileSync(join(DIR, f), "utf8"));
  const S = img(readFileSync(join(DIR, `${tag}_S.png`))), R = img(readFileSync(join(DIR, `${tag}_R.png`))), F = img(readFileSync(join(DIR, `${tag}_F.png`)));
  const t0 = Date.now();
  const J = judgeSlot({ S, R, F, sl: d.sl, info: d.info, x0: d.x0, y0: d.y0, look: d.look, HC: d.HC, wantImg: IMG, farFlags: FAR });
  for (const k of ["px", "ghosts", "under", "between", "prot", "fmiss"]) tot[k] += J.after[k];
  for (const e of J.errsAfter) tot.errs.push(e);
  console.log(`${tag} (${Date.now() - t0} ms) cutOnPx=${J.cutOnPx}`);
  console.log("  after      " + JSON.stringify(J.after));
  console.log("  before     " + JSON.stringify(J.before));
  console.log("  farOther   " + JSON.stringify(J.farOther));
  if (J.ghostPx.length) console.log("  ghost px   " + JSON.stringify(J.ghostPx.slice(0, 30)));
  if (J.underPx.length) console.log("  under px   " + JSON.stringify(J.underPx.slice(0, 30)));
  if (J.img) writeFileSync(join(DIR, `${tag}_offline_panels.png`), encodePNG(J.img));
}
const e = tot.errs.sort((a, b) => a - b);
const q = (x) => (e.length ? +e[Math.min(e.length - 1, Math.floor(x * e.length))].toFixed(3) : null);
delete tot.errs;
console.log("TOTAL " + JSON.stringify({ ...tot, err: { n: e.length, p50: q(0.5), p95: q(0.95), p99: q(0.99), max: q(1) } }));
