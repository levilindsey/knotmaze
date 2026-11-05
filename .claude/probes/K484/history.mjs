// K484 probe: the settings sheet's history entries in headed real-time
// Chrome (never --virtual-time-budget). Two countable cases from
// docs/design/K467.md's Handoff, driven with the menu button at a sheet
// viewport (412 x 915 CSS px, touch), never through SheetHistory directly.
//
//   node .claude/probes/K484/history.mjs <base> <outDir> <before|after>
//
// Serve first:
//   npx vite --config .claude/probes/K484/vite.private-cache.config.ts --port 5580 --strictPort --host 127.0.0.1
//
// Case A: open the sheet, reload, then one Back.
// Case B: five fast close-then-reopen cycles (all clicks in one JS task,
// each cycle well under 50 ms, before any counted pop can land), then a
// final close and a Back.
// The link is a full design link (?7&am=instant&snd=none), not the bare
// daily. Records go to <outDir>/<mode>_report.json.
import { createRequire } from "node:module";
import { mkdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire("C:/Users/lsl/Repositories/knotmaze/package.json");
const puppeteer = require("puppeteer-core");
const HERE = dirname(fileURLToPath(import.meta.url));

const [base = "http://127.0.0.1:5580/", outDir = join(HERE, "out"), mode = "before"] =
  process.argv.slice(2);
const LINK = "?7&am=instant&snd=none";
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

mkdirSync(outDir, { recursive: true });
const profile = join(HERE, "profiles", `${mode}-${process.pid}`);
mkdirSync(profile, { recursive: true });
const report = { mode, base, link: LINK, viewport: "412x915", cases: {}, checks: [], errors: [] };
const check = (name, ok, data = {}) => {
  report.checks.push({ name, ok: !!ok, ...data });
  console.log(`CHECK ${ok ? "ok  " : "FAIL"} ${name} ${JSON.stringify(data)}`);
};
const step = (ns, name, data = {}) => {
  (report.cases[ns] ??= []).push({ name, ...data });
  console.log(`[${ns}] ${name}: ${JSON.stringify(data)}`);
};

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: false,
  userDataDir: profile,
  args: [
    "--use-angle=d3d11",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-features=CalculateNativeWinOcclusion",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
    "--window-position=2200,50",
    "--window-size=520,1100",
  ],
});

async function newSheetPage() {
  const page = await browser.newPage();
  page.on("pageerror", (e) => report.errors.push(`PAGEERROR ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !/favicon|404/.test(m.text()))
      report.errors.push(`console.error ${m.text()}`);
  });
  await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
  return page;
}

async function waitReady(page, label) {
  const t0 = Date.now();
  for (let i = 0; i < 600; i++) {
    const s = await page
      .evaluate(() => ({
        menu: !!document.querySelector(".kp-menu"),
        fabric: !!window.__knotFabric?.(),
        perf: window.__knotPerf?.(1)?.state ?? null,
      }))
      .catch(() => null);
    if (s && s.menu && s.fabric && s.perf !== "loading") {
      await sleep(600);
      return;
    }
    await sleep(100);
  }
  report.errors.push(`${label}: never ready`);
}

const state = (page) =>
  page.evaluate(() => ({
    len: history.length,
    state: history.state,
    expanded: document.querySelector(".kp-menu")?.getAttribute("aria-expanded") ?? null,
    rootOpen: document.documentElement.classList.contains("kp-open"),
    sheetShown: (() => {
      const e = document.querySelector(".tp-dfwv");
      if (!e) return false;
      const r = e.getBoundingClientRect();
      return r.width > 0 && getComputedStyle(e).display !== "none";
    })(),
    search: location.search,
    marker: window.__k484marker ?? null,
  })).catch((e) => ({ evalError: String(e.message).slice(0, 120) }));

async function tapMenu(page) {
  const c = await page.evaluate(() => {
    const r = document.querySelector(".kp-menu").getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await page.touchscreen.tap(c.x, c.y);
}

// ---------------- Case A: open, reload, one Back ----------------
{
  const page = await newSheetPage();
  await page.goto(new URL(LINK, base).href, { waitUntil: "load", timeout: 60000 });
  await waitReady(page, "A load");
  await page.evaluate(() => (window.__k484marker = "A-before-reload"));
  let s = await state(page);
  step("A", "loaded, sheet closed", s);
  check("A: closed on load", s.expanded === "false" && !s.sheetShown, s);
  const closedLen = s.len;

  await tapMenu(page);
  await sleep(700);
  s = await state(page);
  step("A", "sheet opened by the menu button", s);
  check("A: open owns one entry", s.expanded === "true" && s.len === closedLen + 1 && s.state?.kmSheet === 1, s);
  const openSearch = s.search;
  const openLen = s.len;

  await page.reload({ waitUntil: "load", timeout: 60000 }).catch((e) => step("A", "reload threw", { msg: String(e.message).slice(0, 100) }));
  await waitReady(page, "A reload");
  await sleep(1200); // let any load reconcile / popstate settle
  await waitReady(page, "A reload settle");
  await page.evaluate(() => (window.__k484marker = "A-after-reload")).catch(() => {});
  s = await state(page);
  step("A", "after reload (settled)", s);
  if (mode === "after") {
    check("A: reload left no stale entry (current entry unmarked, sheet closed)",
      s.state === null && s.expanded === "false" && !s.sheetShown, s);
  } else {
    // The fresh page's first link write replaces the mark with null, so
    // the stale entry shows in the stack length, not in history.state.
    check("A(before): the stale entry is still stacked over the closed sheet's entry",
      s.len === openLen && s.expanded === "false", { openLen, ...s });
  }
  const settledSearch = s.search;

  await page.goBack({ timeout: 8000 }).catch((e) => step("A", "goBack threw", { msg: String(e.message).slice(0, 100) }));
  await sleep(1200); // a fixed Back may leave the app: no readiness wait
  s = await state(page);
  step("A", "after one Back", { ...s, designKept: s.search === settledSearch && s.search === openSearch });
  if (mode === "after") {
    // A fresh page's first Back leaves for the entry under the app (the
    // probe's initial blank entry): the app document is gone.
    check("A: first Back is a fresh page's (no dead entry to spend it on; it leaves the app)",
      s.marker !== "A-after-reload" || !String(s.search).includes("7"), s);
  } else {
    check("A(before): first Back only spent the dead entry (still on the design, sheet closed)",
      s.expanded === "false" && s.search === openSearch, s);
  }
  await page.close().catch(() => {});
}

// ---------------- Case B: five fast close-then-reopen cycles ----------------
{
  const page = await newSheetPage();
  await page.goto(new URL(LINK, base).href, { waitUntil: "load", timeout: 60000 });
  await waitReady(page, "B load");
  await page.evaluate(() => (window.__k484marker = "B"));
  let s = await state(page);
  step("B", "loaded, sheet closed", s);
  const closedLen = s.len;

  await tapMenu(page);
  await sleep(700);
  s = await state(page);
  step("B", "sheet opened", s);
  const openLen = s.len;
  check("B: open owns one entry", s.len === closedLen + 1 && s.state?.kmSheet === 1, s);

  // Five close-then-reopen cycles in ONE JS task: the counted pop from
  // each history.back() cannot be delivered between the clicks.
  const t0 = Date.now();
  const during = await page.evaluate(() => {
    const menu = document.querySelector(".kp-menu");
    for (let i = 0; i < 5; i++) {
      menu.click(); // close (asks history.back())
      menu.click(); // reopen, inside the pop's flight
    }
    return {
      len: history.length,
      state: history.state,
      expanded: menu.getAttribute("aria-expanded"),
    };
  });
  const cycleMs = Date.now() - t0;
  step("B", "five fast cycles done (one task)", { ...during, cycleMs });
  check("B: cycles ran fast (one task, <50 ms a cycle)", cycleMs < 250, { cycleMs });

  await sleep(900); // counted pops land; any deferred push lands
  s = await state(page);
  step("B", "settled, sheet open again", s);
  if (mode === "after") {
    check("B: five cycles left exactly the one entry an open sheet owns",
      s.len === openLen && s.expanded === "true" && s.state?.kmSheet === 1, { openLen, ...s });
  } else {
    check("B(before): cycles piled up extra entries", s.len > openLen, { openLen, ...s });
  }

  // Final close gives the entry back; a Back then has nothing of ours.
  await tapMenu(page);
  await sleep(900);
  s = await state(page);
  step("B", "final close (settled)", s);
  check("B: final close closed and gave the entry back (current entry unmarked)",
    s.expanded === "false" && s.state === null, s);
  await page.goBack({ timeout: 8000 }).catch((e) => step("B", "goBack threw", { msg: String(e.message).slice(0, 100) }));
  await sleep(1000);
  s = await state(page);
  step("B", "after the final Back", s);
  if (mode === "after") {
    check("B: the final Back spends nothing of the sheet's (it leaves the app, as a fresh page's would)",
      s.marker !== "B" || !String(s.search).includes("7"), s);
  } else {
    check("B(before): the final Back is spent inside the piled-up stack (page stays, closed)",
      s.marker === "B" && s.expanded === "false", s);
  }
  await page.close().catch(() => {});
}

report.failed = report.checks.filter((c) => !c.ok).map((c) => c.name);
writeFileSync(join(outDir, `${mode}_report.json`), JSON.stringify(report, null, 2));
console.log(`checks: ${report.checks.length - report.failed.length}/${report.checks.length} ok; failed: ${JSON.stringify(report.failed)}`);
console.log(`errors: ${JSON.stringify(report.errors)}`);
await browser.close().catch(() => {});
try {
  rmSync(profile, { recursive: true, force: true });
} catch {}
console.log(`profile removed: ${!existsSync(profile)}`);
