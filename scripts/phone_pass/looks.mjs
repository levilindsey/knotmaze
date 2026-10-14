// phone_pass looks (K156; K81's looks.mjs made data-driven): shoot a list of
// looks on both builds, head first (junction crops are chosen there and the
// same boxes reused on base), on the pass's own tab only. cfg.looks is a JSON
// file: { looks: [ { name, link, load?, settleMs?, needs?, steps? } ] }.
//  link   "?b.J&am=instant&snd=none..." (a probe link names a design: a bare
//         URL is today's daily); it is joined to each build's host.
//  load   "sleep" (default: wait for the knot to sleep), "frozen" (a phy=0
//         link: wait for the frozen state) or "none" (just navigate, e.g. for
//         an intro burst; the stamp is checked after the steps).
//  needs  what the build must have, else the look records status "missing"
//         (and goes on): "__hook" (a window function/object), "param:<key>"
//         (a key of __knotParams()) or "js:<expression>" (truthy in the page).
//  steps  waitSleep{ms} | wait{ms} | moves{n} (more cheapest moves, touch
//         taps) | tapChoice | click{text|selector} (anchors open in the same
//         tab) | panel{open} | scroll{selector|text|y, block?} (scrollIntoView, block "center" by default) | pin
//         (freeze every clock; K83's pinAll) | reload | eval{js, name?} (the page runs
//         js, a Promise is awaited, and its JSON result is kept in the report's steps[].result) |
//         shot{name, clip?{x,y,width,height}, junctions?:N} |
//         burst{name, n, everyMs}.
// A missing hook, element or `needs` -> status "missing" + the reason; any
// other failure -> "error"; only a watchdog trip stops the run. Writes
// <out>/frames/<look>/<build>_<shot>.png, <out>/looks_report.json and the
// sheets (sheet.mjs). Usage: node looks.mjs <config.json>     (env LOOKS=a,b)
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CFG, BUILDS, connect, myPage, load, loadFrozen, sleep, out, assertFree, stampOf, checkBuild } from "./lib.mjs";
import { makeMoves, pinAll, routedList } from "./walk.mjs";
import { makeSheets } from "./sheet.mjs";

class Missing extends Error {}
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const looksFile = [CFG.looks, resolve(root, CFG.looks || "")].find((f) => f && isAbsolute(f) && existsSync(f)) || resolve(CFG.looks);
const spec = JSON.parse(readFileSync(looksFile, "utf8"));
const only = process.env.LOOKS ? process.env.LOOKS.split(",") : null;

const browser = await connect();
const page = await myPage(browser);
await page.bringToFront();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 200)));
const png = (opts = {}) => page.screenshot({ type: "png", captureBeyondViewport: false, ...opts });
const boxes = {}; // "look/shot" -> junction boxes chosen on the head build
const report = { looksFile, started: new Date().toISOString(), viewport: await page.evaluate(() => [window.innerWidth, window.innerHeight, +window.devicePixelRatio.toFixed(3)]), looks: [], errors };

async function checkNeeds(needs = []) {
  for (const n of needs) {
    const ok = await page.evaluate((n) => {
      try {
        if (n.startsWith("param:")) { const p = window.__knotParams && window.__knotParams(); return !!p && n.slice(6) in p; }
        if (n.startsWith("js:")) return !!(0, eval)(n.slice(3));
        return typeof window[n] !== "undefined";
      } catch { return false; }
    }, n);
    if (!ok) throw new Missing(`needs ${n}`);
  }
}

// The leaf-most visible element holding `text` (or matching `selector`).
const findEl = (st, tags) =>
  page.evaluateHandle(({ text, selector, tags }) => {
    const vis = (e) => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none"; };
    const has = (e) => (e.textContent || "").toLowerCase().includes(String(text).toLowerCase());
    const els = selector ? [...document.querySelectorAll(selector)] : [...document.querySelectorAll(tags)].filter((e) => has(e) && ![...e.children].some(has));
    return els.find(vis) || els[0] || null;
  }, { text: st.text, selector: st.selector, tags });

async function tapEl(el) {
  const bb = await el.boundingBox();
  if (!bb) throw new Missing("element has no box");
  assertFree();
  await page.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2);
}

async function junctionCrops(look, b, run, st) {
  const key = `${look.name}/${st.name}`;
  if (!boxes[key]) {
    const rl = await page.evaluate(routedList);
    const half = (j) => Math.max(34, Math.ceil(j.reach + 8));
    const ok = rl.list.filter((j) => j.x - half(j) >= 0 && j.y - half(j) >= 0 && j.x + half(j) <= rl.W && j.y + half(j) <= rl.H);
    ok.sort((p, q) => Math.hypot(p.x - rl.W / 2, p.y - rl.H / 2) - Math.hypot(q.x - rl.W / 2, q.y - rl.H / 2));
    boxes[key] = ok.slice(0, st.junctions).map((j) => ({ ji: j.ji, x: Math.round(j.x), y: Math.round(j.y), half: half(j), nr: j.nr }));
    run.junctions = { routedTotal: rl.list.length, records: rl.records, viewport: [rl.W, rl.H], boxes: boxes[key] };
  }
  for (const bx of boxes[key]) {
    const f = `frames/${look.name}/${b.key}_${st.name}_j${bx.ji}.png`;
    writeFileSync(out(f), await png({ clip: { x: bx.x - bx.half, y: bx.y - bx.half, width: 2 * bx.half, height: 2 * bx.half } }));
    run.shots.push({ name: `${st.name}_j${bx.ji}`, kind: "junction", file: f });
  }
}

async function waitAsleep(ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (/asleep/.test(await stampOf(page))) return true;
    await sleep(500);
    assertFree();
  }
  return false;
}

async function doStep(look, b, run, st) {
  const frame = (n) => `frames/${look.name}/${b.key}_${n}.png`;
  switch (st.op) {
    case "waitSleep": run.steps.push({ op: st.op, slept: await waitAsleep(st.ms ?? 30000) }); break;
    case "wait": await sleep(st.ms ?? 1000); break;
    case "moves": case "tapChoice": {
      if (!(await page.evaluate(() => typeof window.__knotFabric === "function" && !!window.__knotFabric()))) throw new Missing("no fabric (knot mode or no __knotFabric)");
      const r = await makeMoves(page, st.op === "tapChoice" ? 1 : st.n, (run.walk ??= {}));
      run.steps.push({ op: st.op, ...r });
      break;
    }
    case "click": {
      const el = (await findEl(st, "a,button,[role=button],label,summary,li,span,div,p")).asElement();
      if (!el) throw new Missing(`no element ${st.selector || `"${st.text}"`}`);
      const nav = await el.evaluate((e) => { if (e.tagName === "A") e.target = "_self"; e.scrollIntoView({ block: "center", inline: "center" }); return e.tagName === "A" && (e.getAttribute("href") || "#")[0] !== "#"; });
      await sleep(300);
      const done = nav ? page.waitForNavigation({ waitUntil: "load", timeout: 15000 }).catch(() => null) : null;
      await tapEl(el);
      if (done) await done;
      await sleep(st.after ?? 800);
      run.steps.push({ op: st.op, target: st.selector || st.text, navigated: nav });
      break;
    }
    case "panel": {
      const btn = await page.$("button.kp-menu");
      if (!btn) throw new Missing("no panel button (button.kp-menu)");
      const open = () => btn.evaluate((e) => e.getAttribute("aria-expanded") === "true");
      const want = st.open !== false;
      if ((await open()) !== want) { await tapEl(btn); await sleep(900); }
      if ((await open()) !== want) throw new Error(`panel did not ${want ? "open" : "close"}`);
      break;
    }
    case "scroll": {
      const to = st.to, y = typeof to === "number" ? to : st.y;
      const sel = st.selector ?? (typeof to === "string" ? to : undefined);
      const el = sel || st.text ? (await findEl({ selector: sel, text: st.text }, "a,button,li,p,span,div,h1,h2,h3")).asElement() : null;
      if (el) await el.evaluate((e, block) => e.scrollIntoView({ block }), st.block || "center");
      else if (typeof y === "number") await page.evaluate((y) => window.scrollTo(0, y), y);
      else throw new Missing(`nothing to scroll to: ${sel || st.text}`);
      await sleep(st.after ?? 500);
      break;
    }
    case "pin": await page.evaluate(pinAll); await sleep(700); break;
    case "reload": await page.reload({ waitUntil: "load", timeout: 90000 }); await waitAsleep(st.ms ?? 30000); break;
    case "eval": {
      // Runs `js` in the page (a Promise is awaited) and keeps its JSON result in the look's report: steps[].result.
      const result = await page.evaluate((js) => (0, eval)(js), st.js);
      run.steps.push({ op: st.op, name: st.name ?? null, result: result === undefined ? null : result });
      break;
    }
    case "shot": {
      writeFileSync(out(frame(st.name)), await png(st.clip ? { clip: st.clip } : {}));
      run.shots.push({ name: st.name, kind: "shot", file: frame(st.name) });
      if (st.junctions) await junctionCrops(look, b, run, st);
      break;
    }
    case "burst": {
      const t0 = Date.now();
      for (let k = 0; k < st.n; k++) {
        const tk = Date.now(), n = `${st.name}_${String(k).padStart(2, "0")}`;
        writeFileSync(out(frame(n)), await png());
        run.shots.push({ name: n, kind: "burst", file: frame(n), tMs: tk - t0 });
        assertFree();
        await sleep(Math.max(0, st.everyMs - (Date.now() - tk)));
      }
      break;
    }
    default: throw new Error(`unknown step op "${st.op}"`);
  }
}

async function runLook(look, b) {
  const run = { status: "ok", reason: null, stamp: null, shots: [], steps: [] };
  const mode = look.load || "sleep";
  try {
    assertFree();
    // Every look starts on a clean origin. The panel's open state and K79's motion preference persist in localStorage,
    // and K122's look (it opens the panel) left it open over the maze in every look after it: the next look's walk
    // then tapped the panel, not the threads (K156 3c, on the phone).
    await page.goto(`${b.host}/favicon.svg`, { waitUntil: "load", timeout: 30000 }).catch(() => {});
    await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch { /* none */ } }).catch(() => {});
    const url = `${b.host}/${look.link}`;
    if (mode === "none") await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
    else {
      run.stamp = (mode === "frozen" ? await loadFrozen(page, url) : await load(page, url, look.settleMs ?? 40000)).stamp;
      checkBuild(b, run.stamp);
      await checkNeeds(look.needs);
    }
    for (const st of look.steps || []) { assertFree(); await doStep(look, b, run, st); }
    if (mode === "none") {
      run.stamp = await stampOf(page).catch(() => "");
      checkBuild(b, run.stamp);
      await checkNeeds(look.needs);
    }
  } catch (e) {
    if (String(e.message).startsWith("WATCHDOG TRIPPED")) throw e;
    run.status = e instanceof Missing ? "missing" : "error";
    run.reason = String(e.message).slice(0, 240);
  }
  return run;
}

try {
  for (const look of spec.looks) {
    if (only && !only.includes(look.name)) continue;
    const rec = { name: look.name, link: look.link, runs: {} };
    report.looks.push(rec);
    for (const b of [BUILDS[1], BUILDS[0]]) {
      const r = (rec.runs[b.key] = await runLook(look, b));
      console.log(`${look.name.padEnd(26)} ${b.key.padEnd(4)} ${r.status}${r.reason ? ` (${r.reason})` : ""} shots ${r.shots.length}`);
    }
  }
} finally {
  await browser.disconnect();
  makeSheets(report, CFG.out);
  writeFileSync(out("looks_report.json"), JSON.stringify(report, null, 1));
  for (const l of report.looks) console.log(`sheet ${l.name}: ${l.sheet ?? "none"}`);
  if (errors.length) console.log("page errors:", errors.slice(0, 3));
}
