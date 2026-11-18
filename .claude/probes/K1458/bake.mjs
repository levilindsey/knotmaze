// K1458: gf's gap-window bake along one crossing's under chain, with lkGap's far reach replicated in JS on the
// field's vertex table: per kept under sample, winM, the named over chain, its kept index and scan, the distance
// lkNearOn finds and the true nearest distance to that over chain. Stripes across the under thread at long fades
// are per-sample: this shows which term flips. Vite DEV server.
//   node bake.mjs <devBase> <profileDir> [fl=1.2] [ci=5]
import puppeteer from "puppeteer-core";
const [, , base, profileDir, fl = "1.2", ciArg = "5"] = process.argv;
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: profileDir,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1720,1000",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("pageerror", e.message));
  await page.evaluateOnNewDocument(() => { window.__knotLoopMode = "continuous"; });
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 2 });
  await page.goto(`${base}/?3&xp=off&am=instant&prp=off&phw=0&fw=0&bg=none&snd=none&rp=gf&fl=${fl}`, { waitUntil: "load", timeout: 900000 });
  await page.waitForFunction(() => { const s = window.__knotPerf?.()?.state; return s && s !== "loading"; }, { timeout: 900000, polling: 300 });
  await page.waitForFunction(() => (globalThis.__knotGf?.stats?.composites ?? 0) > 0, { timeout: 900000, polling: 300 });
  const out = await page.evaluate(async (ci) => {
    await window.__knotPhysFreeze(true);
    await window.__knotStepUntil(20);
    globalThis.__knotGf.rebuild();
    await new Promise((r) => setTimeout(r, 2500));
    const M = await import("/src/render/gpu_field/gf_look.ts");
    const PM = await import("/src/render/paint_math.ts");
    const r = window.__knotRenderer();
    const T = globalThis.__knotGf.tables;
    const xs = r.ps.crossings.map((c) => ({ overChain: c.over.chain, overCtrl: r.renderCtrl(c.over), underChain: c.under.chain, underCtrl: r.renderCtrl(c.under) }));
    const G = new M.GfGapTable(); G.wins = [];
    const V = G.values({
      kd: r.kd, kcv: r.kcv, chainSamples: r.chainSamples, crossings: xs,
      fillHalf: r.style.threadWidth / 2, margin: M.lookGap(r), fade: M.lookFade(r), joints: r.junctionArcCtrls,
      jointClear: M.gfJointClear(r.style.threadWidth / 2, r.FILLET_REACH_PER_HALF, r.cuspRadius, M.lookGap(r)),
    });
    let wn = 0, wp = 0;
    for (let i = 0; i < G.wins.length; i += 5) if (G.wins[i] === ci) { wn = G.wins[i + 1]; wp = G.wins[i + 2]; }
    // the chain's base in V: count + closed per valid chain, as values() lays it out (checked below)
    const cU = xs[ci].underChain, cO = xs[ci].overChain;
    let b = 0;
    for (let ch = 0; ch < cU; ch++) { const S = r.chainSamples[ch]; if (S && T.cNV[ch] > 0) b += S.count + (r.kcv[ch].closed ? 1 : 0); }
    const S = r.chainSamples[cU];
    const xy = S.positions; const kp = [];
    { let l = -1; for (let k = 0; k < S.count; k++) { if (l >= 0 && xy[2 * k] === xy[2 * l] && xy[2 * k + 1] === xy[2 * l + 1]) continue; kp.push(k); l = k; } }
    const kc = r.kcv[cU];
    const uC = PM.kArcOfCtrl(r.kd, kc, xs[ci].underCtrl);
    const per = r.kd.geom[kc.geom * 4 + 1];
    const v0O = T.cV0[cO], nO = T.cNV[cO];
    const extO = !r.kcv[cO].closed && T.cNV[cO] > (r.chainSamples[cO].count) ? 1 : 0; // unused: offset found by match below
    const near = (s, w, px, py) => {
      // lkNearOn on the field table (the open-chain leading-extension offset as the shader: k0 += 1 if flagged)
      const k0 = Math.floor(s + 0.5) + (T.vs && false ? 0 : 0);
      const n = Math.min(Math.floor(w) + 1, 40);
      let bd = Infinity, bq = -1;
      for (let i = -n; i <= n; i++) {
        for (const lead of [0, 1]) {
          const q = k0 + lead + i; if (q < 0 || q >= nO - 1) continue;
          const ax = T.vx[v0O + q], ay = T.vy[v0O + q], bx = T.vx[v0O + q + 1], by = T.vy[v0O + q + 1];
          const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
          const t = l2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0;
          const ex = px - ax - dx * t, ey = py - ay - dy * t, d = Math.hypot(ex, ey);
          if (d < bd - 1e-9) { bd = d; bq = q * 2 + lead; }
        }
      }
      return [bd, bq];
    };
    const trueNear = (px, py) => {
      let bd = Infinity;
      for (let q = 0; q < nO - 1; q++) {
        const ax = T.vx[v0O + q], ay = T.vy[v0O + q], bx = T.vx[v0O + q + 1], by = T.vy[v0O + q + 1];
        const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
        const t = l2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0;
        bd = Math.min(bd, Math.hypot(px - ax - dx * t, py - ay - dy * t));
      }
      return bd;
    };
    const rows = [];
    for (let kv = 0; kv < kp.length; kv++) {
      const k = kp[kv];
      let off = k * per - uC;
      if (kc.closed) { const tot = r.kd.geom[kc.geom * 4]; off = ((off % tot) + tot) % tot; if (off > tot / 2) off -= tot; }
      if (off < -wn - 0.1 || off > wp + 0.1) continue;
      const e = 4 * (b + kv);
      const m = V[e], oc = V[e + 1], z = V[e + 2], w = V[e + 3];
      const px = xy[2 * k], py = xy[2 * k + 1];
      const [dn, q] = oc === cO ? near(z, Math.floor(w), px, py) : [NaN, -1];
      rows.push([off.toFixed(3), m.toFixed(3), oc, z, Math.floor(w), (w % 1).toFixed(3), Number.isFinite(dn) ? dn.toFixed(3) : "-", q, trueNear(px, py).toFixed(3)].join(" "));
    }
    return { ci, cU, cO, wn, wp, b, nO, hdr: "off winM oCh keptIdx scan pack nearOn(lkNearOn) seg*2+lead trueNear", rows };
  }, Number(ciArg));
  console.log(`ci ${out.ci} under ${out.cU} over ${out.cO} wn ${out.wn.toFixed(3)} wp ${out.wp.toFixed(3)} base ${out.b} overVerts ${out.nO}`);
  console.log(out.hdr);
  for (const x of out.rows) console.log(x);
} finally { await browser.close(); }
