// K1291 s1: rp=outline against today's look on ONE frozen page.
//   node .claude/probes/K1291/k1291_ab.mjs <base> <outDir> palette|overlay [case...]
// Each case loads its link + &rp=outline, waits for the outline, freezes the
// physics (__knotPhysFreeze), pins the paint clocks (probes.md K83 recipe),
// re-sends the outline and waits until it holds the frozen pose. Then
// __knotOutline.show(true|false|null) flips the same page between the
// outline, today's base + fillet layers, and neither (the threads' mask).
// palette: the app's section run table (KSTATIC: run per ctrl slot) gives
//   each run's middle slot; its particle is on the centreline; the 3x3 mean
//   colour there, today vs outline (max channel |diff|, 0-255).
// overlay: three game states (3 moves, half the fewest, solved; greedy
//   fewest-move choices); at each, the gameplay paint on and off
//   (knotUniformValues().uKPaint.x, shared by both looks): footprint = the
//   inside-thread pixels whose colour moves > FOOT when the paint goes on;
//   their overlap (IoU) and the colour |today - outline| over the pixels in
//   both footprints (median, p99); crop rows today | rp=outline | |diff| at
//   three footprint spots per state.
// Headed hardware-GPU Chrome off-screen, real time. Never virtual time.
import puppeteer from "puppeteer-core";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const [, , base, outDir, mode = "palette", ...only] = process.argv;
mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const VW = 1240, VH = 900, DSF = 2, FOOT = 10, MASK = 14, CROP = 160;
const Q = "&am=instant&snd=none";
const DEF = "?s=b";
const MUSE = "?3&cr=6&bg=wash&bgcm=custom&bgc0=e6e9ee";
const RING = "?s=1rphqy1&gs=12&shp=ring&wd=.45&sl=1&dr=.75&rep=1.45&bd=2.5&sm=.6&ga=.2&tw=.64&gap=.04&cr=3&fl=0&fv=1";
const CASES = mode === "palette"
  ? [
    { name: "def_segments", link: DEF }, { name: "def_strands", link: `${DEF}&cs=strands` },
    { name: "muse_segments", link: MUSE }, { name: "muse_strands", link: `${MUSE}&cs=strands` },
    { name: "ring_segments", link: RING }, { name: "ring_strands", link: `${RING}&cs=strands` },
  ]
  : [
    { name: "def_gold", link: DEF, toggle: "paint" },
    { name: "def_trail", link: `${DEF}&pv=trail`, toggle: "paint" },
    { name: "def_fog", link: `${DEF}&xp=fog`, toggle: "fog" },
  ];
const cases = only.length ? CASES.filter((c) => only.includes(c.name)) : CASES;

const profileDir = join(tmpdir(), `k1291-ab-${process.pid}`);
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
const report = { base, mode, cases: [] };
// The analysis page: decodes screenshots, compares, draws crop rows.
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
  window.q = (a) => {
    if (!a.length) return { n: 0, median: null, p99: null, max: null };
    const s = Float64Array.from(a).sort();
    const at = (p) => s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))];
    return { n: s.length, median: at(0.5), p99: at(0.99), max: s[s.length - 1] };
  };
});
const shot = async (page) => Buffer.from(await page.screenshot({ type: "png" })).toString("base64");
const put = (k, b64) => ana.evaluate((k, b) => window.put(k, b), k, b64);

try {
  for (const cs of cases) {
    const page = await browser.newPage();
    const rec = { name: cs.name, url: `${base}/${cs.link}${Q}&rp=outline`, errors: [] };
    page.on("pageerror", (e) => rec.errors.push(String(e.message).slice(0, 300)));
    page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") rec.errors.push(`${m.type()}: ${m.text()}`.slice(0, 300)); });
    await page.setViewport({ width: VW, height: VH, deviceScaleFactor: DSF });
    await page.goto(rec.url, { waitUntil: "load", timeout: 120000 });
    await page.waitForFunction(() => window.__knotPerf?.().state && window.__knotPerf().state !== "loading", { timeout: 120000, polling: 200 });
    await page.waitForFunction(() => window.__knotOutline?.stats.replies > 0, { timeout: 120000, polling: 200 });
    await page.mouse.move(3, VH - 3);
    rec.freeze = await page.evaluate(async () => {
      let f = null;
      if (typeof window.__knotPhysFreeze === "function") f = await window.__knotPhysFreeze(true);
      else window.__knotPS().step = function () {};
      const r = window.__knotRenderer();
      r.advanceClocks = () => {};
      r.paintClock = 100;
      r.pulseBorn = 0;
      const bg = window.__knotBackgroundLayer?.();
      if (bg) bg.tick = () => false;
      window.__knotLoop?.({ continuous: true });
      window.__knotOutline.resend();
      return f;
    });
    const settle = async () => {
      await sleep(400);
      await page.waitForFunction(() => window.__knotOutline.settled, { timeout: 120000, polling: 200 });
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r)))));
      await sleep(250);
    };
    await settle();
    rec.stamp = await page.evaluate(() => document.querySelector("#build-stamp, .build-stamp")?.textContent ?? window.__knotPerf?.().build ?? "");
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
    const paintOn = (on) => page.evaluate(async (v, kind) => {
      if (kind === "fog") {
        const F = window.__knotFabricRenderer();
        if (F.fogSprite) F.fogSprite.renderable = !!v;
        if (F.fogBackdrop?.mesh) F.fogBackdrop.mesh.renderable = !!v;
        return;
      }
      const pm = await import("/src/render/paint_model.ts");
      pm.knotUniformValues().uKPaint[0] = v;
    }, on ? 1 : 0, cs.toggle);
    const view = () => page.evaluate(() => window.__knotView());

    if (mode === "palette") {
      const pts = await page.evaluate(async () => {
        const pm = await import("/src/render/paint_model.ts");
        const d = pm.kData().stat;
        const r = window.__knotRenderer();
        const sc = r.paintState.paintScene;
        const ps = window.__knotPS();
        const v = window.__knotView();
        const out = [];
        // Screen segments of every chain; clear() = no segment of another
        // chain (or of this chain more than 6 slots away) within R px.
        const R = 14;
        const segs = [];
        for (let c = 0; c < ps.chains.length; c++) {
          const ch = ps.chains[c];
          for (let k = 0; k + 1 < ch.length; k++) {
            const p = ch[k], q = ch[k + 1];
            segs.push([c, k, ps.positions[2 * p] * v.s + v.x, ps.positions[2 * p + 1] * v.s + v.y, ps.positions[2 * q] * v.s + v.x, ps.positions[2 * q + 1] * v.s + v.y]);
          }
        }
        const clear = (c, m, x, y) => {
          const n = ps.chains[c].length;
          for (const [sc2, k, ax, ay, bx, by] of segs) {
            if (sc2 === c) { const dk = Math.abs(k - m); if (Math.min(dk, n - dk) <= 6) continue; }
            const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
            const tt = L > 0 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L)) : 0;
            const ex = ax + tt * dx - x, ey = ay + tt * dy - y;
            if (ex * ex + ey * ey < R * R) return false;
          }
          return true;
        };
        for (let c = 0; c < sc.chains.length; c++) {
          const n = sc.chains[c].nCtrl;
          const b = sc.idxBase[c];
          const run = (s) => d[(b + s) * 4];
          const closed = sc.chains[c].closed;
          // Contiguous groups (a ring's wrap group joined).
          const groups = [];
          let s0 = 0;
          for (let s = 1; s <= n; s++) {
            if (s === n || run(s) !== run(s0)) { groups.push([s0, s, run(s0)]); s0 = s; }
          }
          if (closed && groups.length > 1 && groups[0][2] === groups[groups.length - 1][2]) {
            const last = groups.pop();
            groups[0] = [last[0], groups[0][1] + n, last[2]];
          }
          for (const [a, e, id] of groups) {
            if (e - a < 3) continue;
            // The slot nearest the middle whose centre is clear of every
            // other thread (a run's middle can sit under a crossing).
            const mid = (a + e - 1) / 2;
            const order = [];
            for (let s = a + 1; s < e - 1; s++) order.push(s);
            order.sort((u, w) => Math.abs(u - mid) - Math.abs(w - mid));
            let pick = null;
            for (const s of order) {
              const m = s % n;
              const p = ps.chains[c][m];
              const x = ps.positions[2 * p] * v.s + v.x, y = ps.positions[2 * p + 1] * v.s + v.y;
              if (clear(c, m, x, y)) { pick = { m, x, y }; break; }
            }
            if (!pick) { out.push({ c, run: id, slots: e - a, blocked: true }); continue; }
            out.push({ c, run: id, slots: e - a, slot: pick.m, sx: pick.x, sy: pick.y });
          }
        }
        return out;
      });
      const shO = await look(true), shT = await look(false);
      writeFileSync(join(outDir, `${cs.name}_outline.png`), Buffer.from(shO, "base64"));
      writeFileSync(join(outDir, `${cs.name}_today.png`), Buffer.from(shT, "base64"));
      writeFileSync(join(outDir, `${cs.name}_pts.json`), JSON.stringify(pts));
      await put("out", shO);
      await put("today", shT);
      rec.palette = await ana.evaluate((pts, DSF) => {
        const A = window.imgs.today, B = window.imgs.out;
        const mean = (I, x, y) => {
          const o = [0, 0, 0];
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const i = ((y + dy) * I.w + (x + dx)) * 4;
            o[0] += I.d[i]; o[1] += I.d[i + 1]; o[2] += I.d[i + 2];
          }
          return o.map((t) => t / 9);
        };
        const diffs = [];
        const worst = [];
        let off = 0;
        let blocked = 0;
        for (const p of pts) {
          if (p.blocked) { blocked++; continue; }
          const x = Math.round(p.sx * DSF), y = Math.round(p.sy * DSF);
          if (x < 2 || y < 2 || x >= A.w - 2 || y >= A.h - 2) { off++; continue; }
          const a = mean(A, x, y), b = mean(B, x, y);
          const dd = Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
          diffs.push(dd);
          worst.push({ ...p, today: a.map(Math.round), outline: b.map(Math.round), d: Math.round(dd * 10) / 10 });
        }
        worst.sort((u, v) => v.d - u.d);
        return { runs: pts.length, blocked, offscreen: off, diff: window.q(diffs), over8: diffs.filter((t) => t > 8).length, over3: diffs.filter((t) => t > 3).length, worst: worst.slice(0, 8) };
      }, pts, DSF);
      console.log(`${cs.name}: runs ${rec.palette.runs} (blocked ${rec.palette.blocked}, off ${rec.palette.offscreen}), diff median ${rec.palette.diff.median?.toFixed(2)} p99 ${rec.palette.diff.p99?.toFixed(2)} max ${rec.palette.diff.max?.toFixed(2)}, >3: ${rec.palette.over3}, >8: ${rec.palette.over8}, errors ${rec.errors.length}`);
    } else {
      // Overlay states: greedy fewest-move choices.
      const fewest0 = await page.evaluate(() => window.__knotFabric().fewest);
      const plan = [["few", 3], ["mid", Math.max(4, Math.floor(fewest0 / 2))], ["solved", 100000]];
      let made = 0;
      rec.states = [];
      for (const [st, upTo] of plan) {
        while (made < upTo) {
          const f = await page.evaluate(() => window.__knotFabric());
          if (!f || f.solved) break;
          const best = f.choiceMoves.slice().sort((a, b) => a.moves - b.moves)[0];
          if (!best) break;
          await page.evaluate((e) => window.__knotTurnMove(e), best.edge);
          made++;
          await page.waitForFunction(() => !window.__knotFabric().animating, { timeout: 30000, polling: 50 });
        }
        // The camera still (fog-fit eases), the paint settled.
        await page.evaluate(async () => {
          const raf = () => new Promise((r) => requestAnimationFrame(r));
          let last = ""; let same = 0;
          for (let i = 0; i < 600 && same < 10; i++) {
            await raf();
            const w = window.__knotView(); const k = `${w.s},${w.x},${w.y}`;
            same = k === last ? same + 1 : 0; last = k;
          }
        });
        await sleep(1500);
        const fab = await page.evaluate(() => { const f = window.__knotFabric(); return { head: f.head, solved: f.solved, pathLength: f.pathLength, taps: f.taps }; });
        const rep0 = await page.evaluate(() => window.__knotOutline.stats.replies);
        await paintOn(true);
        await put("outOn", await look(true));
        await put("todayOn", await look(false));
        await paintOn(false);
        await put("outOff", await look(true));
        await put("todayOff", await look(false));
        await put("bg", await look(null));
        await paintOn(true);
        await look(true);
        // The overlay toggles redrew from the cached build: no worker reply.
        const rep1 = await page.evaluate(() => window.__knotOutline.stats.replies);
        const res = await ana.evaluate((FOOT, MASK, CROP, DSF) => {
          const I = window.imgs;
          const W = I.bg.w, H = I.bg.h;
          const dmax = (P, Qi, i) => Math.max(Math.abs(P.d[i] - Qi.d[i]), Math.abs(P.d[i + 1] - Qi.d[i + 1]), Math.abs(P.d[i + 2] - Qi.d[i + 2]));
          let nT = 0, nO = 0, nI = 0, nU = 0;
          const col = [];
          const insideBoth = [];
          const foot = new Uint8Array(W * H);
          for (let p = 0; p < W * H; p++) {
            const i = 4 * p;
            // Inside the thread: the overlay-off frame differs from the
            // threads-hidden frame and is bright (no border, no shadow).
            const br = (P) => Math.max(P.d[i], P.d[i + 1], P.d[i + 2]) > 80;
            const inT = dmax(I.todayOff, I.bg, i) > MASK && br(I.todayOff);
            const inO = dmax(I.outOff, I.bg, i) > MASK && br(I.outOff);
            if (!(inT && inO)) continue;
            const fT = dmax(I.todayOn, I.todayOff, i) > FOOT;
            const fO = dmax(I.outOn, I.outOff, i) > FOOT;
            if (fT) nT++;
            if (fO) nO++;
            if (fT || fO) nU++;
            if (fT && fO) { nI++; col.push(dmax(I.todayOn, I.outOn, i)); foot[p] = 1; }
            insideBoth.push(dmax(I.todayOn, I.outOn, i));
          }
          // Crop spots: footprint pixels, the densest 3 cells of a coarse grid.
          const G = 40;
          const cells = new Map();
          for (let p = 0; p < W * H; p++) if (foot[p]) { const k = `${Math.floor((p % W) / G)},${Math.floor(p / W / G)}`; cells.set(k, (cells.get(k) ?? 0) + 1); }
          const ranked = [...cells.entries()].sort((a, b) => b[1] - a[1]);
          const spots = [];
          for (const [k] of ranked) {
            const [cx, cy] = k.split(",").map(Number);
            const x = cx * G + G / 2, y = cy * G + G / 2;
            if (spots.every((s) => Math.hypot(s[0] - x, s[1] - y) > CROP * DSF)) spots.push([x, y]);
            if (spots.length === 3) break;
          }
          return {
            footToday: nT, footOutline: nO, inter: nI, union: nU, iou: nU ? nI / nU : null,
            colour: window.q(col), insideBoth: window.q(insideBoth),
            spots: spots.map(([x, y]) => [Math.max(0, x / DSF - CROP / 2), Math.max(0, y / DSF - CROP / 2)]),
          };
        }, FOOT, MASK, CROP, DSF).catch((e) => ({ error: String(e) }));
        rec.states.push({ state: st, moves: made, fab, workerReplies: rep1 - rep0, ...res });
        console.log(`${cs.name} ${st}: moves ${made} solved ${fab.solved}; worker replies over the toggles ${rep1 - rep0}; footprint today ${res.footToday} outline ${res.footOutline} IoU ${res.iou?.toFixed(3)}; colour median ${res.colour?.median} p99 ${res.colour?.p99}; inside-both median ${res.insideBoth?.median} p99 ${res.insideBoth?.p99}`);
        // Crop rows, re-drawn in-page as PNG data.
        const rowsB64 = await ana.evaluate(async (CROP, DSF, spots) => {
          const I = window.imgs; const W = I.bg.w, H = I.bg.h; const S = CROP * DSF;
          const out = [];
          for (const [sx, sy] of spots) {
            const x0 = Math.round(sx * DSF), y0 = Math.round(sy * DSF);
            const c = new OffscreenCanvas(3 * S + 8, S);
            const g = c.getContext("2d");
            g.fillStyle = "#777"; g.fillRect(0, 0, c.width, c.height);
            const put = (src, ox, diff) => {
              const im = new ImageData(S, S);
              for (let yy = 0; yy < S; yy++) for (let xx = 0; xx < S; xx++) {
                const i = (Math.min(H - 1, y0 + yy) * W + Math.min(W - 1, x0 + xx)) * 4, o = (yy * S + xx) * 4;
                for (let k = 0; k < 3; k++) im.data[o + k] = diff ? Math.abs(I.todayOn.d[i + k] - I.outOn.d[i + k]) : src.d[i + k];
                im.data[o + 3] = 255;
              }
              g.putImageData(im, ox, 0);
            };
            put(I.todayOn, 0, false);
            put(I.outOn, S + 4, false);
            put(null, 2 * S + 8, true);
            const b = await c.convertToBlob({ type: "image/png" });
            const u = new Uint8Array(await b.arrayBuffer());
            let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
            out.push(btoa(s));
          }
          return out;
        }, CROP, DSF, res.spots ?? []);
        mkdirSync(join(outDir, "crops"), { recursive: true });
        rowsB64.forEach((b, i) => writeFileSync(join(outDir, "crops", `${cs.name}_${st}_${i}.png`), Buffer.from(b, "base64")));
      }
    }
    report.cases.push(rec);
    await page.close();
  }
} finally {
  writeFileSync(join(outDir, `${mode}.json`), JSON.stringify(report, null, 1));
  await browser.close();
  try { rmSync(profileDir, { recursive: true, force: true }); } catch {}
}
