// K1220 Run N shooter: text forks (ai / a at xh 3 and xh 2) + maze x4 ji 102.
// Seed 7, 1600x1000 at dsf 3, each shot once the sim sleeps (k734.mjs's wait).
// Four ways per stand: normal / fans hidden / gap mask off / knot hidden (bg).
// Full-viewport shots to out/full/ (untracked); junction clips to out/.
//   node shoot.mjs <outDir>
//   env K1220N_HOST (default http://127.0.0.1:5970)
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { openBrowser, sleep, frames } from "./lib.mjs";
import { upscale3 } from "./crop.mjs";

const OUT = resolve(process.argv[2] || "out");
const FULL = join(OUT, "full");
mkdirSync(FULL, { recursive: true });
const HOST = process.env.K1220N_HOST || "http://127.0.0.1:5970";

const STANDS = [
  { id: "ai_xh3", q: "7&txt=ai&am=instant&snd=none&fw=0&phw=0", hash: "glyphs2", pick: "iFork" },
  { id: "ai_xh2", q: "7&txt=ai&am=instant&snd=none&fw=0&phw=0", hash: "glyphs2=xh2", pick: "iFork" },
  { id: "a_xh3", q: "7&txt=a&am=instant&snd=none&fw=0&phw=0", hash: "glyphs2", pick: "lr" },
  { id: "a_xh2", q: "7&txt=a&am=instant&snd=none&fw=0&phw=0", hash: "glyphs2=xh2", pick: "lr" },
  { id: "maze_x4", q: "k111&am=instant&fw=0&snd=none&phw=0&pr=8", hash: "", pick: "ji102", zoom: true },
];

async function loadStand(page, st) {
  const url = st.hash ? `${HOST}/?${st.q}#${st.hash}` : `${HOST}/?${st.q}`;
  await page.goto(url, { waitUntil: "load", timeout: 90000 });
  await page.bringToFront();
  await page.mouse.move(2, 2);
  await page.waitForFunction(() => window.__knotRenderer && window.__knotRenderer(), { timeout: 60000 });
  let asleep = false;
  for (const t0 = Date.now(); Date.now() - t0 < 60000; await sleep(300)) {
    asleep = await page.evaluate(() => { const p = window.__knotPerf ? window.__knotPerf() : null; return !!(p && p.asleep); });
    if (asleep) break;
  }
  await sleep(700);
  return asleep;
}

async function getInfo(page) {
  return page.evaluate(() => {
    const r = window.__knotRenderer(), v = window.__knotView();
    const fp = r.fieldProbe;
    const recs = [];
    const n = r.junctionArms ? r.junctionArms.length : 0;
    for (let ji = 0; ji < n; ji++) {
      const c = fp && fp.center(ji);
      if (!c) continue;
      let arms = [];
      try {
        arms = (fp.arms(ji) || []).map((a) => ({
          ang: typeof a.ang === "number" ? a.ang : Math.atan2(a.dy ?? 0, a.dx ?? 1),
          dx: a.dx ?? null, dy: a.dy ?? null, chain: a.chain, dir: a.dir, domain: a.domain ?? null,
        }));
      } catch { arms = []; }
      const jn = r.junctionArms[ji];
      const jArms = jn && jn.arms ? jn.arms.length : 0;
      // Pre-drop arm directions: tangent at the joint sample, outward.
      const rawArms = [];
      if (jn && jn.arms) for (const a of jn.arms) {
        const smp = r.chainSamples[a.chain];
        if (!smp) continue;
        const k = a.dir > 0 ? 0 : smp.count - 1;
        const tx = smp.tangents[k * 2] * a.dir, ty = smp.tangents[k * 2 + 1] * a.dir;
        rawArms.push({ ang: Math.atan2(ty, tx), chain: a.chain, dir: a.dir, slot: a.slot });
      }
      // Fan census near this centre: farthest fan vertex, by record.
      let fanMaxFh = 0; const fanRecs = {};
      try {
        const g = r.filletMesh && r.filletMesh.mesh.geometry;
        const pos = g && g.getBuffer("aPosition").data, recA = g && g.getBuffer("aRec").data;
        if (pos && recA) for (let i = 0; i < recA.length; i++) {
          const dx = pos[i * 2] - c[0], dy = pos[i * 2 + 1] - c[1];
          const d = Math.hypot(dx, dy);
          if (d < (r.style.threadWidth / 2) * 3) {
            const key = String(Math.round(recA[i] * 4) / 4);
            fanRecs[key] = (fanRecs[key] || 0) + 1;
            if (d / (r.style.threadWidth / 2) > fanMaxFh) fanMaxFh = d / (r.style.threadWidth / 2);
          }
        }
      } catch { /* no fan mesh yet */ }
      recs.push({ ji, wx: c[0], wy: c[1], sx: c[0] * v.s + v.x, sy: c[1] * v.s + v.y, nArms: arms.length, jArms, arms, rawArms, rb: fp ? fp.record(ji) : -1, fanMaxFh: +fanMaxFh.toFixed(3), fanRecs });
    }
    const el = [...document.querySelectorAll("div")].map((d) => d.textContent || "").find((t) => /^P\d/.test(t)) || "";
    return { recs, view: v, fh: r.style.threadWidth / 2, stamp: el.split(" | sim")[0], asleep: window.__knotPerf ? window.__knotPerf().asleep : null };
  });
}

function pickTargets(st, recs) {
  if (st.pick === "ji102") {
    const r = recs.find((x) => x.ji === 102);
    return r ? [{ ...r, tag: "ji102" }] : [];
  }
  if (st.pick === "iFork") {
    // k734: ji 0 is the i fork (junctionArms arms = 3, leftmost of "ai").
    // Text records keep < 2 field arms (the 0.15 arm-drop), so pick on jArms.
    const c = recs.filter((x) => x.jArms >= 2).sort((a, b) => a.wx - b.wx);
    return c.length ? [{ ...c[0], tag: "iFork" }] : [];
  }
  const c = recs.filter((x) => x.jArms >= 2).sort((a, b) => a.wx - b.wx);
  if (c.length < 2) return c.map((r, i) => ({ ...r, tag: "L" + i }));
  return [{ ...c[0], tag: "L" }, { ...c[c.length - 1], tag: "R" }];
}

const browser = await openBrowser();
const meta = { host: HOST, stands: [] };
try {
  for (const st of STANDS) {
    const page = await browser.newPage();
    const log = [];
    page.on("console", (m) => log.push(`[${m.type()}] ${m.text()}`));
    page.on("pageerror", (e) => log.push(`[pageerror] ${e.message}`));
    await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 3 });
    const cdp = await page.createCDPSession();
    await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
    await page.evaluateOnNewDocument(() => { window.__knotLoopMode = "continuous"; window.__ctxLost = 0; document.addEventListener("webglcontextlost", () => { window.__ctxLost++; }, true); });
    const asleep = await loadStand(page, st);
    let info = await getInfo(page);
    if (st.zoom && info.view.s < 55) {
      const t0 = pickTargets(st, info.recs)[0];
      if (t0) {
        for (let k = 0; k < 3 && info.view.s < 55; k++) {
          await page.mouse.move(Math.max(10, Math.min(1590, t0.sx)), Math.max(10, Math.min(990, t0.sy)));
          await page.keyboard.down("Control");
          await page.mouse.wheel({ deltaY: -300 });
          await page.keyboard.up("Control");
          await sleep(500);
          info = await getInfo(page);
        }
        await page.mouse.move(2, 2);
        await sleep(400);
      }
    }
    const targets = pickTargets(st, info.recs);
    console.log(`${st.id}: asleep=${asleep} recs=${info.recs.length} targets=${targets.map((t) => "ji" + t.ji + "(" + t.tag + ",arms" + t.nArms + ",rb" + t.rb + ")").join(" ")} s=${info.view.s.toFixed(1)} fh=${info.fh} stamp=${info.stamp}`);
    for (const r of info.recs) console.log(`  ji${r.ji} arms=${r.nArms} rb=${r.rb} world ${r.wx.toFixed(2)},${r.wy.toFixed(2)} screen ${r.sx.toFixed(0)},${r.sy.toFixed(0)}`);
    const S = 180;
    const clipFor = (rec) => ({ x: Math.max(0, Math.round(rec.sx - S / 2)), y: Math.max(0, Math.round(rec.sy - S / 2)), width: S, height: S });
    const shotWay = async (way) => {
      writeFileSync(join(FULL, `${st.id}_${way}.png`), await page.screenshot({ type: "png" }));
      for (const rec of targets) {
        const buf = await page.screenshot({ type: "png", clip: clipFor(rec) });
        writeFileSync(join(OUT, `${st.id}_ji${rec.ji}_${way}_1x.png`), buf);
        writeFileSync(join(OUT, `${st.id}_ji${rec.ji}_${way}_3x.png`), upscale3(buf));
      }
    };
    await shotWay("normal");
    await page.evaluate(() => { const r = window.__knotRenderer(); if (r.filletMesh) r.filletMesh.mesh.renderable = false; if (r.filletTopMesh) r.filletTopMesh.mesh.renderable = false; });
    await frames(page, 3); await sleep(200);
    await shotWay("hidden");
    await page.evaluate(() => { const r = window.__knotRenderer(); if (r.filletMesh) r.filletMesh.mesh.renderable = true; if (r.filletTopMesh) r.filletTopMesh.mesh.renderable = true; });
    await frames(page, 3); await sleep(200);
    await page.evaluate(() => { const r = window.__knotRenderer(); r.maskEnabled = false; r.update(); r.rebuildFillets(true); });
    await frames(page, 3); await sleep(200);
    await shotWay("nomask");
    await page.evaluate(() => { const r = window.__knotRenderer(); r.maskEnabled = true; r.update(); r.rebuildFillets(true); });
    await frames(page, 3); await sleep(200);
    await page.evaluate(() => { window.__knotRenderer().root.renderable = false; });
    await frames(page, 3); await sleep(200);
    writeFileSync(join(FULL, `${st.id}_bg.png`), await page.screenshot({ type: "png" }));
    await page.evaluate(() => { window.__knotRenderer().root.renderable = true; });
    await frames(page, 3);
    const ctxLost = await page.evaluate(() => window.__ctxLost);
    console.log(`  ctxLost=${ctxLost}`);
    meta.stands.push({ id: st.id, q: st.q, hash: st.hash, asleep, info, targets, ctxLost, log: log.slice(-20) });
    await page.close();
  }
} finally { await browser.close(); }
writeFileSync(join(OUT, "meta.json"), JSON.stringify(meta, null, 1));
console.log("wrote meta.json");
