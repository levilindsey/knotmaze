// K1139 S3a offline record: the CPU mirror's band kymograph through each
// banded fan, and P1-P5 through the fan, from bands.mjs dumps. Everything
// reads by the global distance dG (drawn arc from you): an arm's value is
// its kPulseV port (kymo.mjs) at (dG - dist0); the band's is the same
// crest at dG with no end window (kPulseBandV's port). The band window is
// +-0.55 around the junction (the mock-ups' fan radius, plan 2.2).
//   node bandkymo.mjs <outDir> <stand_bands.json>...
// Writes <outDir>/band_table.json and kymo_band_<stand>.png per stand.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { encodePNG } from "./png.mjs";

// kPulseV's port and its clocks, copied from kymo.mjs (importing it
// would run its main: this file's name also ends in kymo.mjs).
const KC = {
  PULSE_END_WINDOW: 0.45, CREST_WIDTH: 0.72, CREST_RAMP: 0.5, PULSE_FLOOR: 0.38,
  PULSE_CORE_BOOST: 0.62, PULSE_CORE_RADIUS: 0.55, PULSE_FLOOR_REACH: 2.0,
  PULSE_SPEED: 1.6, PULSE_OUT_LEAD: 0.3, PULSE_REACH_FADE: 1.0,
};
const ksmooth01 = (x) => { const c = x < 0 ? 0 : x > 1 ? 1 : x; return c * c * (3 - 2 * c); };
function uniforms(t, spacing, reach, lead = KC.PULSE_OUT_LEAD) {
  const modS = (x) => x - spacing * Math.floor(x / spacing);
  return { travelIn: modS(t * KC.PULSE_SPEED), travelOut: modS((t + lead) * KC.PULSE_SPEED), s: spacing, fade: 1, reach, f: Math.min(KC.PULSE_REACH_FADE, 0.5 * reach) };
}
const kreachWin = (U, d) => 1 - ksmooth01((d - (U.reach - Math.max(U.f, 1e-4))) / Math.max(U.f, 1e-4));
function pulseV(U, d, span, inward, dist0, cont) {
  if (d < 0 || d > span) return 0;
  const dG = dist0 + d;
  const endWin = cont ? 1 : Math.min(1, Math.max(0, (span - d) / KC.PULSE_END_WINDOW));
  const s = U.s;
  const raw = inward ? dG + U.travelIn : dG - U.travelOut;
  const ph = raw - s * Math.floor(raw / s);
  const dist = Math.min(ph, s - ph);
  const dC = Math.max(0, dG - (ph <= s - ph ? ph : ph - s));
  const bump = Math.max(0, 1 - dist / KC.CREST_WIDTH) * Math.min(1, dC / KC.CREST_RAMP);
  const floor = (KC.PULSE_FLOOR + KC.PULSE_CORE_BOOST * Math.max(0, 1 - dG / KC.PULSE_CORE_RADIUS)) * Math.max(0, 1 - dG / KC.PULSE_FLOOR_REACH);
  return Math.min(1, (floor + bump * 0.9) * endWin) * U.fade * kreachWin(U, dG);
}

const OUT = resolve(process.argv[2]);
mkdirSync(OUT, { recursive: true });
const HALF = 0.55;

const bandV = (U, dG, inward) => pulseV(U, dG, 1e6, inward, 0, true);
// The crest's own bump (kPulseV's triangular term with its ramp), the
// width P4 reads: the floor glow and the reach window change the raw
// field's width with dG on plain arms too, so they are not the fan's
// to answer for.
function bumpV(U, dG, inward) {
  const s = U.s;
  const raw = inward ? dG + U.travelIn : dG - U.travelOut;
  const ph = raw - s * Math.floor(raw / s);
  const dist = Math.min(ph, s - ph);
  const dC = Math.max(0, dG - (ph <= s - ph ? ph : ph - s));
  return Math.max(0, 1 - dist / KC.CREST_WIDTH) * Math.min(1, dC / KC.CREST_RAMP);
}
const armV = (U, it, dG) => pulseV(U, dG - it.dist0, it.span, it.inward, it.dist0, it.cont);

// The crest's width at half its height above the local trough, around
// the crest nearest `center`, under value function fn(dG).
function crestWidth(U, fn, center) {
  const N = 800, W = 0.8;
  let peak = -1, pk = center, trough = Infinity;
  const vs = [];
  for (let i = 0; i <= N; i++) {
    const dG = center - W + (2 * W * i) / N;
    const v = fn(U, dG);
    vs.push([dG, v]);
    if (v < trough) trough = v;
    if (Math.abs(dG - center) < 0.4 && v > peak) { peak = v; pk = dG; }
  }
  const half = (peak + trough) / 2;
  let lo = pk, hi = pk;
  for (const [dG, v] of vs) if (dG < pk && v >= half) lo = dG;
  for (let i = vs.length - 1; i >= 0; i--) if (vs[i][0] > pk && vs[i][1] >= half) { hi = vs[i][0]; break; }
  return hi - lo;
}

const table = {};
for (const f of process.argv.slice(3)) {
  const j = JSON.parse(readFileSync(f, "utf8"));
  const items = new Map(j.pulses.map((p) => [p.edge, p]));
  const reach = j.reach, sp = j.spacing;
  const rows = [];
  const panels = [];
  for (const b of j.bands) {
    // Head-side arm H (ends at the junction) and far-side arm F (starts
    // there), whichever walk item each is, ahead of you or behind you.
    const headIt = items.get(b.aEdge), farIt = items.get(b.bEdge);
    if (!headIt || !farIt) { rows.push({ vertex: b.vertex, band: `e${b.aEdge}->e${b.bEdge}`, error: "arm item missing" }); continue; }
    const DJ = b.distJ, inward = b.inward;
    const comp = (U, dG) =>
      Math.abs(dG - DJ) <= HALF ? bandV(U, dG, inward) : dG < DJ ? armV(U, headIt, dG) : armV(U, farIt, dG);
    // P1: band meets each arm at the fan window's ends (64 clock times).
    let p1 = 0;
    for (let i = 0; i < 64; i++) {
      const U = uniforms(100 + (i / 64) * (sp / 1.6), sp, reach);
      p1 = Math.max(p1, Math.abs(bandV(U, DJ - HALF, inward) - armV(U, headIt, DJ - HALF)));
      p1 = Math.max(p1, Math.abs(bandV(U, DJ + HALF, inward) - armV(U, farIt, DJ + HALF)));
    }
    // P2: the junction's distance from both sides.
    const p2 = Math.max(
      Math.abs(DJ - (headIt.dist0 + headIt.span)),
      Math.abs(DJ - farIt.dist0)
    );
    // P3: crest peak's dG speed inside the band (fit over 1.5 periods;
    // the search window is one full spacing, so a crest is always in
    // it, and successive rows move it 0.02 - no wrap ambiguity).
    const peaks = [];
    const DT = 1 / 80, NR = Math.round(1.5 * (sp / 1.6) / DT);
    for (let r = 0; r < NR; r++) {
      const U = uniforms(100 + r * DT, sp, reach);
      let pk = DJ, pv = -1;
      for (let dG = DJ - sp / 2; dG <= DJ + sp / 2; dG += 0.005) {
        const v = bandV(U, dG, inward);
        if (v > pv) { pv = v; pk = dG; }
      }
      peaks.push([r * DT, pk]);
    }
    let slope = NaN;
    if (peaks.length > 10) {
      const ts = [], xs = [];
      let off = 0;
      for (let i = 0; i < peaks.length; i++) {
        if (i > 0) {
          const raw = peaks[i][1] + off;
          if (raw - xs[xs.length - 1] > sp / 2) off -= sp;
          else if (raw - xs[xs.length - 1] < -sp / 2) off += sp;
        }
        ts.push(peaks[i][0]); xs.push(peaks[i][1] + off);
      }
      const mt = ts.reduce((a, x) => a + x, 0) / ts.length, mx = xs.reduce((a, x) => a + x, 0) / xs.length;
      let num = 0, den = 0;
      for (let i = 0; i < ts.length; i++) { num += (ts[i] - mt) * (xs[i] - mx); den += (ts[i] - mt) ** 2; }
      slope = num / den;
    }
    // P4: crest width on the band vs on the head-side arm. tB puts a
    // crest exactly at the junction (phase 0 at dG = DJ); the arm read
    // waits until the same crest sits 1.0 of dG onto the head-side arm.
    const ph0 = ((DJ % sp) + sp) % sp;
    const tB = inward
      ? 100 + (((sp - ph0) % sp) / 1.6)
      : 100 + ((ph0 / 1.6 - 0.3 + sp / 1.6) % (sp / 1.6));
    const UB = uniforms(tB, sp, reach);
    const wBand = crestWidth(UB, (U, dG) => bumpV(U, dG, inward), DJ);
    // The same crest 0.72 further along, on the far-side arm it enters.
    const UA = uniforms(inward ? tB - 0.72 / 1.6 : tB + 0.72 / 1.6, sp, reach);
    const wArm = crestWidth(UA, (U, dG) => bumpV(U, dG, inward), DJ + 0.72);
    const p4 = wArm > 0 ? Math.abs(wBand - wArm) / wArm : NaN;
    // P5: every dG column inside the reach is swept by a crest.
    let p5min = Infinity;
    for (let dG = Math.max(0, DJ - 1.1); dG <= Math.min(reach - 0.5, DJ + 1.1); dG += 0.01) {
      let mx = 0;
      for (let i = 0; i < 64; i++) mx = Math.max(mx, comp(uniforms(100 + (i / 64) * (sp / 1.6), sp, reach), dG));
      if (mx < p5min) p5min = mx;
    }
    rows.push({
      vertex: b.vertex, band: `e${b.aEdge}->e${b.bEdge}`, distJ: +DJ.toFixed(3),
      inward, slot: b.slot, shared: b.shared, fallback: b.fallback, used: b.used,
      P1: +p1.toFixed(4), P2: +p2.toFixed(4),
      P3: Number.isFinite(slope) ? +slope.toFixed(3) : null,
      P4: Number.isFinite(p4) ? +(p4 * 100).toFixed(2) : null,
      P5min: +p5min.toFixed(4),
    });
    panels.push({ b, headIt, farIt, comp });
  }
  table[j.stand] = { head: j.head, reach, rows };
  // Kymograph: one panel per band, x = dG over distJ +- 1.1, time down.
  if (panels.length) {
    const DX = 0.01, DT = 1 / 80;
    const NR = Math.round(1.5 * (sp / 1.6) / DT), RH = 2, GUT = 8;
    const W = Math.ceil(2.2 / DX) + 1;
    const H = panels.length * NR * RH + (panels.length - 1) * GUT;
    const data = new Uint8Array(W * H * 3).fill(40);
    panels.forEach((P, pi) => {
      const y0 = pi * (NR * RH + GUT), DJ = P.b.distJ;
      for (let r = 0; r < NR; r++) {
        const U = uniforms(100 + r * DT, sp, reach);
        for (let c = 0; c < W; c++) {
          const dG = DJ - 1.1 + c * DX;
          const v = dG >= 0 ? P.comp(U, dG) : 0;
          const col = [22 + (255 - 22) * v, 30 + (255 - 30) * v, 44 + (255 - 44) * v];
          for (let k = 0; k < RH; k++) { const o = ((y0 + r * RH + k) * W + c) * 3; data[o] = col[0]; data[o + 1] = col[1]; data[o + 2] = col[2]; }
        }
      }
      const cj = Math.round(1.1 / DX);
      for (let y = y0; y < y0 + NR * RH; y++) if ((y >> 2) % 2 === 0) { const o = (y * W + cj) * 3; data[o] = 130; data[o + 1] = 150; data[o + 2] = 180; }
    });
    const outP = join(OUT, `kymo_band_${j.stand}.png`);
    writeFileSync(outP, encodePNG({ W, H, data: Buffer.from(data.buffer) }));
    console.log(`${j.stand}: ${panels.length} band panel(s) -> ${outP} (${W}x${H})`);
  }
}
writeFileSync(join(OUT, "band_table.json"), JSON.stringify(table, null, 1));
for (const [stand, s] of Object.entries(table)) {
  console.log(`${stand} (head ${s.head}, reach ${s.reach}):`);
  for (const r of s.rows) {
    if (r.error) { console.log(`  ${r.vertex} ${r.band}: ERROR ${r.error}`); continue; }
    console.log(`  ${r.vertex} ${r.band} distJ ${r.distJ} ${r.inward ? "inward" : "outward"} slot ${r.slot}${r.shared ? " shared" : ""}${r.fallback ? " FALLBACK" : ""}: P1 ${r.P1} P2 ${r.P2} P3 ${r.P3} P4 ${r.P4}% P5min ${r.P5min}`);
  }
}
