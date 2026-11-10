// K268 proof stage: where does the far branch (EXPLORE_FAR_GLSL) run, and
// would its flags matter? Over EVERY pixel of each saved PROOF clip
// (census3a.mjs's OUT/proofdata), the ideal as drawn (the far branch's
// exploreCutCover fed the SLOT's flags, `fl`) against the far branch fed the
// PROFILE's flags (texel 24.y, as the near call reads them).
//   node far_scan.mjs <OUT>/proofdata [tagFilter]
// far = pixels where the far blend runs; farVisible = those where the full
// cut moves the frame (|F - R| >= 48, the census's judged set);
// profileDiffers = pixels where the two flag readings differ by > 0.01.
// Proof stage result (2026-11-10, desktop, four frames): the far branch runs
// in most clips, the flags differ by up to 1.0, but never on a judged pixel.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { slotModel, idealM } from "./ideal.mjs";
import { rowF } from "./judge.mjs";
import { decodePNG } from "./png.mjs";

const [, , DIR, FILTER = ""] = process.argv;
const img = (b) => { const p = decodePNG(b); return { W: p.W, H: p.H, ch: p.ch ?? p.channels ?? 4, data: p.data }; };
const tot = { clips: 0, far: 0, farVisible: 0, profileDiffers: 0, profileDiffersVisible: 0 };
for (const f of readdirSync(DIR).filter((f) => f.endsWith(".json") && f.includes(FILTER)).sort()) {
  const tag = f.slice(0, -5);
  const d = JSON.parse(readFileSync(join(DIR, f), "utf8"));
  const S = img(readFileSync(join(DIR, `${tag}_S.png`))), R = img(readFileSync(join(DIR, `${tag}_R.png`))), F = img(readFileSync(join(DIR, `${tag}_F.png`)));
  const { sl, info, x0, y0, look, HC } = d;
  const U = info.U || [HC ? 2 : 1, look, 1, info.tw];
  const dump = { T: sl.T, overPts: sl.overPts, under: sl.under, U };
  const smS = slotModel({ ...dump, farFlags: "slot" });
  const smP = slotModel({ ...dump, farFlags: "profile" });
  const smF = slotModel({ ...dump, T: rowF(sl.T, sl.solved) });
  const pxW = 1 / info.v.s;
  const W = S.W, H = S.H;
  let far = 0, farVis = 0, diff = 0, diffVis = 0, maxD = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const wp = [(x0 + x + 0.5 - info.v.x) / info.v.s, (y0 + y + 0.5 - info.v.y) / info.v.s];
    const a = idealM(smS, wp, pxW, smF);
    if (!a.far) continue;
    far++;
    const i = (y * W + x) * S.ch;
    let step = 0;
    for (let q = 0; q < 3; q++) step = Math.max(step, Math.abs(F.data[i + q] - R.data[i + q]));
    const vis = step >= 48;
    if (vis) farVis++;
    const b = idealM(smP, wp, pxW, smF);
    const dd = Math.abs((a.m ?? 0) - (b.m ?? 0));
    if (dd > 0.01) { diff++; if (vis) diffVis++; maxD = Math.max(maxD, dd); }
  }
  tot.clips++; tot.far += far; tot.farVisible += farVis; tot.profileDiffers += diff; tot.profileDiffersVisible += diffVis;
  console.log(`${tag} slotFlags=${Math.round(sl.T[15])} profileFlags=${Math.round(sl.T[24 * 4 + 1])} clip=${W}x${H} far=${far} farVisible=${farVis} profileDiffers=${diff} (visible ${diffVis}, max ${maxD.toFixed(3)})`);
}
console.log("TOTAL " + JSON.stringify(tot));
