// K1210 (batch 22 Run H): kymographs, fronts and the four measures from
// cross.mjs's frame sets. Route coordinate u: world distance from the
// junction along the route (negative on the arm in, positive on the arm
// out). Front: the halfway luma crossing (fire/collapse: the first
// dark->bright crossing scanning in->out, the burnt/collapsed side being
// thread-gone dark; pulse: the crest's leading bright->dark crossing).
// The fan footprint is |u| <= 0.6 world (a disc of that radius for pops
// and the fan mean). Writes out/kymo/*.png + *.csv, out/measures.json
// and out/measures.md.
//   node analyse.mjs
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { decodePNG, encodePNG, toRGB } from "./png.mjs";

const FR = join(import.meta.dirname, "out", "frames");
const KY = join(import.meta.dirname, "out", "kymo");
mkdirSync(KY, { recursive: true });
const DSF = 1.5, FAN_R = 0.6;
const lum = (img, x, y) => {
  x = Math.min(img.W - 1, Math.max(0, Math.round(x))); y = Math.min(img.H - 1, Math.max(0, Math.round(y)));
  const k = (y * img.W + x) * 3;
  return 0.2126 * img.data[k] + 0.7152 * img.data[k + 1] + 0.0722 * img.data[k + 2];
};
const pct = (v, p) => { const s = [...v].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.max(0, Math.floor(p * s.length)))]; };
const median = (v) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : NaN; };

function loadSet(stand, effect) {
  const meta = JSON.parse(readFileSync(join(FR, `${stand}_${effect}.json`), "utf8"));
  const imgs = meta.frames.map((f) => toRGB(decodePNG(readFileSync(join(FR, f.file)))));
  return { meta, imgs };
}
const lumG = (img, x, y) => {
  x = Math.min(img.W - 1, Math.max(0, Math.round(x))); y = Math.min(img.H - 1, Math.max(0, Math.round(y)));
  return img.data[(y * img.W + x) * 3 + 1];
};

// Route samples in frame-0 device px with their u (world from J).
function routeOf(meta, inEid, outEid) {
  const g = meta.geom, ox = meta.clip.x, oy = meta.clip.y;
  const dev = (p) => [(p.x - ox) * DSF, (p.y - oy) * DSF];
  const arm = (eid) => g.arms.find((a) => a.eid === eid);
  const ain = arm(inEid), aout = arm(outEid);
  const pts = [];
  for (let i = ain.samples.length - 1; i >= 0; i--) { const p = ain.samples[i]; if (p.s < 0.35 && i !== ain.samples.length - 1) continue; const [x, y] = dev(p); pts.push({ x, y, u: -p.s }); }
  const [jx, jy] = dev(g.js); pts.push({ x: jx, y: jy, u: 0 });
  for (const p of aout.samples) { if (p.s < 0.35) continue; const [x, y] = dev(p); pts.push({ x, y, u: p.s }); }
  // Resample at ~1 device px along the polyline.
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], L = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(1, Math.round(L));
    for (let j = 1; j <= n; j++) out.push({ x: a.x + ((b.x - a.x) * j) / n, y: a.y + ((b.y - a.y) * j) / n, u: a.u + ((b.u - a.u) * j) / n });
  }
  return { pts: out, jDev: [jx, jy] };
}

// Fronts from frame-to-frame change: the leading edge (largest u) of the
// samples that changed by >24 luma since the previous frame. Static
// crossings, section-colour steps and the ember band's brightness cannot
// capture it, and a constant offset cancels in every advance. Frame 0 is
// seeded (fire/collapse: the clock's own reading; pulse: the crest's
// leading edge by prominence over a rolling median).
function trackFronts(profiles, us, effect, init) {
  const med = (v) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
  const at = (prof, a, b) => prof.filter((_, i) => us[i] >= a && us[i] <= b);
  let prev = init;
  if (effect === "pulse" && !Number.isFinite(prev)) {
    const prof = profiles[0];
    const prom = prof.map((v, i) => v - med(prof.slice(Math.max(0, i - 20), Math.min(prof.length, i + 21))));
    // The crest nearest the fan on its approach side (the train holds a
    // crest every spacing, so pick by position, not by brightness).
    let pk = -1, best = -1;
    prof.forEach((_, i) => { if (us[i] > -2.2 && us[i] < -0.2 && prom[i] > best) { best = prom[i]; pk = i; } });
    if (pk < 0) prof.forEach((_, i) => { if (Math.abs(us[i] + 0.8) < 1.4 && prom[i] > best) { best = prom[i]; pk = i; } });
    const lo = med(at(prof, us[pk] + 0.8, us[pk] + 1.6)), mid = (prof[pk] + lo) / 2;
    prev = us[pk];
    for (let i = pk + 1; i < prof.length; i++) if (prof[i - 1] > mid && prof[i] <= mid) { prev = us[i - 1] + ((prof[i - 1] - mid) / (prof[i - 1] - prof[i])) * (us[i] - us[i - 1]); break; }
  }
  if (effect === "pulse") {
    // Track the crest peak on debug-5 G (centroid over the samples above
    // 80% of the local max); the front is the leading edge, peak + 0.36.
    let pk = prev - 0.36;
    return profiles.map((prof, k) => {
      let bi = -1, bv = -1;
      prof.forEach((v, i) => { if (us[i] > pk - 0.18 && us[i] < pk + 0.38 && v > bv) { bv = v; bi = i; } });
      if (bi >= 0) {
        let s = 0, w = 0;
        prof.forEach((v, i) => { if (Math.abs(us[i] - us[bi]) < 0.2 && v > 0.8 * bv) { s += us[i] * v; w += v; } });
        if (w > 0) pk = s / w;
      }
      return { u: pk + 0.36 };
    });
  }
  return profiles.map((prof, k) => {
    if (k === 0) return { u: prev };
    let u = NaN;
    for (let i = 0; i < prof.length; i++) if (Math.abs(prof[i] - profiles[k - 1][i]) > 24 && us[i] >= prev - 0.35 && us[i] <= prev + 0.45) u = us[i];
    if (Number.isFinite(u)) prev = u;
    return { u };
  });
}

function analyseRoute(stand, effect, inEid, outEid, set, frontSet) {
  const { meta, imgs } = set;
  const { pts, jDev } = routeOf(meta, inEid, outEid);
  const us = pts.map((p) => p.u);
  const RfPx = FAN_R * meta.geom.ppw * DSF;
  const sample = frontSet && frontSet !== set ? lumG : lum;
  const profiles = [], fanMean = [], armInMean = [], armOutMean = [];
  (frontSet ?? set).imgs.forEach((img, k) => {
    const f = (frontSet ?? set).meta.frames[k];
    const sh = f.jsNow ? [(f.jsNow.x - meta.geom.js.x) * DSF, (f.jsNow.y - meta.geom.js.y) * DSF] : [0, 0];
    profiles.push(pts.map((p) => sample(img, p.x + sh[0], p.y + sh[1])));
  });
  imgs.forEach((img, k) => {
    const f = meta.frames[k];
    const sh = f.jsNow ? [(f.jsNow.x - meta.geom.js.x) * DSF, (f.jsNow.y - meta.geom.js.y) * DSF] : [0, 0];
    const prof = pts.map((p) => lum(img, p.x + sh[0], p.y + sh[1]));
    // Fan disc mean and the arm strips beside it (route samples).
    let s = 0, n = 0;
    for (let y = -RfPx; y <= RfPx; y += 3) for (let x = -RfPx; x <= RfPx; x += 3) if (x * x + y * y <= RfPx * RfPx) { s += lum(img, jDev[0] + sh[0] + x, jDev[1] + sh[1] + y); n++; }
    fanMean.push(s / n);
    const strip = (a, b) => { const v = prof.filter((_, i) => us[i] >= a && us[i] <= b); return v.reduce((x, y) => x + y, 0) / Math.max(1, v.length); };
    armInMean.push(strip(-1.4, -0.7)); armOutMean.push(strip(0.7, 1.4));
  });
  // Pops inside the fan footprint (frame aligned on J).
  let pops = 0; const popFrames = [];
  for (let k = 1; k < imgs.length; k++) {
    const a = imgs[k - 1], b = imgs[k];
    const shA = meta.frames[k - 1].jsNow ? [(meta.frames[k - 1].jsNow.x - meta.geom.js.x) * DSF, (meta.frames[k - 1].jsNow.y - meta.geom.js.y) * DSF] : [0, 0];
    const shB = meta.frames[k].jsNow ? [(meta.frames[k].jsNow.x - meta.geom.js.x) * DSF, (meta.frames[k].jsNow.y - meta.geom.js.y) * DSF] : [0, 0];
    let cnt = 0;
    for (let y = -RfPx; y <= RfPx; y += 2) for (let x = -RfPx; x <= RfPx; x += 2) {
      if (x * x + y * y > RfPx * RfPx) continue;
      if (Math.abs(lum(b, jDev[0] + shB[0] + x, jDev[1] + shB[1] + y) - lum(a, jDev[0] + shA[0] + x, jDev[1] + shA[1] + y)) > 32) cnt++;
    }
    if (cnt > 16) { pops++; popFrames.push(k); }
  }
  // Pulse seeds: the crest centre at dG = travelOut(100) + n*spacing
  // (travelOut = (100+0.3)*1.6 mod 2.5 = 0.48) on the route's dG scale
  // (discover.json's dist0/world), the leading edge 0.36 past the centre,
  // choosing the crest approaching the fan.
  const PULSE_SEED = { "S3:210-209": -1.91, "S3:39-209": -0.55, "S4:176-135": -1.45, "S4:176-134": -1.45, "S4:176-175": -1.45 };
  const init = effect === "fire" ? meta.frames[0].R - meta.dJ : effect === "collapse" ? meta.frames[0].clock : PULSE_SEED[`${stand}:${inEid}-${outEid}`] ?? NaN;
  const fronts = trackFronts(profiles, us, effect, init);
  const fuRaw = fronts.map((f) => f.u);
  // Interpolate frames whose front had no contrast (the two fire fronts
  // meeting on a two-ended arm); count them in the report.
  const fu = [...fuRaw];
  for (let i = 0; i < fu.length; i++) {
    if (Number.isFinite(fu[i])) continue;
    let a = i - 1; while (a >= 0 && !Number.isFinite(fu[a])) a--;
    let b = i + 1; while (b < fu.length && !Number.isFinite(fu[b])) b++;
    fu[i] = a >= 0 && b < fu.length ? fu[a] + ((fu[b] - fu[a]) * (i - a)) / (b - a) : a >= 0 ? fu[a] : b < fu.length ? fu[b] : NaN;
  }
  const nInterp = fuRaw.filter((u) => !Number.isFinite(u)).length;
  for (let i = 1; i < fu.length; i++) if (fu[i] < fu[i - 1]) fu[i] = fu[i - 1]; // fronts never retreat
  const adv = fu.slice(1).map((u, i) => u - fu[i]);
  const armAdv = adv.filter((a, i) => Math.abs((fu[i] + fu[i + 1]) / 2) > FAN_R && a > 0.004);
  const med = median(armAdv.filter(Number.isFinite));
  const fanAdv = adv.filter((_, i) => Math.abs((fu[i] + fu[i + 1]) / 2) <= FAN_R);
  const jump = fanAdv.length && med > 0 ? Math.max(...fanAdv) / med : NaN;
  const crossT = (target) => {
    for (let i = 1; i < fu.length; i++) if ((fu[i - 1] - target) * (fu[i] - target) <= 0 && fu[i] !== fu[i - 1]) return i - 1 + (target - fu[i - 1]) / (fu[i] - fu[i - 1]);
    // Past the last frame: extrapolate at the median of the last advances.
    const tail = fu.slice(-6).slice(1).map((u, i) => u - fu[fu.length - 6 + i]).filter((a) => a > 0.004);
    if (tail.length && fu[fu.length - 1] < target) return fu.length - 1 + (target - fu[fu.length - 1]) / median(tail);
    return NaN;
  };
  const lag = crossT(FAN_R) - crossT(-FAN_R) - 2 * FAN_R / med;
  const dimFrames = fanMean.map((m, k) => (m < Math.min(armInMean[k], armOutMean[k]) - 2 ? k : -1)).filter((k) => k >= 0);
  const brightFrames = fanMean.map((m, k) => (m > Math.max(armInMean[k], armOutMean[k]) + 2 ? k : -1)).filter((k) => k >= 0);
  // Kymograph PNG (luma, front dotted red) + CSV.
  const W = profiles[0].length, H = profiles.length * 2;
  const data = Buffer.alloc(W * H * 3);
  profiles.forEach((prof, k) => {
    for (let i = 0; i < W; i++) for (let r = 0; r < 2; r++) { const o = ((2 * k + r) * W + i) * 3, v = Math.max(0, Math.min(255, Math.round(prof[i]))); data[o] = v; data[o + 1] = v; data[o + 2] = v; }
    const fi = us.findIndex((u) => u >= fu[k]);
    if (fi > 0) for (let r = 0; r < 2; r++) { const o = ((2 * k + r) * W + fi) * 3; data[o] = 255; data[o + 1] = 40; data[o + 2] = 40; }
  });
  const kname = `${stand}_${effect}_e${inEid}-e${outEid}`;
  writeFileSync(join(KY, `${kname}.png`), encodePNG({ W, H, data }));
  writeFileSync(join(KY, `${kname}.csv`), "u," + us.map((u) => u.toFixed(3)).join(",") + "\n" + profiles.map((p, k) => meta.frames[k].i + "," + p.map((v) => v.toFixed(1)).join(",")).join("\n") + "\n");
  return {
    stand, effect, route: `e${inEid}->e${outEid}`, inEid, outEid, kymo: `${kname}.png`,
    fronts: fu.map((u) => +u.toFixed(3)), nInterp, clocks: meta.frames.map((f) => f.L ?? f.t ?? f.clock),
    jump: +jump.toFixed(2), armMedian: +med.toFixed(4), pops, popFrames, lag: +lag.toFixed(2),
    dimFrames, brightFrames, fanMean: fanMean.map((v) => +v.toFixed(1)),
  };
}

const ROUTES = {
  S3: {
    fire: [[39, 210], [39, 209]],
    collapse: [[210, 209]],
    pulse: [[210, 209], [39, 209]],
  },
  S4: {
    fire: [[176, 135], [176, 134], [176, 175]],
    collapse: [[176, 135]],
    pulse: [[176, 135], [176, 134], [176, 175]],
  },
};

const all = [];
for (const stand of ["S3", "S4"]) {
  for (const effect of ["fire", "collapse", "pulse"]) {
    const set = loadSet(stand, effect);
    for (const [i, o] of ROUTES[stand][effect]) {
      const r = analyseRoute(stand, effect, i, o, set, effect === "pulse" ? loadSet(stand, "pulseD") : set);
      all.push(r);
      console.log(`${stand} ${effect} ${r.route}: jump ${r.jump} lag ${r.lag} pops ${r.pops} dim [${r.dimFrames}] fronts ${r.fronts.filter(Number.isFinite).length}/${r.fronts.length}`);
    }
  }
}
// Verdicts: per stand+effect against the pulse routes at that junction.
const verdicts = [];
for (const stand of ["S3", "S4"]) {
  const pulse = all.filter((r) => r.stand === stand && r.effect === "pulse");
  const pJump = Math.max(...pulse.map((r) => r.jump)), pPops = Math.max(...pulse.map((r) => r.pops)), pLag = pulse[0].lag, pDim = Math.max(...pulse.map((r) => r.dimFrames.length)), pBright = Math.max(...pulse.map((r) => r.brightFrames.length)), pMed = Math.max(...pulse.map((r) => r.armMedian));
  for (const effect of ["fire", "collapse"]) {
    for (const r of all.filter((x) => x.stand === stand && x.effect === effect)) {
      const bad = [], unmeasured = [];
      if (Number.isFinite(r.jump) && Number.isFinite(pJump)) { if (!(r.jump <= pJump + 0.5)) bad.push(`jump ${r.jump} vs pulse ${pJump} on ${r.route}`); } else unmeasured.push(`jump (effect ${r.jump}, pulse ${pJump})`);
      if (!(r.pops <= pPops)) bad.push(`pops ${r.pops} vs pulse ${pPops} on ${r.route} frames [${r.popFrames}]`);
      if (Number.isFinite(r.lag) && Number.isFinite(pLag) && pMed >= 0.06) { if (!(Math.abs(r.lag - pLag) <= 1)) bad.push(`lag ${r.lag} vs pulse ${pLag} on ${r.route}`); } else unmeasured.push(`lag (effect ${r.lag}, pulse ${pLag}, pulse arm speed ${pMed})`);
      if (r.dimFrames.length > 0 && pDim === 0) bad.push(`dim frames [${r.dimFrames}] on ${r.route}, pulse has none`);
      if (r.brightFrames.length > 0 && pBright === 0) bad.push(`bright frames [${r.brightFrames}] on ${r.route}, pulse has none`);
      verdicts.push({ stand, effect, route: r.route, verdict: bad.length ? "differs" : "like the pulse", bad, unmeasured });
      console.log(`${stand} ${effect} ${r.route}: ${bad.length ? "DIFFERS " + bad.join("; ") : "like the pulse"}${unmeasured.length ? " [unmeasured: " + unmeasured.join("; ") + "]" : ""}`);
    }
  }
}
writeFileSync(join(import.meta.dirname, "out", "measures.json"), JSON.stringify({ fanR: FAN_R, routes: all, verdicts }, null, 1));
const L = ["# K1210 measures (fan footprint |u| <= 0.6 world; jump = largest in-fan one-frame front advance / median arm advance; lag in frames vs the arm-speed prediction; pops = frames with >16 fan pixels changing >32 luma)", "",
  "| stand | effect | route | jump | arm med (world/fr) | lag (fr) | pops | dim frames | bright frames | verdict |", "|---|---|---|---|---|---|---|---|---|---|"];
for (const r of all) {
  const v = verdicts.find((x) => x.stand === r.stand && x.effect === r.effect && x.route === r.route);
  L.push(`| ${r.stand} | ${r.effect} | ${r.route} | ${r.jump} | ${r.armMedian} | ${r.lag} | ${r.pops} | ${r.dimFrames.length ? r.dimFrames.join(",") : "-"} | ${r.brightFrames.length ? r.brightFrames.join(",") : "-"} | ${v ? v.verdict + (v.unmeasured.length ? " (unmeasured: " + v.unmeasured.join("; ") + ")" : "") + (v.bad.length ? ": " + v.bad.join("; ") : "") : "pulse (reference)"} |`);
}
writeFileSync(join(import.meta.dirname, "out", "measures.md"), L.join("\n") + "\n");
console.log("wrote out/measures.json + out/measures.md + out/kymo/*");
