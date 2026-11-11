// K1291 s2: the appearance reveal in rp=outline against today's look on ONE
// pinned page.
//   node .claude/probes/K1291/k1291_reveal.mjs <base> <outDir> [case...]
// Each case loads its link + &am=<mode>&rp=outline (no am=instant: the intro
// runs), freezes the physics (__knotPhysFreeze), freezes the appearance FX
// and hides their layers (shared by both looks), then for each pinned
// fraction of the reveal (revealPin: anim time and FX clock stopped) re-sends
// the outline, waits until it holds the frozen pose, and flips the same page
// between rp=outline, today's base + fillet layers and neither
// (__knotOutline.show(true|false|null)).
// Footprint: pixels whose max channel differs from the neither-shot by more
// than FOOT; IoU today vs outline; "past" = outline pixels farther than
// NEAR css px from today's footprint (border or fill past a front), "short"
// the reverse; the done state (fraction 1) is the baseline of each case.
// Fronts: along every app chain, its renderer samples' centres covered or
// not in each look; the covered arc per chain today vs outline (the front's
// shift, css px). Crop rows today | rp=outline | |diff| at fronts, at a
// front near another thread (a crossing or junction) and at a ring's wrap.
// Thread reveal: case "<name>_threads" loads xp=threads, makes moves, and
// compares the same footprint at a few moves in and mid-maze.
// Headed hardware-GPU Chrome off-screen, real time. Never virtual time.
import puppeteer from "puppeteer-core";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const [, , base, outDir, ...only] = process.argv;
const VW = 1240, VH = 900, DSF = 2;
const FOOT = Number(process.env.FOOT ?? 10), NEAR = Number(process.env.NEAR ?? 3), CROP = 80;
const FRACS = (process.env.FRACS ?? "0.2,0.5,0.85,1").split(",").map(Number);
const DEF = "?s=b";
const MUSE = "?3&cr=6&bg=wash&bgcm=custom&bgc0=e6e9ee";
const RING = "?s=1rphqy1&gs=12&shp=ring&wd=.45&sl=1&dr=.75&rep=1.45&bd=2.5&sm=.6&ga=.2&tw=.64&gap=.04&cr=3&fl=0&fv=1";
const CASES = [];
for (const [n, l] of [["def", DEF], ["muse", MUSE], ["ring", RING]]) {
  for (const m of (process.env.MODES ?? "trace-burn,bloom-comet,ink-dust").split(",")) CASES.push({ name: `${n}_${m}`, link: `${l}&am=${m}`, ring: n === "ring" });
}
for (const [n, l] of [["def", DEF], ["muse", MUSE]]) CASES.push({ name: `${n}_threads`, link: `${l}&am=instant&xp=threads`, threads: true });
const cases = only.length ? CASES.filter((c) => only.some((o) => c.name.startsWith(o))) : CASES;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(join(outDir, "crops"), { recursive: true });

const profileDir = join(tmpdir(), `k1291-rv-${process.pid}`);
const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: false,
  userDataDir: profileDir,
  args: [
    "--use-angle=d3d11", "--no-first-run", "--no-default-browser-check",
    "--window-position=2200,50", "--window-size=1360,1040",
    "--disable-features=CalculateNativeWinOcclusion",
    "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding",
  ],
});
const report = { base, cases: [] };
const ana = await browser.newPage();
await ana.setContent("<html><body></body></html>");
await ana.evaluate(() => {
  window.dec = async (b64) => {
    const bm = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
    const c = new OffscreenCanvas(bm.width, bm.height);
    const g = c.getContext("2d");
    g.drawImage(bm, 0, 0);
    return { w: bm.width, h: bm.height, d: g.getImageData(0, 0, bm.width, bm.height).data };
  };
  window.imgs = {};
  window.put = async (k, b64) => { window.imgs[k] = await window.dec(b64); return [window.imgs[k].w, window.imgs[k].h]; };
  // Footprints, IoU, past/short and the fronts' covered arcs.
  window.measure = (FOOT, NEAR, DSF, chains) => {
    const I = window.imgs; const W = I.N.w, H = I.N.h;
    const dmax = (A, B, i) => Math.max(Math.abs(A.d[i] - B.d[i]), Math.abs(A.d[i + 1] - B.d[i + 1]), Math.abs(A.d[i + 2] - B.d[i + 2]));
    const fT = new Uint8Array(W * H), fO = new Uint8Array(W * H);
    let nT = 0, nO = 0, nI = 0, nU = 0;
    for (let p = 0; p < W * H; p++) {
      const i = 4 * p;
      const t = dmax(I.T, I.N, i) > FOOT, o = dmax(I.O, I.N, i) > FOOT;
      fT[p] = t ? 1 : 0; fO[p] = o ? 1 : 0;
      if (t) nT++; if (o) nO++; if (t || o) nU++; if (t && o) nI++;
    }
    // Distance-r dilation (square), separable running max.
    const dil = (f, r) => {
      const a = new Uint8Array(W * H), b = new Uint8Array(W * H);
      for (let y = 0; y < H; y++) { let last = -1e9; for (let x = 0; x < W; x++) { if (f[y * W + x]) last = x; a[y * W + x] = x - last <= r ? 1 : 0; } last = 1e9; for (let x = W - 1; x >= 0; x--) { if (f[y * W + x]) last = x; if (last - x <= r) a[y * W + x] = 1; } }
      for (let x = 0; x < W; x++) { let last = -1e9; for (let y = 0; y < H; y++) { if (a[y * W + x]) last = y; b[y * W + x] = y - last <= r ? 1 : 0; } last = 1e9; for (let y = H - 1; y >= 0; y--) { if (a[y * W + x]) last = y; if (last - y <= r) b[y * W + x] = 1; } }
      return b;
    };
    const r = Math.round(NEAR * DSF);
    const dT = dil(fT, r), dO = dil(fO, r);
    let past = 0, short = 0;
    const pastPix = [];
    for (let p = 0; p < W * H; p++) {
      if (fO[p] && !dT[p]) { past++; if (pastPix.length < 2000) pastPix.push(p); }
      if (fT[p] && !dO[p]) short++;
    }
    // Fronts: covered sample centres per chain.
    const at = (f, x, y) => { const X = Math.round(x * DSF), Y = Math.round(y * DSF); return X >= 0 && Y >= 0 && X < W && Y < H ? f[Y * W + X] : -1; };
    const fronts = [];
    let worstShift = 0;
    for (const ch of chains) {
      let cT = 0, cO = 0, mis = 0, n = 0; const misAt = [];
      for (let k = 0; k < ch.pts.length; k += 2) {
        const t = at(fT, ch.pts[k], ch.pts[k + 1]), o = at(fO, ch.pts[k], ch.pts[k + 1]);
        if (t < 0 || o < 0) continue;
        n++; cT += t; cO += o; if (t !== o) { mis++; if (misAt.length < 6) misAt.push([Math.round(ch.pts[k]), Math.round(ch.pts[k + 1]), t, o]); }
      }
      const shift = Math.abs(cT - cO) * ch.step;
      worstShift = Math.max(worstShift, shift);
      fronts.push({ c: ch.c, partial: ch.partial, samples: n, coveredToday: cT, coveredOutline: cO, mismatched: mis, shiftPx: Math.round(shift * 10) / 10, misPx: Math.round(mis * ch.step * 10) / 10, misAt });
    }
    // The worst "past" spot (densest cell) for a crop.
    const G = 40; const cells = new Map();
    for (const p of pastPix) { const k = `${Math.floor((p % W) / G)},${Math.floor(p / W / G)}`; cells.set(k, (cells.get(k) ?? 0) + 1); }
    const top = [...cells.entries()].sort((a, b) => b[1] - a[1])[0];
    const pastSpot = top ? top[0].split(",").map((v) => (Number(v) * G + G / 2) / DSF) : null;
    return { footToday: nT, footOutline: nO, iou: nU ? nI / nU : null, past, short, worstShiftPx: Math.round(worstShift * 10) / 10, fronts: fronts.filter((f) => f.partial || f.mismatched > 0), pastSpot };
  };
  window.cropRow = async (CROP, DSF, sx, sy) => {
    const I = window.imgs; const W = I.N.w, H = I.N.h; const S = CROP * DSF;
    const x0 = Math.max(0, Math.round((sx - CROP / 2) * DSF)), y0 = Math.max(0, Math.round((sy - CROP / 2) * DSF));
    const c = new OffscreenCanvas(3 * S + 8, S);
    const g = c.getContext("2d");
    g.fillStyle = "#777"; g.fillRect(0, 0, c.width, c.height);
    const put = (src, ox, diff) => {
      const im = new ImageData(S, S);
      for (let yy = 0; yy < S; yy++) for (let xx = 0; xx < S; xx++) {
        const i = (Math.min(H - 1, y0 + yy) * W + Math.min(W - 1, x0 + xx)) * 4, o = (yy * S + xx) * 4;
        for (let k = 0; k < 3; k++) im.data[o + k] = diff ? Math.abs(I.T.d[i + k] - I.O.d[i + k]) : src.d[i + k];
        im.data[o + 3] = 255;
      }
      g.putImageData(im, ox, 0);
    };
    put(I.T, 0, false); put(I.O, S + 4, false); put(null, 2 * S + 8, true);
    const b = await c.convertToBlob({ type: "image/png" });
    const u = new Uint8Array(await b.arrayBuffer());
    let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
    return btoa(s);
  };
});
const shot = async (page) => Buffer.from(await page.screenshot({ type: "png" })).toString("base64");
const put = (k, b64) => ana.evaluate((k, b) => window.put(k, b), k, b64);

try {
  for (const cs of cases) {
    const page = await browser.newPage();
    const rec = { name: cs.name, url: `${base}/${cs.link}&snd=none&rp=outline`, errors: [], states: [] };
    page.on("pageerror", (e) => rec.errors.push(String(e.message).slice(0, 300)));
    page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") rec.errors.push(`${m.type()}: ${m.text()}`.slice(0, 300)); });
    await page.setViewport({ width: VW, height: VH, deviceScaleFactor: DSF });
    await page.goto(rec.url, { waitUntil: "load", timeout: 120000 });
    await page.mouse.move(3, VH - 3);
    if (cs.threads) {
      await page.waitForFunction(() => window.__knotPerf?.().state && window.__knotPerf().state !== "loading", { timeout: 120000, polling: 200 });
    } else {
      // The reveal is attached once the loader hands over.
      await page.waitForFunction(() => !!window.__knotRenderer?.()?.revealFx?.revealAnim, { timeout: 120000, polling: 50 });
    }
    try { await page.waitForFunction(() => window.__knotOutline?.stats.replies > 0, { timeout: 60000, polling: 100 }); } catch (e) { console.log(cs.name, "no replies", rec.errors.slice(0, 4)); throw e; }
    rec.freeze = await page.evaluate(async () => {
      let f = null;
      if (typeof window.__knotPhysFreeze === "function") f = await window.__knotPhysFreeze(true);
      else window.__knotPS().step = function () {};
      const r = window.__knotRenderer();
      r.pulseBorn = 0;
      const bg = window.__knotBackgroundLayer?.();
      if (bg) bg.tick = () => false;
      const fx = r.revealFx;
      fx.tickAppearFx = () => {};
      if (fx.appearFxSys) fx.appearFxSys.container.renderable = false;
      if (fx.revealTipGfx) fx.revealTipGfx.renderable = false;
      window.__knotLoop?.({ continuous: true });
      return f;
    });
    const settle = async () => {
      await page.evaluate(() => window.__knotOutline.resend());
      await sleep(400);
      try { await page.waitForFunction(() => window.__knotOutline.settled, { timeout: 30000, polling: 200 }); } catch (e) { console.log(cs.name, "not settled", rec.errors.slice(0, 4)); throw e; }
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r)))));
      await sleep(250);
    };
    await page.evaluate(() => {
      const st = document.createElement("style");
      st.textContent = "body * { visibility: hidden !important; } canvas[data-k1291] { visibility: visible !important; }";
      let c = null; let area = -1;
      for (const k of document.querySelectorAll("canvas")) {
        if (k.id === "knot-loading-canvas") continue;
        const r = k.getBoundingClientRect();
        if (r.width * r.height >= area) { area = r.width * r.height; c = k; }
      }
      c.setAttribute("data-k1291", "1");
      document.head.appendChild(st);
    });
    const look = async (on) => {
      await page.evaluate((v) => window.__knotOutline.show(v), on);
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r)))));
      await sleep(200);
      return shot(page);
    };
    // Screen samples of every app chain (css px) and its mask now.
    const chainsNow = () => page.evaluate(() => {
      const r = window.__knotRenderer(); const v = window.__knotView();
      const M = r.revealFx.revealMask;
      return r.chainSamples.map((s, c) => {
        if (!s) return null;
        const pts = new Array(2 * s.count);
        for (let k = 0; k < s.count; k++) { pts[2 * k] = s.positions[2 * k] * v.s + v.x; pts[2 * k + 1] = s.positions[2 * k + 1] * v.s + v.y; }
        const m = M[c] ? Array.from(M[c]) : null;
        const step = (s.totalLength / (s.closed ? s.count : s.count - 1)) * v.s;
        return { c, pts, m, closed: s.closed, step, partial: !!m && m.some((t) => t < 0.999) };
      }).filter(Boolean);
    });
    const capture = async (label, chains, cropAt) => {
      const shO = await look(true), shT = await look(false), shN = await look(null);
      await look(true);
      await put("O", shO); await put("T", shT); await put("N", shN);
      writeFileSync(join(outDir, `${cs.name}_${label}_outline.png`), Buffer.from(shO, "base64"));
      writeFileSync(join(outDir, `${cs.name}_${label}_today.png`), Buffer.from(shT, "base64"));
      const res = await ana.evaluate((F, NR, D, ch) => window.measure(F, NR, D, ch), FOOT, NEAR, DSF, chains.map(({ c, pts, step, partial }) => ({ c, pts, step, partial })));
      const spots = [...cropAt];
      if (res.pastSpot) spots.push({ why: "past", x: res.pastSpot[0], y: res.pastSpot[1] });
      const wm = [...res.fronts].sort((a, b) => b.mismatched - a.mismatched)[0];
      if (wm && wm.misAt.length && wm.mismatched > 3) spots.push({ why: `mis_c${wm.c}`, x: wm.misAt[0][0], y: wm.misAt[0][1] });
      res.crops = [];
      for (const [i, sp] of spots.entries()) {
        const b = await ana.evaluate((C, D, x, y) => window.cropRow(C, D, x, y), CROP, DSF, sp.x, sp.y);
        const f = join(outDir, "crops", `${cs.name}_${label}_${i}_${sp.why}.png`);
        writeFileSync(f, Buffer.from(b, "base64"));
        res.crops.push(f);
      }
      delete res.pastSpot;
      return res;
    };
    // Crop spots from the masks: front tips (mask falls to 0), the ones
    // within 2 widths of another chain, and a ring's wrap (sample 0).
    const spotsFor = (chains) => {
      const tips = [];
      for (const ch of chains) {
        if (!ch.m) continue;
        const n = ch.m.length;
        for (let k = 0; k < n; k++) {
          const j = k + 1 < n ? k + 1 : ch.closed ? 0 : -1;
          if (j < 0) continue;
          const a = ch.m[k] > 0.02, b = ch.m[j] > 0.02;
          if (a !== b) { const t = a ? k : j; tips.push({ c: ch.c, k: t, x: ch.pts[2 * t], y: ch.pts[2 * t + 1] }); }
        }
      }
      const near = (t) => chains.some((o) => o.c !== t.c && o.pts.some((_, i) => i % 2 === 0 && Math.hypot(o.pts[i] - t.x, o.pts[i + 1] - t.y) < 30));
      const inView = (t) => t.x > 20 && t.y > 20 && t.x < VW - 20 && t.y < VH - 20;
      const out = [];
      const far = (p) => out.every((q) => Math.hypot(q.x - p.x, q.y - p.y) > CROP);
      for (const t of tips) if (inView(t) && !near(t) && far(t) && out.filter((o) => o.why === "front").length < 2) out.push({ ...t, why: "front" });
      for (const t of tips) if (inView(t) && near(t) && far(t) && out.filter((o) => o.why === "crossing").length < 2) out.push({ ...t, why: "crossing" });
      if (cs.ring) for (const ch of chains) if (ch.closed && ch.m && out.filter((o) => o.why === "wrap").length < 1) out.push({ c: ch.c, k: 0, x: ch.pts[0], y: ch.pts[1], why: "wrap" });
      return out;
    };

    if (!cs.threads) {
      const dur = await page.evaluate(() => window.__knotRenderer().revealFx.revealAnim.planDuration);
      rec.duration = dur;
      for (const fr of FRACS) {
        await page.evaluate((t) => window.__knotRenderer().revealFx.revealPin(t), fr * dur);
        await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
        await settle();
        const chains = await chainsNow();
        const label = `f${Math.round(fr * 100)}`;
        const rep0 = await page.evaluate(() => window.__knotOutline.stats.replies);
        const res = await capture(label, chains, fr < 1 ? spotsFor(chains) : []);
        const rep1 = await page.evaluate(() => window.__knotOutline.stats.replies);
        const partial = chains.filter((c) => c.partial).length;
        rec.states.push({ state: label, partialChains: partial, workerRepliesOverToggles: rep1 - rep0, ...res });
        console.log(`${cs.name} ${label}: partial chains ${partial}; IoU ${res.iou?.toFixed(4)} today ${res.footToday} outline ${res.footOutline}; past ${res.past} short ${res.short}; worst front shift ${res.worstShiftPx} px; replies over toggles ${rep1 - rep0}`);
      }
    } else {
      // Thread reveal: a few moves in, then mid-maze (greedy toward the finish).
      const moveTo = async (k) => {
        let made = 0;
        for (let i = 0; i < 200 && made < k; i++) {
          const f = await page.evaluate(() => { const f = window.__knotFabric(); return { solved: f.solved, opts: f.options?.() ?? f.moves ?? null }; });
          if (f.solved) break;
          const ok = await page.evaluate(() => {
            const f = window.__knotFabric();
            const opts = typeof f.options === "function" ? f.options() : f.moves;
            if (!opts || !opts.length) return false;
            const best = opts.reduce((a, b) => ((b.toFinish ?? 0) < (a.toFinish ?? 0) ? b : a));
            window.__knotTurnMove(best.edge);
            return true;
          });
          if (!ok) break;
          await page.waitForFunction(() => !window.__knotFabric().animating, { timeout: 30000, polling: 50 });
          made++;
        }
        return made;
      };
      let total = 0;
      for (const [label, k] of [["m3", 3], ["mid", 8]]) {
        total += await moveTo(k - total);
        await sleep(1200);
        await page.evaluate(() => { const F = window.__knotFabricRenderer?.(); if (F) { F.exploreClock = 1000; } });
        await settle();
        const chains = await chainsNow();
        const res = await capture(label, chains, []);
        rec.states.push({ state: label, moves: total, ...res });
        console.log(`${cs.name} ${label}: moves ${total}; IoU ${res.iou?.toFixed(4)} today ${res.footToday} outline ${res.footOutline}; past ${res.past} short ${res.short}`);
      }
    }
    if (rec.errors.length) console.log(`${cs.name}: page errors ${rec.errors.length}: ${rec.errors[0]}`);
    report.cases.push(rec);
    await page.close();
  }
} finally {
  writeFileSync(join(outDir, "reveal.json"), JSON.stringify(report, null, 1));
  await browser.close();
  try { rmSync(profileDir, { recursive: true, force: true }); } catch {}
}
