// K1201 (20E tasks 2/3): S4b's joint step on screen and on the GPU.
// Task 1's sweep finds no head with xR < 0.5 on either stand (see
// sweep.txt), so this is the task 3 injection: on the cyc stand (link
// and moves verbatim from stands_cyc.mjs), e210 is re-declared in the
// page through the ribbon renderer's own setPaint (the strips.mjs
// injection's shape, copied: wrap setPaint so the app's own
// re-declarations keep the injected declaration) as a two-ended item
// with dB chosen so xR at node_218's joint is 0.2, its pulse band at
// that joint carrying the same declaration (distJ = dB, gR the ridge).
// The natural declaration at the same joint is sampled first, as the
// control. At the clock where the CPU band step is largest: predicted
// (ridge_joint.ts at xR 0.2), CPU (src twins at the same declaration:
// parent ribbon end vs child at the joint, and band tau 0-/0+), GPU
// (debug view 5's G along each arm's drawn centreline at the joint
// against the CPU twin at the same points, plan P8 tolerance 2/255),
// and the normal view cropped at the joint.
//   node joint_gpu.mjs <outDir>
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { openBrowser, openPage, waitAsleep, viewStill, moveEdge, dumpPulses, PIN, setState, frames, sleep } from "./lib.mjs";
import { STANDS, linkOf } from "./stands_cyc.mjs";
import { decodePNG, encodePNG, toRGB } from "./png.mjs";

const OUT = resolve(process.argv[2] || "out");
mkdirSync(OUT, { recursive: true });
const DSF = 1.5, XR = 0.2;
const st = STANDS.cyc;
const browser = await openBrowser();
const log = [];
try {
  const page = await openPage(browser, linkOf(st), log);
  await waitAsleep(page);
  await viewStill(page);
  for (const eid of st.moves) if (!(await moveEdge(page, eid))) throw new Error(`cyc move e${eid} refused`);
  await sleep(300);
  // Zoom on the joint (strips.mjs's ctrl+wheel recipe) so centreline
  // samples sit several px apart at the joint.
  {
    const fpt = await page.evaluate(() => window.__knotFabric().vertexScreen("node_218"));
    const pxPerWorld = () => page.evaluate((pt) => { const k = window.__knotFabric(); const a = k.toWorld(pt.x, pt.y), b = k.toWorld(pt.x + 100, pt.y); return 100 / Math.hypot(b.x - a.x, b.y - a.y); }, fpt);
    const wheel = async (dy) => { await page.mouse.move(fpt.x, fpt.y); await page.keyboard.down("Control"); await page.mouse.wheel({ deltaY: dy }); await page.keyboard.up("Control"); await sleep(250); await viewStill(page); };
    const s0 = await pxPerWorld();
    if (s0 < 68) { await wheel(-30); const s1 = await pxPerWorld(); const kEff = Math.log(s1 / s0) / 30; if (kEff > 0 && s1 < 68) await wheel(-Math.log(70 / s1) / kEff); }
    await page.mouse.move(2, 2); await sleep(300); await viewStill(page);
    console.log(`zoom: ${s0.toFixed(1)} -> ${(await pxPerWorld()).toFixed(1)} px/world at node_218`);
  }
  const decl0 = await dumpPulses(page);

  // Declaration + CPU steps (src twins, live uniforms) for a given
  // e210 (dA, dB) and its band (distJ, gR). Returns the largest band
  // step, the parent-vs-child (P1) step, and their clocks.
  const cpuSteps = (page, inj) => page.evaluate(async (inj) => {
    const PM = await import("/src/render/paint_math.ts");
    const MD = await import("/src/render/paint_model.ts");
    const r = window.__knotRenderer(), k = window.__knotFabric(), fb = window.__knotFabricRenderer(), W = fb.walk;
    const items = window.__knotPulses();
    const tgt = items.find((i) => i.edge === 210);
    const par = items.find((i) => i.edge !== 210 && i.far === "node_218");
    const bands = window.__knotPulseBands();
    const band = bands.find((b) => b.vertex === "node_218" && b.bEdge === 210);
    const dA = inj ? inj.dA : tgt.dist0, dB = inj ? inj.dB : tgt.dB, span = tgt.span;
    const distJ = inj ? inj.dB : band.distJ, gR = inj ? inj.gR : band.gR;
    const period = r.pulseSpacing / 1.6;
    let bandBest = { v: 0, t: 100 }, p1Best = { v: 0, t: 100 };
    for (let i = 0; i < 400; i++) {
      const t = 100 + (i * 2 * period) / 400;
      r.paintClock = t; r.tickPaint(0);
      const U = MD.knotUniformValues();
      const bv = Math.abs(PM.kPulseBandV(U, distJ, -1e-9, band.inward, false, gR, band.inwardR) - PM.kPulseBandV(U, distJ, 1e-9, band.inward, false, gR, band.inwardR));
      if (bv > bandBest.v) bandBest = { v: bv, t };
      const pv = PM.kPulseV(U, par.span - 1e-6, par.span, par.inward, false, par.dist0, par.cont);
      const cv = PM.kPulseV2(U, span - 1e-6, span, dA, dB, tgt.inward, tgt.inwardB, false);
      if (Math.abs(pv - cv) > p1Best.v) p1Best = { v: Math.abs(pv - cv), t };
    }
    return { tgt: { ...tgt }, par: { ...par }, band: { ...band }, dA, dB, span, distJ, gR, period, bandBest, p1Best };
  }, inj);

  // Centreline sample specs (screen CSS px) + CPU twin per point, at
  // the page's currently pinned clock and declaration (inj = null or
  // the injected {dA,dB,gR}).
  const sampleSpecs = (page, inj) => page.evaluate(async (inj) => {
    const PM = await import("/src/render/paint_math.ts");
    const MD = await import("/src/render/paint_model.ts");
    const r = window.__knotRenderer(), k = window.__knotFabric();
    const U = MD.knotUniformValues();
    const items = window.__knotPulses();
    const tgt = items.find((i) => i.edge === 210), par = items.find((i) => i.edge !== 210 && i.far === "node_218");
    const bands = window.__knotPulseBands();
    const band = bands.find((b) => b.vertex === "node_218" && b.bEdge === 210);
    const dA = inj ? inj.dA : tgt.dist0, dB = inj ? inj.dB : tgt.dB, span = tgt.span;
    const distJ = inj ? inj.dB : band.distJ, gR = inj ? inj.gR : band.gR;
    const jw = k.toWorld(...(() => { const s = k.vertexScreen("node_218"); return [s.x, s.y]; })());
    const centre = (eid, fromJoint) => {
      const pts = [];
      for (let i = 0; i <= 256; i++) { const s = k.runPoint(eid, i / 256); const w = k.toWorld(s.x, s.y); pts.push({ s, w }); }
      const cum = [0];
      for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].w.x - pts[i - 1].w.x, pts[i].w.y - pts[i - 1].w.y));
      const fromStart = Math.hypot(jw.x - pts[0].w.x, jw.y - pts[0].w.y) < Math.hypot(jw.x - pts[pts.length - 1].w.x, jw.y - pts[pts.length - 1].w.y);
      const total = cum[cum.length - 1];
      const at = (dist) => {
        const c = fromStart ? dist : total - dist;
        let i = 1; while (i < cum.length - 1 && cum[i] < c) i++;
        const f = (c - cum[i - 1]) / Math.max(1e-9, cum[i] - cum[i - 1]);
        return { x: pts[i - 1].s.x + (pts[i].s.x - pts[i - 1].s.x) * f, y: pts[i - 1].s.y + (pts[i].s.y - pts[i - 1].s.y) * f };
      };
      return { at, total };
    };
    const cPar = centre(39, true), cKid = centre(210, true);
    const out = [];
    for (const tau of [-0.3, -0.1, -0.03, 0.03, 0.1, 0.3, 0.8]) {
      const pt = tau < 0 ? cPar.at(-tau) : cKid.at(tau);
      out.push({ kind: "band", tau, ...pt, cpu: PM.kPulseBandV(U, distJ, tau, band.inward, false, gR, band.inwardR) });
    }
    for (const dFromB of [1.6, 2.0]) {
      const pt = cKid.at(dFromB);
      out.push({ kind: "child-ribbon", tau: dFromB, ...pt, cpu: PM.kPulseV2(U, span - dFromB, span, dA, dB, tgt.inward, tgt.inwardB, false) });
    }
    return { samples: out, jScreen: k.vertexScreen("node_218"), dA, dB, span, distJ, gR, parSpan: par.span };
  }, inj);

  const shoot = async (t, dbg) => {
    await setState(page, { t, dbg, webs: true });
    return toRGB(decodePNG(Buffer.from(await page.screenshot({ type: "png" }))));
  };
  const gpuOf = (img, s) => img.data[(Math.min(img.H - 1, Math.round(s.y * DSF)) * img.W + Math.min(img.W - 1, Math.round(s.x * DSF))) * 3 + 1];
  const cropSave = (img, centre, name, css = 340) => {
    const w = Math.round(css * DSF), h = w;
    const x0 = Math.max(0, Math.min(img.W - w, Math.round(centre.x * DSF - w / 2))), y0 = Math.max(0, Math.min(img.H - h, Math.round(centre.y * DSF - h / 2)));
    const out = { W: w, H: h, data: Buffer.alloc(w * h * 3) };
    for (let y = 0; y < h; y++) img.data.copy(out.data, y * w * 3, ((y0 + y) * img.W + x0) * 3, ((y0 + y) * img.W + x0 + w) * 3);
    writeFileSync(join(OUT, name), encodePNG(out));
  };

  const result = { stand: "cyc", moves: st.moves, link: linkOf(st) };
  // Natural control.
  const nat = await cpuSteps(page, null);
  result.natural = nat;
  await page.evaluate(PIN);
  const natImg = await shoot(nat.bandBest.t, 5);
  const natSpecs = await sampleSpecs(page, null);
  for (const s of natSpecs.samples) s.gpu = gpuOf(natImg, s);
  result.naturalSamples = natSpecs.samples;
  const natNorm = await shoot(nat.bandBest.t, 0);
  cropSave(natNorm, natSpecs.jScreen, "crop_joint_natural_normal.png");

  // Injection: dB so xR at node_218 (the B end) is 0.2.
  const W = nat.span, dA = nat.tgt.dist0;
  const dB = dA + W - 2 * XR, gR = (dA + dB + W) / 2;
  result.injection = { dA, dB: +dB.toFixed(3), W: +W.toFixed(3), gR: +gR.toFixed(3), xR_B: +((dA + W - dB) / 2).toFixed(3), xR_A: +(gR - dA).toFixed(3),
    arithmetic: `xR_B = (dA + W - dB)/2 = 0.2 -> dB = dA + W - 0.4 = ${dA.toFixed(3)} + ${W.toFixed(3)} - 0.4 = ${dB.toFixed(3)}; gR = (dA+dB+W)/2 = ${gR.toFixed(3)}` };
  await page.evaluate((inj) => {
    const r = window.__knotRenderer(), S = r.paintState;
    window.__k1201Pulses = S.paintPulses.map((p) => ({ ...p }));
    const arm = window.__k1201Pulses.find((p) => { const fb = window.__knotFabricRenderer(); const e = fb.walk.edges[210]; return p.chain === e.chain && ((p.cJunction === e.ctrlA && p.cFar === e.ctrlB) || (p.cJunction === e.ctrlB && p.cFar === e.ctrlA)); });
    arm.two = true; arm.cont = true; arm.dB = inj.dB;
    const orig = r.setPaint;
    r.setPaint = function (spans, pulses, caps, routes, traveled, bands = []) {
      bands = bands.map((b) => (b.gR > 0 ? { ...b, distJ: inj.dB, gR: inj.gR } : b));
      return orig.call(this, spans, window.__k1201Pulses, caps, routes, traveled, bands);
    };
    const feed = window.__knotFabricRenderer().computePulseBands().feed.map((b) => (b.gR > 0 ? { ...b, distJ: inj.dB, gR: inj.gR } : b));
    orig.call(r, S.paintSpans, window.__k1201Pulses, S.paintCaps, S.paintRoutes, S.paintTraveled, feed);
  }, { dB, gR });
  await frames(page, 3); await sleep(200);
  const applied = await page.evaluate(() => { const r = window.__knotRenderer(); const e = window.__knotFabricRenderer().walk.edges[210]; const p = r.paintState.paintPulses.find((x) => x.chain === e.chain && ((x.cJunction === e.ctrlA && x.cFar === e.ctrlB) || (x.cJunction === e.ctrlB && x.cFar === e.ctrlA))); return p ? { two: p.two, dB: p.dB, dist0: p.dist0 } : null; });
  result.applied = applied;
  const injCpu = await cpuSteps(page, { dA, dB, gR });
  result.injected = injCpu;
  await page.evaluate(PIN);
  const injImg = await shoot(injCpu.bandBest.t, 5);
  const injSpecs = await sampleSpecs(page, { dA, dB, gR });
  for (const s of injSpecs.samples) s.gpu = gpuOf(injImg, s);
  result.injectedSamples = injSpecs.samples;
  const injNorm = await shoot(injCpu.bandBest.t, 0);
  cropSave(injNorm, injSpecs.jScreen, "crop_joint_injected_normal.png");
  const injDbg = injImg;
  // debug crop from the full debug frame
  cropSave(injDbg, injSpecs.jScreen, "crop_joint_injected_debug5.png");
  result.ctxLost = await page.evaluate(() => window.__ctxLost);
  result.pageErrors = log.filter((l) => l.includes("pageerror"));
  result.declHead = decl0.head;

  const stepOf = (samples, lo = -0.1, hi = 0.1) => {
    const a = samples.find((s) => s.tau === lo), b = samples.find((s) => s.tau === hi);
    return { gpu: +((b.gpu - a.gpu) / 255).toFixed(4), gpuAbs: +(Math.abs(b.gpu - a.gpu) / 255).toFixed(4), cpu: +(b.cpu - a.cpu).toFixed(4) };
  };
  const maxErr = (samples) => Math.max(...samples.map((s) => Math.abs(s.gpu / 255 - s.cpu)));
  result.summary = {
    predicted_xR0p2: 0.54,
    natural: { bandStepCpu: +nat.bandBest.v.toFixed(4), atT: +nat.bandBest.t.toFixed(3), p1Cpu: +nat.p1Best.v.toFixed(4), gpuStep: stepOf(natSpecs.samples), gpuStep003: stepOf(natSpecs.samples, -0.03, 0.03), maxGpuCpuErr: +maxErr(natSpecs.samples).toFixed(4) },
    injected: { bandStepCpu: +injCpu.bandBest.v.toFixed(4), atT: +injCpu.bandBest.t.toFixed(3), p1Cpu: +injCpu.p1Best.v.toFixed(4), gpuStep: stepOf(injSpecs.samples), gpuStep003: stepOf(injSpecs.samples, -0.03, 0.03), maxGpuCpuErr: +maxErr(injSpecs.samples).toFixed(4) },
  };
  writeFileSync(join(OUT, "joint.json"), JSON.stringify(result, null, 1));
  const L = [];
  L.push(`cyc stand, head ${result.declHead}, joint node_218 (e39 parent -> e210 two-ended child), moves [${st.moves.join(",")}]`);
  L.push(`injection: ${result.injection.arithmetic}; applied ${JSON.stringify(applied)}`);
  L.push(`predicted (ridge_joint.ts, xR 0.2): 0.54`);
  L.push(`natural control: CPU band step ${result.summary.natural.bandStepCpu} at t ${result.summary.natural.atT}, P1 ${result.summary.natural.p1Cpu}; GPU step ${result.summary.natural.gpuStep.gpuAbs} (cpu ${result.summary.natural.gpuStep.cpu}), max |GPU-CPU| ${result.summary.natural.maxGpuCpuErr} (P8 tol ${2 / 255})`);
  L.push(`injected: CPU band step ${result.summary.injected.bandStepCpu} at t ${result.summary.injected.atT}, P1 ${result.summary.injected.p1Cpu}; GPU step ${result.summary.injected.gpuStep.gpuAbs} (cpu ${result.summary.injected.gpuStep.cpu}), max |GPU-CPU| ${result.summary.injected.maxGpuCpuErr}`);
  L.push(`samples natural: ${natSpecs.samples.map((s) => `${s.kind}@${s.tau} gpu ${s.gpu} cpu ${s.cpu.toFixed(3)}`).join("; ")}`);
  L.push(`samples injected: ${injSpecs.samples.map((s) => `${s.kind}@${s.tau} gpu ${s.gpu} cpu ${s.cpu.toFixed(3)}`).join("; ")}`);
  L.push(`ctxLost ${result.ctxLost}, pageErrors ${result.pageErrors.length}`);
  writeFileSync(join(OUT, "joint.txt"), L.join("\n") + "\n");
  console.log(L.join("\n"));
} finally { await browser.close(); }
