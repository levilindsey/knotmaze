// K1207 22B task 3: is check_field.mjs's twin point a fan pixel?
// At ji 28, tau 0.91 along e18 (the x4 stand, verbatim from
// stands_cyc.mjs), the CPU twin moved ~(0.5052, 0.8065, 0.6131) off to
// (0.4960, 0.8030, 0.6059) on in 21D (unpinned clocks). Here the clocks
// are pinned at the phase that maximises the CPU band crest at tau
// 0.91, the twin is re-read at that state (fp.at, flag off then on),
// and the GPU is sampled at the same world point in debug view 5
// (G = kFanPulseV) and in the normal view, flag off then on, with the
// fillet meshes shown and hidden (hidden = the ribbons alone). A last
// shot hacks the e135->e18 band's R3.w to 0.45 (flag on): past tau
// 0.45 its crest reads 0, so the point's debug G falls only if a fan
// or cover-strip fragment draws that pixel.
// Screen mapping: vertexScreen(mnode_27) anchors the centre; the
// offset is the world delta times the sheet's pixels-per-world (the
// view transform alone read ~1 CSS px off vertexScreen in v1 here).
//   node twin22b.mjs        (env K1139_HOST, the dev server)
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { openBrowser, openPage, waitAsleep, viewStill, moveEdge, sleep } from "./lib.mjs";
import { STANDS, linkOf } from "./stands_cyc.mjs";
import { decodePNG, encodePNG, toRGB } from "./png.mjs";

const OUT = "out22b/twin";
mkdirSync(OUT, { recursive: true });
const st = STANDS.x4;
const DSF = 1.5;
const browser = await openBrowser();
try {
  const log = [];
  const page = await openPage(browser, linkOf(st), log);
  await waitAsleep(page);
  await viewStill(page);
  for (const eid of st.moves) if (!(await moveEdge(page, eid))) throw new Error(`move e${eid} refused`);
  await sleep(300);

  // The pinned phase: largest CPU band crest at tau 0.91 (window 1),
  // so the fan's G there is as large as this stand makes it.
  const best = await page.evaluate(async () => {
    const PM = await import("/src/render/paint_math.ts");
    const MD = await import("/src/render/paint_model.ts");
    const r = window.__knotRenderer();
    let bt = 100, bv = -1, bd = -1;
    for (let k = 0; k < 400; k++) {
      const t = 100 + (k / 400) * (2.5 / 1.6);
      window.__knotPinClocks(t);
      r.tickPaint(0);
      const U = MD.knotUniformValues();
      const v = PM.kPulseBandV(U, 6.811, 0.91, false, false, 0, false, 1, 0);
      const d = Math.abs(v - PM.kPulseBandV(U, 6.811, 0.91, false, false, 0, false, 1, 1.3590532541275024));
      if (v > bv) { bv = v; bd = d; bt = t; }
    }
    return { t: bt, v: bv, d: bd };
  });
  console.log(`pinned phase t ${best.t.toFixed(4)} (CPU band crest at tau 0.91: ${best.v.toFixed(4)}, window delta there ${best.d.toFixed(4)})`);
  await page.evaluate((tt) => { window.__twinT = tt; }, best.t);

  const pt = await page.evaluate(async (tt) => {
    window.__knotPinClocks(tt);
    const r = window.__knotRenderer();
    const fp = r.fieldProbe;
    const ji = 28;
    const c = fp.center(ji);
    const a = fp.arms(ji)[1];
    const P = [c[0] + a.dx * 0.91, c[1] + a.dy * 0.91];
    const k = window.__knotFabric();
    const vs = k.vertexScreen("mnode_27");
    const w0 = k.toWorld(vs.x, vs.y), w1 = k.toWorld(vs.x + 100, vs.y);
    const ppw = 100 / Math.hypot(w1.x - w0.x, w1.y - w0.y);
    // Anchor on the drawn vertex's own world point, not the record
    // centre (the two can sit a few screen px apart).
    const scr = { x: vs.x + (P[0] - w0.x) * ppw, y: vs.y + (P[1] - w0.y) * ppw };
    return { P, center: c, dir: [a.dx, a.dy], scr, vertex: vs, vertexWorld: [w0.x, w0.y], ppw };
  }, best.t);
  console.log(`twin point world (${pt.P[0].toFixed(4)}, ${pt.P[1].toFixed(4)}) centre (${pt.center[0].toFixed(3)}, ${pt.center[1].toFixed(3)}) vertexWorld (${pt.vertexWorld[0].toFixed(3)}, ${pt.vertexWorld[1].toFixed(3)}) dir (${pt.dir[0].toFixed(4)}, ${pt.dir[1].toFixed(4)}) ppw ${pt.ppw.toFixed(2)} screen (${pt.scr.x.toFixed(1)}, ${pt.scr.y.toFixed(1)})`);

  const twin = await page.evaluate(async (tt, P) => {
    const JF = await import("/src/render/junction_field.ts");
    const r = window.__knotRenderer();
    const fp = r.fieldProbe;
    const rows = [];
    for (const on of [false, true]) {
      JF.setPulseBandEndWindow(on);
      r.rebuildFillets(true);
      window.__knotPinClocks(tt);
      r.tickPaint(0);
      await new Promise((res) => { let k = 0; const f = () => (++k >= 3 ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); });
      const o = new Float32Array(4);
      const ok = fp.at(28, P[0], P[1], o, 1 / 34.83, false);
      rows.push({ on, ok, rgb: [+o[0].toFixed(4), +o[1].toFixed(4), +o[2].toFixed(4)] });
    }
    JF.setPulseBandEndWindow(false);
    r.rebuildFillets(true);
    window.__knotPinClocks(tt);
    r.tickPaint(0);
    return rows;
  }, best.t, pt.P);
  for (const row of twin) console.log(`CPU twin ${row.on ? "on " : "off"}: ok ${row.ok} rgb (${row.rgb.join(", ")}) = (${row.rgb.map((x) => Math.round(x * 255)).join(", ")})`);

  await page.evaluate(() => { for (const el of document.body.children) if (el.tagName !== "CANVAS") el.style.visibility = "hidden"; });
  const BOX = 176;
  const clip = { x: Math.max(0, Math.floor(pt.scr.x - BOX / 2)), y: Math.max(0, Math.floor(pt.scr.y - BOX / 2)), width: BOX, height: BOX };
  const px = { x: Math.round((pt.scr.x - clip.x) * DSF), y: Math.round((pt.scr.y - clip.y) * DSF) };
  console.log(`clip ${JSON.stringify(clip)}; twin pixel in image (${px.x}, ${px.y}) of ${BOX * DSF}`);
  const shot = async () => {
    await page.evaluate(() => new Promise((res) => { let k = 0; const f = () => (++k >= 3 ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }));
    await sleep(60);
    return toRGB(decodePNG(Buffer.from(await page.screenshot({ type: "png", clip }))));
  };
  const setState = (on, dbg, fans) => page.evaluate(async (o, d, f) => {
    const JF = await import("/src/render/junction_field.ts");
    JF.setPulseBandEndWindow(o);
    const r = window.__knotRenderer();
    r.paintDebug = d;
    if (r.filletMesh) r.filletMesh.mesh.renderable = f;
    if (r.filletTopMesh) r.filletTopMesh.mesh.renderable = f;
    r.rebuildFillets(true);
    window.__knotPinClocks(window.__twinT);
    r.tickPaint(0);
    return window.__ctxLost || 0;
  }, on, dbg, fans);
  const sample = (img) => {
    const at = (x, y) => { const i = (y * img.W + x) * 3; return [img.data[i], img.data[i + 1], img.data[i + 2]]; };
    const grid = [];
    for (let y = px.y - 2; y <= px.y + 2; y++) { const row = []; for (let x = px.x - 2; x <= px.x + 2; x++) row.push(at(x, y).join("/")); grid.push(row.join("  ")); }
    return { centre: at(px.x, px.y), grid };
  };
  const imgs = {};
  for (const [name, on, dbg, fans] of [
    ["dbg_off", false, 5, true], ["dbg_on", true, 5, true],
    ["dbg_off_nofan", false, 5, false], ["dbg_on_nofan", true, 5, false],
    ["norm_off", false, 0, true], ["norm_on", true, 0, true],
    ["norm_off_nofan", false, 0, false],
  ]) {
    const lost = await setState(on, dbg, fans);
    if (lost) console.log(`WARNING webglcontextlost x${lost}`);
    imgs[name] = await shot();
    const s = sample(imgs[name]);
    console.log(`${name}: centre rgb (${s.centre.join(", ")})`);
    writeFileSync(join(OUT, `${name}.png`), encodePNG({ W: imgs[name].W, H: imgs[name].H, data: imgs[name].data }));
  }
  for (const name of ["dbg_off", "dbg_on", "norm_off", "norm_on"]) console.log(`${name} 5x5 (rgb):\n${sample(imgs[name]).grid.join("\n")}`);
  // The hack: R3.w of the e135->e18 band (distJ 6.811, span 1.359) to
  // 0.45, flag on, debug 5 (check_gpu5.mjs's walk at ji 28).
  const hacked = await page.evaluate(async () => {
    const JF = await import("/src/render/junction_field.ts");
    JF.setPulseBandEndWindow(true);
    const r = window.__knotRenderer(), fp = r.fieldProbe;
    r.paintDebug = 5;
    if (r.filletMesh) r.filletMesh.mesh.renderable = true;
    if (r.filletTopMesh) r.filletTopMesh.mesh.renderable = true;
    r.rebuildFillets(true);
    window.__knotPinClocks(window.__twinT);
    r.tickPaint(0);
    const D = JF.recordData();
    const data = D.data;
    const rb = fp.record(28);
    let cur = data[rb * 4 + 3];
    const nr = data[rb * 4 + 7];
    for (let k = 0; k < nr; k++) cur += 1 + data[cur * 4];
    const np = data[cur * 4];
    cur += 1;
    const found = [];
    for (let k = 0; k < np; k++) {
      const o = cur * 4, nv = data[o];
      found.push({ r3w: +data[o + 15].toFixed(3), distJ: +data[o + 4].toFixed(3) });
      if (Math.abs(data[o + 4] - 6.811) < 1e-3 && data[o + 15] > 1 && data[o + 15] < 2) { data[o + 15] = 0.45; D.markDirty(cur, cur + 4 + nv); }
      cur += 4 + nv;
    }
    D.flush();
    r.tickPaint(0);
    return found;
  });
  console.log(`ji 28 band blocks: ${JSON.stringify(hacked)}`);
  imgs.dbg_on_hack = await shot();
  console.log(`dbg_on_hack (R3.w 0.45): centre rgb (${sample(imgs.dbg_on_hack).centre.join(", ")})`);
  writeFileSync(join(OUT, "dbg_on_hack.png"), encodePNG({ W: imgs.dbg_on_hack.W, H: imgs.dbg_on_hack.H, data: imgs.dbg_on_hack.data }));
  // Fan-only: base ribbons hidden (root child 0), fans shown. If a fan
  // or strip fragment covers the twin pixel, the normal view there is
  // the field's own colour; if none does, it is the backdrop's.
  const fanOnly = async (on, dbg) => {
    await page.evaluate(async (o, d) => {
      const JF = await import("/src/render/junction_field.ts");
      JF.setPulseBandEndWindow(o);
      const r = window.__knotRenderer();
      r.paintDebug = d;
      r.root.children[0].renderable = false;
      if (r.filletMesh) r.filletMesh.mesh.renderable = true;
      if (r.filletTopMesh) r.filletTopMesh.mesh.renderable = true;
      r.rebuildFillets(true);
      window.__knotPinClocks(window.__twinT);
      r.tickPaint(0);
    }, on, dbg);
    const img = await shot();
    await page.evaluate(() => { window.__knotRenderer().root.children[0].renderable = true; });
    return img;
  };
  for (const [name, on, dbg] of [["norm_off_fanonly", false, 0], ["norm_on_fanonly", true, 0], ["dbg_off_fanonly", false, 5]]) {
    imgs[name] = await fanOnly(on, dbg);
    console.log(`${name}: centre rgb (${sample(imgs[name]).centre.join(", ")})`);
    writeFileSync(join(OUT, `${name}.png`), encodePNG({ W: imgs[name].W, H: imgs[name].H, data: imgs[name].data }));
  }
  // Where the R3.w hack moved debug G, in image px against the twin px.
  {
    let n = 0, x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1, dMin = 1e9;
    for (let y = 0; y < imgs.dbg_on.H; y++) for (let x = 0; x < imgs.dbg_on.W; x++) {
      const i = (y * imgs.dbg_on.W + x) * 3;
      if (imgs.dbg_on.data[i + 1] !== imgs.dbg_on_hack.data[i + 1]) {
        n++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        dMin = Math.min(dMin, Math.hypot(x - px.x, y - px.y));
      }
    }
    console.log(`hack diff: ${n} px, bbox x ${x0}..${x1} y ${y0}..${y1} (twin px ${px.x}, ${px.y}); nearest hacked px ${dMin === 1e9 ? "-" : dMin.toFixed(1)} image px from the twin px`);
  }
  const dPt = (a, b) => [0, 1, 2].map((ch) => Math.abs(sample(a).centre[ch] - sample(b).centre[ch]));
  console.log(`point diffs (centre px): dbg on-off (${dPt(imgs.dbg_on, imgs.dbg_off).join(", ")}), norm on-off (${dPt(imgs.norm_on, imgs.norm_off).join(", ")}), dbg fans-vs-nofan off (${dPt(imgs.dbg_off, imgs.dbg_off_nofan).join(", ")}), norm fans-vs-nofan off (${dPt(imgs.norm_off, imgs.norm_off_nofan).join(", ")}), dbg hack-vs-on (${dPt(imgs.dbg_on_hack, imgs.dbg_on).join(", ")})`);
  const errs = log.filter((l) => l.includes("pageerror"));
  if (errs.length) console.log("pageerrors:", errs.join(" | "));
  await page.close();
} finally { await browser.close(); }
