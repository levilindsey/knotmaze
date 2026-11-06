// K1211 S1: offline analysis of shoot.mjs's output (no browser).
//   node analyze.mjs zero <dirA> <dirB>              look-0 files of two builds: px that differ
//   node analyze.mjs checks <dir>                    checks (a) (b) (c), the switch's return; checks.json
//   node analyze.mjs sheets <dir> <out> <ji> [k...]  today | A | B | colours-only at three moments,
//                                                    1x (box + strips) and 3x (the web core)
//   node analyze.mjs grad <dir> <out> <ji> [k...]    the edge map: shot, its step map, the light's step
//                                                    map, webs off and its step map (3x, rings + arm rays)
//   node analyze.mjs gold <dir> <out>                the gold at rest: straight, sharp, T, 4-arm (from the
//                                                    full-viewport shots), today | A | B | colours-only
//   node analyze.mjs wide <dir> <out>                one wide view: today | A over B | colours-only, half size
// A record's web: the disc of the fan reach (fanR + fh) around its centre;
// its zone: fanR + 2 fh + LIGHT_STRIP_FH fh (the box plus the looks' strips).
// Steps are 4-neighbour max-channel differences inside the material mask
// (colours-only differs from background-only by > 8 levels, eroded 2 px).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { decodePNG, encodePNG, toRGB } from "./png.mjs";

const DSF = 1.5, STRIP_FH = 2.25, NB = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const load = (f) => toRGB(decodePNG(readFileSync(f)));
const save = (f, img) => { mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, encodePNG(img)); };
const readMeta = (dir) => JSON.parse(readFileSync(join(dir, "meta.json"), "utf8"));

function geom(M) {
  const fh = M.fh, fanR = Math.max(fh * 1.25 * M.cusp, fh), pxw = M.scale * DSF;
  return { fh, fanR, pxw, rWeb: (fanR + fh) * pxw, rZone: (fanR + 2 * fh + STRIP_FH * fh) * pxw };
}
const centre = (M, rec, full) => (full ? [rec.sx * DSF, rec.sy * DSF] : [(rec.sx - M.clip.x) * DSF, (rec.sy - M.clip.y) * DSF]);
// an arm's direction on screen (device px per world along the arm)
function armDir(M, rec, a) {
  const { ax, ay, bx, by } = M.aff, det = ax * by - bx * ay;
  const dx = Math.cos(a.ang), dy = Math.sin(a.ang);
  const sx = (by * dx - bx * dy) / det, sy = (-ay * dx + ax * dy) / det;
  const n = Math.hypot(sx, sy);
  return [sx / n, sy / n];
}

function maxDiff(A, B) {
  let n = 0, n2 = 0, mx = 0;
  for (let i = 0; i < A.data.length; i += 3) {
    const d = Math.max(Math.abs(A.data[i] - B.data[i]), Math.abs(A.data[i + 1] - B.data[i + 1]), Math.abs(A.data[i + 2] - B.data[i + 2]));
    if (d > 0) n++;
    if (d > 2) n2++;
    if (d > mx) mx = d;
  }
  return { n, n2, mx };
}

function materialMask(C, BG) {
  const W = C.W, H = C.H;
  let m = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p++) {
    const i = p * 3;
    m[p] = Math.max(Math.abs(C.data[i] - BG.data[i]), Math.abs(C.data[i + 1] - BG.data[i + 1]), Math.abs(C.data[i + 2] - BG.data[i + 2])) > 8 ? 1 : 0;
  }
  for (let it = 0; it < 2; it++) {
    const o = new Uint8Array(W * H);
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const p = y * W + x;
      o[p] = m[p] && m[p - 1] && m[p + 1] && m[p - W] && m[p + W] ? 1 : 0;
    }
    m = o;
  }
  return m;
}

// X: Int16Array (3 per px). Returns the per-pixel max step to an in-mask neighbour.
function steps(X, W, H, mask) {
  const s = new Uint16Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = y * W + x;
    if (!mask[p]) continue;
    let m = 0;
    for (const [dx, dy] of NB) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      const q = yy * W + xx;
      if (!mask[q]) continue;
      for (let c = 0; c < 3; c++) { const d = Math.abs(X[p * 3 + c] - X[q * 3 + c]); if (d > m) m = d; }
    }
    s[p] = m;
  }
  return s;
}
const i16 = (img) => Int16Array.from(img.data);
const sub = (A, B) => { const o = new Int16Array(A.data.length); for (let i = 0; i < o.length; i++) o[i] = A.data[i] - B.data[i]; return o; };

// region masks: web discs of the records fully inside, zone union, arms = mask outside every zone
function regions(M, W, H, full) {
  const g = geom(M);
  const recs = M.recs.map((r) => ({ r, c: centre(M, r, full) }))
    .filter(({ c }) => c[0] > -g.rZone && c[1] > -g.rZone && c[0] < W + g.rZone && c[1] < H + g.rZone);
  const zone = new Uint8Array(W * H), webOf = new Int32Array(W * H).fill(-1);
  for (const { r, c } of recs) {
    const inside = c[0] - g.rWeb >= 0 && c[1] - g.rWeb >= 0 && c[0] + g.rWeb < W && c[1] + g.rWeb < H;
    const x0 = Math.max(0, Math.floor(c[0] - g.rZone)), x1 = Math.min(W - 1, Math.ceil(c[0] + g.rZone));
    const y0 = Math.max(0, Math.floor(c[1] - g.rZone)), y1 = Math.min(H - 1, Math.ceil(c[1] + g.rZone));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const d = Math.hypot(x + 0.5 - c[0], y + 0.5 - c[1]), p = y * W + x;
      if (d <= g.rZone) zone[p] = 1;
      if (inside && d <= g.rWeb) webOf[p] = r.ji;
    }
  }
  return { g, recs, zone, webOf };
}

function cmdZero(A, B) {
  const names = ["bg.png", "bg_full.png", "c0.png", "c_full.png", "g0.png", "g0_full.png", "m0_full.png"];
  for (let k = 0; k < 64; k++) for (const p of ["m0_t", "m0w_t"]) if (existsSync(join(A, `${p}${k}.png`))) names.push(`${p}${k}.png`);
  let tot = 0, files = 0;
  const bad = [];
  for (const nm of names) {
    if (!existsSync(join(B, nm))) { bad.push(`${nm}: missing in B`); continue; }
    const d = maxDiff(load(join(A, nm)), load(join(B, nm)));
    files++;
    tot += d.n;
    if (d.n) bad.push(`${nm}: ${d.n} px (>2: ${d.n2}, max ${d.mx})`);
  }
  console.log(`zero ${basename(A)} vs ${basename(B)}: ${files} files, ${tot} px differ`);
  for (const b of bad) console.log("  " + b);
  return { files, tot, bad };
}

function cmdChecks(dir) {
  const M = readMeta(dir), nf = M.nf;
  const looks = M.hasHook ? [0, 1, 2] : [0];
  const BG = load(join(dir, "bg.png")), C0 = load(join(dir, "c0.png"));
  const W = C0.W, H = C0.H;
  const mask = materialMask(C0, BG);
  const R = regions(M, W, H, false), g = R.g;
  const out = { stand: M.stand, fh: g.fh, fanR: g.fanR, pxw: g.pxw, rWeb: g.rWeb, rZone: g.rZone, webs: [...new Set([...R.webOf].filter((v) => v >= 0))], a: {}, b: {}, c: {}, ret: null };
  // (a) inside each web vs the arms (outside every zone), raw and light-only
  for (const L of looks) {
    const C = existsSync(join(dir, `c${L}.png`)) ? load(join(dir, `c${L}.png`)) : C0;
    const rows = [];
    for (let k = 0; k < nf; k++) {
      const I = load(join(dir, `m${L}_t${k}.png`));
      const row = { k };
      for (const [name, X] of [["raw", i16(I)], ["light", sub(I, C)]]) {
        const s = steps(X, W, H, mask);
        let arms = 0;
        const web = {}, hA = new Uint32Array(512), hW = {};
        for (let p = 0; p < W * H; p++) {
          if (!mask[p]) continue;
          const j = R.webOf[p];
          if (j >= 0) { if (!(s[p] <= (web[j] ?? -1))) web[j] = s[p]; (hW[j] ??= new Uint32Array(512))[Math.min(511, s[p])]++; }
          else if (!R.zone[p]) { if (s[p] > arms) arms = s[p]; hA[Math.min(511, s[p])]++; }
        }
        const pct = (h, q) => { let n = 0; for (const v of h) n += v; let acc = 0; for (let i = 0; i < h.length; i++) { acc += h[i]; if (acc >= q * n) return i; } return 0; };
        const webP = {};
        for (const j of Object.keys(hW)) webP[j] = pct(hW[j], 0.995);
        row[name] = { arms, web, armsP995: pct(hA, 0.995), webP995: webP };
      }
      rows.push(row);
    }
    // summary per web: worst frame ratio, frames failing
    const sum = {};
    for (const j of out.webs) {
      for (const name of ["raw", "light"]) {
        let worst = 0, fail = 0, wmax = 0, amin = 1e9, wp = 0, ap = 1e9;
        for (const row of rows) {
          const w = row[name].web[j] ?? 0, a = row[name].arms;
          if (w > a) fail++;
          worst = Math.max(worst, w - a);
          wmax = Math.max(wmax, w);
          amin = Math.min(amin, a);
          wp = Math.max(wp, row[name].webP995[j] ?? 0);
          ap = Math.min(ap, row[name].armsP995);
        }
        sum[`${j}:${name}`] = { fail, worstExcess: worst, webMax: wmax, armsMinOverFrames: amin, webP995Max: wp, armsP995Min: ap };
      }
    }
    out.a[L] = { sum, rows };
  }
  // (b) frame-to-frame change: web vs arms (wrap pair included)
  for (const L of looks) {
    const fr = [];
    const imgs = [];
    for (let k = 0; k < nf; k++) imgs.push(load(join(dir, `m${L}_t${k}.png`)));
    for (let k = 0; k < nf; k++) {
      const A = imgs[k], B = imgs[(k + 1) % nf];
      let arms = 0;
      const web = {};
      for (let p = 0; p < W * H; p++) {
        if (!mask[p]) continue;
        const i = p * 3;
        const d = Math.max(Math.abs(A.data[i] - B.data[i]), Math.abs(A.data[i + 1] - B.data[i + 1]), Math.abs(A.data[i + 2] - B.data[i + 2]));
        const j = R.webOf[p];
        if (j >= 0) { if (!(d <= (web[j] ?? -1))) web[j] = d; }
        else if (!R.zone[p] && d > arms) arms = d;
      }
      fr.push({ k, arms, web });
    }
    // the crest's position: the light-weighted centroid inside each web disc
    // (light = |shot - colours-only|), frame to frame, while the web is lit
    // (both frames above 25% of the brightest frame's energy)
    const C = existsSync(join(dir, `c${L}.png`)) ? load(join(dir, `c${L}.png`)) : C0;
    const cen = {};
    for (const j of out.webs) {
      const rec = M.recs.find((r) => r.ji === j), [cx, cy] = centre(M, rec, false);
      const per = imgs.map((I) => {
        let e = 0, sx = 0, sy = 0;
        for (let y = Math.max(0, Math.floor(cy - g.rWeb)); y < Math.min(H, cy + g.rWeb); y++)
          for (let x = Math.max(0, Math.floor(cx - g.rWeb)); x < Math.min(W, cx + g.rWeb); x++) {
            const p = y * W + x;
            if (!mask[p] || R.webOf[p] !== j) continue;
            const i = p * 3;
            const v = Math.max(Math.abs(I.data[i] - C.data[i]), Math.abs(I.data[i + 1] - C.data[i + 1]), Math.abs(I.data[i + 2] - C.data[i + 2]));
            e += v; sx += v * x; sy += v * y;
          }
        return { e, x: e ? sx / e : cx, y: e ? sy / e : cy };
      });
      const eMax = Math.max(...per.map((q) => q.e));
      let jump = 0, kj = -1;
      for (let k = 0; k < nf; k++) {
        const a = per[k], b = per[(k + 1) % nf];
        if (a.e < 0.25 * eMax || b.e < 0.25 * eMax) continue;
        const d = Math.hypot(b.x - a.x, b.y - a.y);
        if (d > jump) { jump = d; kj = k; }
      }
      cen[j] = { maxStepPx: jump, atK: kj, crestStepPx: ((M.spacing / nf) * g.pxw), energy: per.map((q) => Math.round(q.e)) };
    }
    const sum = {};
    for (const j of out.webs) {
      let fail = 0, wmax = 0, amax = 0;
      for (const f of fr) { const w = f.web[j] ?? 0; if (w > f.arms + 4) fail++; wmax = Math.max(wmax, w); amax = Math.max(amax, f.arms); }
      sum[j] = { fail, webMax: wmax, armsMax: amax, centroidMaxStepPx: cen[j].maxStepPx, centroidAtK: cen[j].atK, crestStepPx: cen[j].crestStepPx };
    }
    out.b[L] = { sum, frames: fr, centroid: cen };
  }
  // (c) looks 1 and 2 against look 0: changed px by distance from the nearest record centre
  if (M.hasHook) {
    const allC = (full) => M.recs.map((r) => centre(M, r, full));
    const far = (A, B, full) => {
      const cs = allC(full);
      let n = 0, nOut = 0, dMax = 0;
      for (let p = 0, Wd = A.W; p < A.W * A.H; p++) {
        const i = p * 3;
        const d = Math.max(Math.abs(A.data[i] - B.data[i]), Math.abs(A.data[i + 1] - B.data[i + 1]), Math.abs(A.data[i + 2] - B.data[i + 2]));
        if (!d) continue;
        n++;
        const x = (p % Wd) + 0.5, y = Math.floor(p / Wd) + 0.5;
        let best = 1e9;
        for (const c of cs) { const e = Math.hypot(x - c[0], y - c[1]); if (e < best) best = e; }
        if (best > g.rZone + 2) nOut++;
        if (best > dMax) dMax = best;
      }
      return { n, nOut, dMaxFh: dMax / g.pxw / g.fh, zoneFh: g.rZone / g.pxw / g.fh };
    };
    for (const L of [1, 2]) {
      const res = { frames: [], full: null, gold: null, goldFull: null, colours: null };
      for (let k = 0; k < nf; k++) res.frames.push(far(load(join(dir, `m${L}_t${k}.png`)), load(join(dir, `m0_t${k}.png`)), false));
      res.full = far(load(join(dir, `m${L}_full.png`)), load(join(dir, "m0_full.png")), true);
      res.gold = far(load(join(dir, `g${L}.png`)), load(join(dir, "g0.png")), false);
      res.goldFull = far(load(join(dir, `g${L}_full.png`)), load(join(dir, "g0_full.png")), true);
      res.colours = maxDiff(load(join(dir, `c${L}.png`)), C0);
      out.c[L] = res;
    }
    out.ret = maxDiff(load(join(dir, "m0b_t0.png")), load(join(dir, "m0_t0.png")));
  }
  writeFileSync(join(dir, "checks.json"), JSON.stringify(out, null, 1));
  // print
  console.log(`checks ${M.stand}: fh ${g.fh.toFixed(3)} fanR ${g.fanR.toFixed(3)} px/world ${g.pxw.toFixed(1)} web r ${g.rWeb.toFixed(0)} px zone r ${g.rZone.toFixed(0)} px; webs in clip ${out.webs.join(",")}`);
  for (const L of looks) {
    for (const [key, v] of Object.entries(out.a[L].sum)) console.log(`  (a) look ${L} web ${key}: frames failing ${v.fail}/${nf}, worst excess ${v.worstExcess}, web max ${v.webMax}, arms min ${v.armsMinOverFrames}; p99.5 web max ${v.webP995Max}, arms min ${v.armsP995Min}`);
    for (const [j, v] of Object.entries(out.b[L].sum)) console.log(`  (b) look ${L} web ${j}: frames failing ${v.fail}/${nf}, web max ${v.webMax}, arms max ${v.armsMax}; light centroid's largest frame step ${v.centroidMaxStepPx.toFixed(1)} px at k ${v.centroidAtK} (the crest moves ${v.crestStepPx.toFixed(1)} px a frame)`);
  }
  if (M.hasHook) {
    for (const L of [1, 2]) {
      const r = out.c[L];
      const fo = r.frames.reduce((a, f) => a + f.nOut, 0), fd = Math.max(...r.frames.map((f) => f.dMaxFh));
      console.log(`  (c) look ${L}: clip frames changed px outside zones ${fo}, furthest ${fd.toFixed(2)} fh (zone ${r.full.zoneFh.toFixed(2)} fh); full ${r.full.n} px, outside ${r.full.nOut}, furthest ${r.full.dMaxFh.toFixed(2)} fh; gold full ${r.goldFull.n} px, outside ${r.goldFull.nOut}, furthest ${r.goldFull.dMaxFh.toFixed(2)} fh; colours-only vs look 0: ${r.colours.n} px (max ${r.colours.mx})`);
    }
    console.log(`  switch back to 0: ${out.ret.n} px differ (max ${out.ret.mx})`);
  }
  return out;
}

function crop(img, cx, cy, half) {
  const S = 2 * half, data = Buffer.alloc(S * S * 3, 0);
  const x0 = Math.round(cx) - half, y0 = Math.round(cy) - half;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const sx = x0 + x, sy = y0 + y;
    if (sx < 0 || sy < 0 || sx >= img.W || sy >= img.H) continue;
    img.data.copy(data, (y * S + x) * 3, (sy * img.W + sx) * 3, (sy * img.W + sx) * 3 + 3);
  }
  return { W: S, H: S, data, x0, y0 };
}
function up(img, f) {
  const W = img.W * f, H = img.H * f, data = Buffer.alloc(W * H * 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) img.data.copy(data, (y * W + x) * 3, (((y / f) | 0) * img.W + ((x / f) | 0)) * 3, (((y / f) | 0) * img.W + ((x / f) | 0)) * 3 + 3);
  return { W, H, data };
}
function grid(imgs, cols, G = 6) {
  const W = imgs[0].W, H = imgs[0].H, rows = Math.ceil(imgs.length / cols);
  const SW = cols * W + (cols + 1) * G, SH = rows * H + (rows + 1) * G, data = Buffer.alloc(SW * SH * 3, 40);
  imgs.forEach((im, i) => {
    const ox = G + (i % cols) * (W + G), oy = G + Math.floor(i / cols) * (H + G);
    for (let y = 0; y < H; y++) im.data.copy(data, ((oy + y) * SW + ox) * 3, y * W * 3, (y + 1) * W * 3);
  });
  return { W: SW, H: SH, data };
}
function moments(dir, M, ji, ks) {
  if (ks.length) return ks.map(Number);
  const C = load(join(dir, "c0.png")), rec = M.recs.find((r) => r.ji === ji), g = geom(M);
  const [cx, cy] = centre(M, rec, false);
  let best = -1, kb = 0;
  for (let k = 0; k < M.nf; k++) {
    const I = load(join(dir, `m0_t${k}.png`));
    let e = 0;
    for (let y = Math.max(0, Math.floor(cy - g.rWeb)); y < Math.min(I.H, cy + g.rWeb); y++)
      for (let x = Math.max(0, Math.floor(cx - g.rWeb)); x < Math.min(I.W, cx + g.rWeb); x++) {
        if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) > g.rWeb) continue;
        const i = (y * I.W + x) * 3;
        e += Math.max(Math.abs(I.data[i] - C.data[i]), Math.abs(I.data[i + 1] - C.data[i + 1]), Math.abs(I.data[i + 2] - C.data[i + 2]));
      }
    if (e > best) { best = e; kb = k; }
  }
  const n = M.nf, d = Math.round(n / 8);
  return [(kb - d + n) % n, kb, (kb + d) % n];
}

function cmdSheets(dir, out, ji, ks) {
  const M = readMeta(dir), g = geom(M), rec = M.recs.find((r) => r.ji === ji);
  if (!rec) throw new Error(`ji ${ji} not in meta`);
  const [cx, cy] = centre(M, rec, false);
  const mk = moments(dir, M, ji, ks);
  const half1 = Math.round(g.rZone + g.fh * g.pxw), half3 = Math.round((g.fanR + 1.5 * g.fh) * g.pxw);
  const C = load(join(dir, "c0.png"));
  const rows1 = [], tag = `${M.stand}_ji${ji}`;
  for (const k of mk) {
    const cols = [0, 1, 2].map((L) => load(join(dir, `m${L}_t${k}.png`))).concat([C]);
    rows1.push(...cols.map((im) => crop(im, cx, cy, half1)));
    save(join(out, `${tag}_k${k}_3x.png`), grid(cols.map((im) => up(crop(im, cx, cy, half3), 3)), 4));
  }
  save(join(out, `${tag}_moments_1x.png`), grid(rows1, 4));
  console.log(`sheets ${tag}: moments ${mk.join(",")} (arriving, at the joint, leaving); 1x crop ${2 * half1} px, 3x core ${2 * half3} px -> ${out}`);
  return mk;
}

function ring(img, cx, cy, r, col) {
  for (let a = 0; a < 2 * Math.PI; a += 0.5 / Math.max(r, 1)) {
    const x = Math.round(cx + r * Math.cos(a)), y = Math.round(cy + r * Math.sin(a));
    if (x >= 0 && y >= 0 && x < img.W && y < img.H) img.data.set(col, (y * img.W + x) * 3);
  }
}
function ray(img, cx, cy, d, r0, r1, col) {
  for (let t = r0; t <= r1; t += 0.5) {
    const x = Math.round(cx + d[0] * t), y = Math.round(cy + d[1] * t);
    if (x >= 0 && y >= 0 && x < img.W && y < img.H) img.data.set(col, (y * img.W + x) * 3);
  }
}
const ARM_COL = [[255, 60, 60], [60, 220, 60], [80, 140, 255], [255, 220, 40], [255, 80, 255], [40, 230, 230]];
function stepImg(s, W, H, gain) {
  const data = Buffer.alloc(W * H * 3);
  for (let p = 0; p < W * H; p++) { const v = Math.min(255, s[p] * gain); data[p * 3] = data[p * 3 + 1] = data[p * 3 + 2] = v; }
  return { W, H, data };
}
function cmdGrad(dir, out, ji, ks) {
  const M = readMeta(dir), g = geom(M), rec = M.recs.find((r) => r.ji === ji);
  const [cx, cy] = centre(M, rec, false);
  const mk = moments(dir, M, ji, ks);
  const BG = load(join(dir, "bg.png")), C = load(join(dir, "c0.png"));
  const W = C.W, H = C.H, mask = materialMask(C, BG);
  const half = Math.round((g.fanR + 2.5 * g.fh) * g.pxw);
  const tiles = [];
  const overlay = (im, lc) => {
    const o = { W: im.W, H: im.H, data: Buffer.from(im.data) };
    const ox = cx - lc.x0, oy = cy - lc.y0;
    ring(o, ox, oy, g.fanR * g.pxw, [255, 0, 255]);
    ring(o, ox, oy, (g.fanR + g.fh) * g.pxw, [0, 255, 255]);
    ring(o, ox, oy, (g.fanR + 2 * g.fh) * g.pxw, [255, 255, 0]);
    rec.arms.forEach((a, i) => ray(o, ox, oy, armDir(M, rec, a), (g.fanR + 2 * g.fh) * g.pxw, half * 1.5, ARM_COL[i % ARM_COL.length]));
    return o;
  };
  for (const k of mk) {
    const I = load(join(dir, `m0_t${k}.png`)), Iw = load(join(dir, `m0w_t${k}.png`));
    const sI = stepImg(steps(i16(I), W, H, mask), W, H, 4);
    const sL = stepImg(steps(sub(I, C), W, H, mask), W, H, 4);
    const sW = stepImg(steps(i16(Iw), W, H, mask), W, H, 4);
    const row = [I, sI, sL, Iw, sW].map((im) => { const c = crop(im, cx, cy, half); return up(overlay(c, c), 3); });
    tiles.push(...row);
  }
  const tag = `${M.stand}_ji${ji}`;
  save(join(out, `${tag}_edgemap_3x.png`), grid(tiles, 5));
  console.log(`grad ${tag}: moments ${mk.join(",")}; cols shot | step(shot) | step(light) | webs off | step(webs off); rings fanR (magenta), fan reach (cyan), box (yellow); arm rays by index ${rec.arms.map((a, i) => `${i}:${["red", "green", "blue", "yellow", "magenta", "cyan"][i]}`).join(" ")}; routes ${JSON.stringify(rec.routes)}`);
}

function cmdGold(dir, out) {
  const M = readMeta(dir), g = geom(M);
  const F = load(join(dir, "g0_full.png"));
  const half1 = Math.round(g.rZone + g.fh * g.pxw), half3 = Math.round((g.fanR + 1.5 * g.fh) * g.pxw);
  const cand = [];
  for (const rec of M.recs) {
    const [cx, cy] = centre(M, rec, true);
    if (cx < half1 || cy < half1 || cx > F.W - half1 || cy > F.H - half1) continue;
    const dirs = rec.arms.map((a) => armDir(M, rec, a));
    for (const q of rec.routes) {
      if (q.ib < 0) continue;
      const a = dirs[q.ia], b = dirs[q.ib];
      const th = (Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1]))) * 180) / Math.PI;
      // the arms' angular gaps, sorted, to spot a T
      const angs = dirs.map((d) => Math.atan2(d[1], d[0])).sort((x, y) => x - y);
      const gaps = angs.map((v, i) => (((i + 1 < angs.length ? angs[i + 1] : angs[0] + 2 * Math.PI) - v) * 180) / Math.PI).sort((x, y) => x - y);
      cand.push({ ji: rec.ji, n: rec.arms.length, th, gaps, cx, cy, dc: Math.hypot(cx - F.W / 2, cy - F.H / 2) });
    }
  }
  const pick = {};
  const by = (f, s) => cand.filter(f).sort(s)[0];
  pick.straight = by((c) => c.n === 3 && c.th > 150, (a, b) => b.th - a.th || a.dc - b.dc);
  pick.sharp = by((c) => c.th < 100, (a, b) => a.th - b.th || a.dc - b.dc);
  pick.T = by((c) => c.n === 3 && Math.abs(c.gaps[2] - 180) < 30 && Math.abs(c.gaps[0] - 90) < 35 && (!pick.straight || c.ji !== pick.straight.ji), (a, b) => Math.abs(a.gaps[2] - 180) - Math.abs(b.gaps[2] - 180));
  pick.four = by((c) => c.n === 4, (a, b) => a.dc - b.dc);
  const imgs = [0, 1, 2].map((L) => load(join(dir, `g${L}_full.png`))).concat([load(join(dir, "c_full.png"))]);
  const rows1 = [], rows3 = [];
  const lines = [];
  for (const kind of ["straight", "sharp", "T", "four"]) {
    const c = pick[kind];
    if (!c) { lines.push(`${kind}: none in view`); continue; }
    lines.push(`${kind}: ji ${c.ji}, ${c.n} arms, route angle ${c.th.toFixed(0)} deg, arm gaps ${c.gaps.map((v) => v.toFixed(0)).join("/")}, at (${(c.cx / DSF).toFixed(0)}, ${(c.cy / DSF).toFixed(0)}) css`);
    rows1.push(...imgs.map((im) => crop(im, c.cx, c.cy, half1)));
    rows3.push(...imgs.map((im) => up(crop(im, c.cx, c.cy, half3), 3)));
  }
  if (rows1.length) {
    save(join(out, `${M.stand}_gold_1x.png`), grid(rows1, 4));
    save(join(out, `${M.stand}_gold_3x.png`), grid(rows3, 4));
  }
  console.log(`gold ${M.stand} (${cand.length} routes in view):\n  ` + lines.join("\n  "));
  return pick;
}

function half(img) {
  const W = img.W >> 1, H = img.H >> 1, data = Buffer.alloc(W * H * 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) for (let c = 0; c < 3; c++) {
    const s = (yy, xx) => img.data[(yy * img.W + xx) * 3 + c];
    data[(y * W + x) * 3 + c] = (s(2 * y, 2 * x) + s(2 * y, 2 * x + 1) + s(2 * y + 1, 2 * x) + s(2 * y + 1, 2 * x + 1) + 2) >> 2;
  }
  return { W, H, data };
}
function cmdWide(dir, out) {
  const M = readMeta(dir);
  const ims = ["m0_full.png", "m1_full.png", "m2_full.png", "c_full.png"].map((f) => half(load(join(dir, f))));
  save(join(out, `${M.stand}_wide.png`), grid(ims, 2));
  console.log(`wide ${M.stand}: today | A / B | colours-only (half size)`);
}

const [, , cmd, ...args] = process.argv;
if (cmd === "zero") cmdZero(args[0], args[1]);
else if (cmd === "checks") cmdChecks(args[0]);
else if (cmd === "sheets") cmdSheets(args[0], args[1], Number(args[2]), args.slice(3));
else if (cmd === "grad") cmdGrad(args[0], args[1], Number(args[2]), args.slice(3));
else if (cmd === "gold") cmdGold(args[0], args[1]);
else if (cmd === "wide") cmdWide(args[0], args[1]);
else console.log("usage: see the header");
