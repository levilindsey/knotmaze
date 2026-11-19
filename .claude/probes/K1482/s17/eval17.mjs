// K1482 s17: the field's CPU twin (eval.ts GfEval) at device pixels of link A's frozen rest state, on the DEV server
// (it imports /src/render/gpu_field/eval.ts into the page). cap15.mjs's recipe: load with rp=gf, freeze, step to SIMT,
// reload until the physics hash is HASH. Prints per pixel: ink, cov, label chain, winning outline term (winKind:
// 1 side (winA chain, winB side), 2 fillet arc (winA corner), 3 cap/end, 4 fillet tangent point, 5 through-pass arc).
//   node eval17.mjs <base> <profileDir> "<x,y;x,y;...>" [R=0]   env HASH=fff8c9e5 SIMT=20 TRIES=8 QUERY=...
import puppeteer from "puppeteer-core";
const [, , base, profileDir, ptsArg, Rarg = "0"] = process.argv;
const DBG = process.env.DBG === "1";
const R = +Rarg, SIMT = +(process.env.SIMT ?? 20), TRIES = +(process.env.TRIES ?? 8), HASH = process.env.HASH ?? "fff8c9e5";
const query = process.env.QUERY ?? "3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1";
const pts = ptsArg.split(";").filter(Boolean).map((s) => s.split(",").map(Number));
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: profileDir, protocolTimeout: 1800000,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1660,1060",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
const T0 = Date.now(); const T = () => ((Date.now() - T0) / 1000).toFixed(0) + "s";
try {
  for (let k = 0; k < TRIES; k++) {
    const page = await browser.newPage();
    page.on("pageerror", (e) => console.log(`pageerror ${e.message.slice(0, 200)}`));
    await page.evaluateOnNewDocument(() => { window.__knotLoopMode = "continuous"; try { localStorage.setItem("knotmaze.panelOpen", "0"); } catch {} });
    await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 2 });
    await page.goto(`${base}/?${query}&phw=0&snd=none&prp=off&rp=gf`, { waitUntil: "load", timeout: 900000 });
    await page.bringToFront();
    await page.waitForFunction(() => { const s = window.__knotPerf?.()?.state; return s && s !== "loading"; }, { timeout: 900000, polling: 300 });
    await page.waitForFunction(() => (globalThis.__knotGf?.stats?.switchedMs ?? -1) > 0 && globalThis.__knotGf.stats.composites > 0, { timeout: 900000, polling: 300 });
    const h = await page.evaluate(async (t) => {
      await window.__knotPhysFreeze(true); await window.__knotStepUntil(t);
      const r = window.__knotRenderer(); r.advanceClocks = () => {}; r.paintClock = 100; r.pulseBorn = 0;
      window.__knotLoop?.({ continuous: true });
      const d = await window.__knotPhysDump(); const hh = d?.hashes ?? d; return String(hh?.all ?? JSON.stringify(hh).slice(0, 80));
    }, SIMT);
    if (h !== HASH) { console.log(T(), `hash ${h} != ${HASH}, reload`); await page.close(); continue; }
    // let the gf pass rebuild its tables for the frozen state
    const c0 = await page.evaluate(() => { globalThis.__knotGfOpts = { ...(globalThis.__knotGfOpts ?? {}), redraw: true }; globalThis.__knotGf.redraw(); return globalThis.__knotGf.stats.composites; });
    await page.waitForFunction((c) => globalThis.__knotGf.stats.composites > c + 2, { timeout: 900000, polling: 200 }, c0);
    const out = await page.evaluate(async (pts, R, DBG) => {
      const { GfEval } = await import("/src/render/gpu_field/eval.ts");
      const T = globalThis.__knotGf.tables; const r = window.__knotRenderer();
      const ev = new GfEval({ ...T, homeOn: globalThis.__knotGfHome === true }); ev.fadeLength = Math.max(0, r.fadeLength);
      const wt = r.root.worldTransform; const dpr = window.devicePixelRatio;
      const A = [wt.a * dpr, wt.b * dpr, wt.c * dpr, wt.d * dpr, wt.tx * dpr, wt.ty * dpr];
      const lines = [`toDevA ${A.map((v) => v.toFixed(4)).join(",")} homeOn ${globalThis.__knotGfHome === true} T.homeOn ${T.homeOn} fade ${ev.fadeLength} h ${T.h} W ${T.W} aa ${T.aa}`];
      for (const [x0, y0] of pts) for (let y = y0 - R; y <= y0 + R; y++) for (let x = x0 - R; x <= x0 + R; x++) {
        const wx = (x + 0.5 - A[4]) / A[0], wy = (y + 0.5 - A[5]) / A[3];
        const o = ev.eval(wx, wy);
        lines.push(`(${x},${y}) ink ${o.ink.toFixed(2)} cov ${o.cov.toFixed(2)} ch ${o.chain} s ${o.s.toFixed(2)} win ${o.winKind}/${o.winA}/${o.winB} seg ${o.nSeg} k ${o.nK}`);
        if (DBG) {
          // DBG: the pieces (chain, d - h, s, end, group, ramp, surface) and the vertex cap's pair tests, line for line
          const f = (v) => (Math.abs(v) < 1e-3 && v !== 0 ? v.toExponential(1) : v.toFixed(3));
          const e = ev; const h = T.h, aa = T.aa, W = T.W;
          for (let j = 0; j < e.np; j++) lines.push(`   p${j} c${e.pc[j]} d-h ${f(e.pd[j] - h)} s ${f(e.ps[j])} lo ${e.plo[j]} hi ${e.phi[j]} end ${e.pend[j]} g ${e.pg[j]} ramp ${f(e.pramp[j])} surf ${e.psurf[j]} key ${f(e.pkey[j])}`);
          for (let i = 0; i < e.ns; i++) lines.push(`   S${e.sid[i]} v ${f(e.sv[i])} a ${f(e.sa[i])} wk ${e.swk[i]}/${e.swa[i]}`);
          for (let j = 0; j < e.np; j++) for (let m = j + 1; m < e.np; m++) {
            const Xj = e.pd[j], Xm = e.pd[m];
            let why = "";
            if (e.psurf[j] !== e.psurf[m]) why = "surf differ";
            else if (!(Xj < h + W + aa) || !(Xm < h + W + aa)) why = "far";
            else {
              const njx = (wx - e.pfx[j]) / Xj, njy = (wy - e.pfy[j]) / Xj, cj = h - Xj;
              const nmx = (wx - e.pfx[m]) / Xm, nmy = (wy - e.pfy[m]) / Xm, cm = h - Xm;
              const det = njx * nmy - njy * nmx;
              if (!(Math.abs(det) > 1e-6)) why = "det";
              else {
                const r0x = (cj * nmy - cm * njy) / det, r0y = (njx * cm - nmx * cj) / det;
                const r0 = Math.hypot(r0x, r0y);
                if (!(r0 < 2 * (W + aa))) why = `r0 ${f(r0)} >= 2(W+aa) ${f(2 * (W + aa))}`;
                else {
                  const V0x = wx + r0x, V0y = wy + r0y;
                  const ej = e.pieceF(j, V0x, V0y); const gjx = e.fX, gjy = e.fY; const em = e.pieceF(m, V0x, V0y); const gmx = e.fX, gmy = e.fY;
                  const rj = Math.sqrt(ej), rm = Math.sqrt(em);
                  const ujx = (V0x - gjx) / rj, ujy = (V0y - gjy) / rj, kj = h + ujx * (gjx - wx) + ujy * (gjy - wy);
                  const umx = (V0x - gmx) / rm, umy = (V0y - gmy) / rm, km = h + umx * (gmx - wx) + umy * (gmy - wy);
                  const det2 = ujx * umy - ujy * umx;
                  const Vx = wx + (kj * umy - km * ujy) / det2, Vy = wy + (ujx * km - umx * kj) / det2;
                  const dV = Math.hypot(wx - Vx, wy - Vy);
                  const oj = Math.sqrt(e.pieceD(j, Vx, Vy)) - h, om = Math.sqrt(e.pieceD(m, Vx, Vy)) - h;
                  let vb = 0, vbBy = "";
                  for (let n = 0; n < e.np; n++) { if (n === j || n === m || e.psurf[n] !== e.psurf[j]) continue; const dn = Math.sqrt(e.pieceD(n, Vx, Vy)) - h; if (dn < 0 && 1 > vb) { vb = 1; vbBy += ` p${n}(${f(dn)})`; } else if (dn < aa) vbBy += ` p${n}~(${f(dn)})`; }
                  why = `V0 r ${f(r0)} V dev (${(Vx * A[0] + A[4]).toFixed(1)},${(Vy * A[3] + A[5]).toFixed(1)}) dV ${f(dV)} (W+aa ${f(W + aa)}) onj ${f(oj)} onm ${f(om)} (aa ${f(aa)}) bur${vbBy || " none"}`;
                }
              }
            }
            lines.push(`   pair p${j}/p${m}: ${why}`);
          }
        }
      }
      return lines.join("\n");
    }, pts, R, DBG);
    console.log(T(), `hash ${h}`); console.log(out);
    await page.close();
    break;
  }
} finally { await browser.close(); }
