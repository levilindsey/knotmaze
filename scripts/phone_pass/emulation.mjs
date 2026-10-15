// phone_pass emulation check (K193): is the portrait emulation REAL in the pass's tab?
// An Android Chrome might accept Emulation.setDeviceMetricsOverride and still render at another size, or scale
// the page into the phone's own window. This loads the app in the pass's own tab and checks, from the page's
// own point of view (never from the answer to the CDP call):
//  1. the mechanism: a size the phone does not have (360x640 at dpr 3) comes back as asked, so a match to the
//     phone's own viewport is not a coincidence (odd);
//  2. the real size, 411x753 at dpr 2.625: innerWidth x innerHeight, devicePixelRatio, the orientation media
//     query, and the PixiJS canvas (its CSS box fills the page; its backing store is reported: the app caps its
//     resolution at dpr 2, main.ts `Math.min(window.devicePixelRatio, 2)`, so 822x1506 device px, not the
//     uncapped 1079x1977);
//  3. a screenshot of the whole 411x753 CSS px viewport (same aspect ratio; 1079x1977 device px on the phone,
//     whose capture follows the emulated dpr) that is all page, no blank strip (K195 found every landscape
//     frame carried a white strip at the bottom: the screenshot 387 CSS px high, the page 331);
//  4. which navigations the override survives (recorded; every script sets it again before each navigation).
// Writes emulation.json and emulation_real.png in the pass folder; exit 0 = real, 4 = not real (phone_pass.ps1
// then stops before it measures). With cfg.viewport = native it only records what the tab shows.
// Usage: node emulation.mjs <config.json>
import { writeFileSync } from "node:fs";
import { CFG, BUILDS, VIEWPORT, EMU_VP, DRY, connect, myPage, emulate, EMU_READ, sleep, out, stampOf, assertFree } from "./lib.mjs";
import { decodePNG } from "./png.mjs";

const ODD = { width: 360, height: 640, deviceScaleFactor: 3 };
const LINK = (b) => `${b.host}/?b.J&am=instant&snd=none&mf=0`; // knot mode: a settled page, a canvas that fills the window
const near = (a, b, tol) => typeof a === "number" && Math.abs(a - b) <= tol;
const vpIs = (e, w, h, d) => !!e && near(e.vp[0], w, 1) && near(e.vp[1], h, 1) && near(e.vp[2], d, 0.01);

const res = { at: new Date().toISOString(), mode: VIEWPORT, dry: DRY, display: CFG.display ?? null, want: [EMU_VP.width, EMU_VP.height, EMU_VP.deviceScaleFactor], checks: {}, pass: false };
const browser = await connect();
try {
  const page = await myPage(browser, { raw: true }); // the tab as it sits, before any override
  await page.bringToFront();
  const b = BUILDS[1];
  res.native = await page.evaluate(EMU_READ);
  res.nativeUrl = page.url();

  // 1. the mechanism, on a size the phone does not have
  await emulate(page, ODD);
  await sleep(600);
  res.oddSameDoc = await page.evaluate(EMU_READ);
  assertFree();
  await page.goto(LINK(b), { waitUntil: "load", timeout: 90000 });
  await sleep(2000);
  res.oddAfterGoto = await page.evaluate(EMU_READ);
  res.checks.oddHonored = vpIs(res.oddAfterGoto, ODD.width, ODD.height, ODD.deviceScaleFactor) || vpIs(res.oddSameDoc, ODD.width, ODD.height, ODD.deviceScaleFactor);

  if (VIEWPORT === "native") {
    res.note = "native mode: no emulation to check; the odd-size probe above is the only override that was applied";
    res.pass = true;
  } else {
    // 2. the real size; first on the loaded page, then through a fresh navigation WITHOUT setting it again
    await emulate(page, EMU_VP);
    await sleep(600);
    res.realSameDoc = await page.evaluate(EMU_READ);
    assertFree();
    await page.goto(LINK(b), { waitUntil: "load", timeout: 90000 });
    res.realAfterGoto = await page.evaluate(EMU_READ);
    res.survivesGoto = vpIs(res.realAfterGoto, EMU_VP.width, EMU_VP.height, EMU_VP.deviceScaleFactor);
    // the knot sleeps (or 25 s), then the page's state is read for good
    const t0 = Date.now();
    let stamp = "";
    while (Date.now() - t0 < 25000) { assertFree(); stamp = await stampOf(page); if (/asleep/.test(stamp)) break; await sleep(500); }
    await sleep(1500);
    res.stamp = stamp.slice(0, 110);
    res.real = await page.evaluate(EMU_READ);
    // 4. a reload under the same session
    assertFree();
    await page.reload({ waitUntil: "load", timeout: 90000 });
    await sleep(1500);
    res.realAfterReload = await page.evaluate(EMU_READ);
    res.survivesReload = vpIs(res.realAfterReload, EMU_VP.width, EMU_VP.height, EMU_VP.deviceScaleFactor);
    // the screenshot is taken last, on the reloaded page, after it sleeps again (or 25 s)
    const t1 = Date.now();
    while (Date.now() - t1 < 25000) { assertFree(); if (/asleep/.test(await stampOf(page))) break; await sleep(500); }
    await sleep(1000);
    res.final = await page.evaluate(EMU_READ);

    // 3. the screenshot: size and a blank strip at the bottom
    const buf = await page.screenshot({ type: "png", captureBeyondViewport: false });
    const shot = out("emulation_real.png");
    writeFileSync(shot, buf);
    const img = decodePNG(buf);
    const wantW = Math.round(EMU_VP.width * EMU_VP.deviceScaleFactor), wantH = Math.round(EMU_VP.height * EMU_VP.deviceScaleFactor);
    const whiteRow = (y) => {
      let n = 0;
      for (let x = 0; x < img.W; x++) { const i = (y * img.W + x) * img.ch; if (img.data[i] >= 250 && img.data[i + 1] >= 250 && img.data[i + 2] >= 250) n++; }
      return n / img.W;
    };
    let strip = 0;
    while (strip < img.H && whiteRow(img.H - 1 - strip) >= 0.99) strip++;
    // The capture's CSS size: the pixel size over the capture's own scale. A whole-viewport capture has the
    // viewport's aspect ratio whatever the scale (the phone follows the emulated dpr, 1079x1977; a headed desktop
    // Chrome captures at its display's own scale, so a dry run reads 822x1506): that, and no blank strip, are what
    // make it "411x753 CSS px". The strict device-pixel size is reported (shotScaleOk), not a verdict.
    const scale = img.W / EMU_VP.width;
    res.shot = { file: shot, w: img.W, h: img.H, wantW, wantH, scale: +scale.toFixed(3), cssW: +(img.W / scale).toFixed(1), cssH: +(img.H / scale).toFixed(1), blankRowsAtBottom: strip, whiteShareTop: +whiteRow(0).toFixed(3), whiteShareBottom: +whiteRow(img.H - 1).toFixed(3) };

    // verdicts
    const e = res.final, c = e?.canvas;
    // main.ts caps the renderer's resolution at 2 (`resolution: Math.min(window.devicePixelRatio, 2)`): at dpr 2.625 the
    // backing store is 822x1506, the CSS box at 2x, not the uncapped 1079x1977.
    const capDpr = Math.min(EMU_VP.deviceScaleFactor, 2);
    const wantBW = EMU_VP.width * capDpr, wantBH = EMU_VP.height * capDpr;
    res.checks.pageSize = vpIs(e, EMU_VP.width, EMU_VP.height, EMU_VP.deviceScaleFactor);
    res.checks.orientationPortrait = e?.portrait === true;
    res.checks.documentSize = !!e && near(e.doc[0], EMU_VP.width, 1) && near(e.doc[1], EMU_VP.height, 1);
    res.checks.canvasFillsPage = !!c && near(c.cw, EMU_VP.width, 1) && near(c.ch, EMU_VP.height, 1);
    res.checks.canvasBacking = !!c && near(c.w, wantBW, 2) && near(c.h, wantBH, 2);
    res.checks.shotAspect = Math.abs(img.W / img.H - EMU_VP.width / EMU_VP.height) < 0.004 * (EMU_VP.width / EMU_VP.height);
    res.checks.shotScaleOk = near(img.W, wantW, 1) && near(img.H, wantH, 1);
    res.checks.noBlankStrip = strip < 4;
    res.pass = res.checks.oddHonored && res.checks.pageSize && res.checks.orientationPortrait && res.checks.documentSize && res.checks.canvasFillsPage && res.checks.shotAspect && res.checks.noBlankStrip;
    // The backing store and the capture's scale are reported, not failed on their own: an app that caps its
    // resolution, or a browser that captures at its display's scale, is not an unreal emulation.
    res.note = `canvas backing ${c ? c.w + "x" + c.h : "none"} ${res.checks.canvasBacking ? "= the app's cap (min(dpr, 2) = " + capDpr + "x the CSS box)" : "is NOT " + Math.round(wantBW) + "x" + Math.round(wantBH) + " (min(dpr, 2) x the CSS box): check main.ts's resolution cap"}; screenshot ${img.W}x${img.H} px is ${scale.toFixed(3)}x the CSS viewport ${res.checks.shotScaleOk ? "(the emulated dpr: " + wantW + "x" + wantH + ")" : "(the emulated dpr would give " + wantW + "x" + wantH + ")"}`;
  }
} catch (e) {
  res.error = String(e.stack || e).slice(0, 600);
} finally {
  writeFileSync(out("emulation.json"), JSON.stringify(res, null, 1));
  const f = (e) => (e ? `${e.vp[0]}x${e.vp[1]}@${e.vp[2]} ${e.portrait ? "portrait" : "landscape"} canvas ${e.canvas ? `${e.canvas.w}x${e.canvas.h} (css ${e.canvas.cw}x${e.canvas.ch})` : "none"}` : "-");
  console.log(`emulation (${res.mode}${DRY ? ", dry" : ""}), display as it sits: ${res.display ?? "?"}`);
  console.log(`  tab as it sat       ${f(res.native)}`);
  console.log(`  odd 360x640@3 same  ${f(res.oddSameDoc)}`);
  console.log(`  odd after goto      ${f(res.oddAfterGoto)}`);
  console.log(`  real same doc       ${f(res.realSameDoc)}`);
  console.log(`  real after goto     ${f(res.realAfterGoto)}  survives goto: ${res.survivesGoto}`);
  console.log(`  real, asleep        ${f(res.real)}`);
  console.log(`  real after reload   ${f(res.realAfterReload)}  survives reload: ${res.survivesReload}`);
  console.log(`  final               ${f(res.final)}  vv ${JSON.stringify(res.final?.vv)} screen ${JSON.stringify(res.final?.screen)}`);
  if (res.shot) console.log(`  screenshot          ${res.shot.w}x${res.shot.h} px = ${res.shot.cssW}x${res.shot.cssH} css at scale ${res.shot.scale} (the emulated dpr: ${res.shot.wantW}x${res.shot.wantH}), blank rows at the bottom ${res.shot.blankRowsAtBottom}`);
  console.log(`  checks              ${JSON.stringify(res.checks)}`);
  if (res.note) console.log(`  note                ${res.note}`);
  if (res.error) console.log(`  ERROR               ${res.error}`);
  console.log(`emulation ${res.pass ? "REAL" : "NOT REAL"}`);
  await browser.disconnect();
}
process.exit(res.pass ? 0 : 4);
