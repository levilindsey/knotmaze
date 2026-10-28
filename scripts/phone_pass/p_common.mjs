// p_common.mjs: shared helpers of the round scripts (scan.mjs, k539_g31.mjs): the pass's own tab, a clean origin, the page hooks, image
// helpers and results writers, over lib.mjs, sheet.mjs and png.mjs of this folder. Not run directly; the scripts that import it take the
// pass's config.json (written by `phone_pass.ps1 -Phase start`) as argv[2]. KIT is this file's own folder, so a worktree's copy uses
// that worktree's kit.
import { pathToFileURL, fileURLToPath } from "node:url";
import { writeFileSync, appendFileSync } from "node:fs";
export const KIT = fileURLToPath(new URL("./", import.meta.url)).replace(/\\/g, "/");
export const L = await import(pathToFileURL(KIT + "lib.mjs").href);
export const S = await import(pathToFileURL(KIT + "sheet.mjs").href);
export const P = await import(pathToFileURL(KIT + "png.mjs").href);
export const { BUILDS, connect, myPage, sleep, out, assertFree, ensureViewport, thermal, shotViewport, loadFrozen, load, rafWindow, stampOf, checkBuild, stampSha } = L;
export const head = BUILDS[1], base = BUILDS[0];
export const HOOKS = () => { window.__ctxLost = 0; window.__ctxRestored = 0; const o = HTMLCanvasElement.prototype.addEventListener; HTMLCanvasElement.prototype.addEventListener = function (t, ...a) { return o.call(this, t, ...a); }; document.addEventListener("webglcontextlost", () => { window.__ctxLost++; }, true); document.addEventListener("webglcontextrestored", () => { window.__ctxRestored++; }, true); };
export function makeLog(dir) {
  const f = out(dir, "log.txt");
  return (...a) => { const s = a.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join(" "); console.log(s); appendFileSync(f, s + "\n"); };
}
// A clean origin (storage cleared, then the entries set), as looks.mjs starts every look; does not navigate to the app.
export async function cleanOrigin(page, host, store = { "knotmaze.movePad": "0" }) {
  await page.goto(`${host}/favicon.svg`, { waitUntil: "load", timeout: 30000 }).catch(() => {});
  await page.evaluate((store) => { try { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(store)) localStorage.setItem(k, String(v)); } catch {} }, store).catch(() => {});
}
export async function prep(page, errors) {
  page.removeAllListeners("pageerror");
  page.on("pageerror", (e) => errors.push("pageerror: " + String(e.message).slice(0, 200)));
  await page.evaluateOnNewDocument(HOOKS);
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]).catch(() => {});
}
export const readImg = (buf) => P.toRGB(P.decodePNG(buf));
export function cropRGB(img, x0, y0, w, h) {
  x0 = Math.max(0, Math.min(img.W - 1, Math.round(x0))); y0 = Math.max(0, Math.min(img.H - 1, Math.round(y0)));
  w = Math.max(1, Math.min(img.W - x0, Math.round(w))); h = Math.max(1, Math.min(img.H - y0, Math.round(h)));
  const data = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) img.data.copy(data, y * w * 3, ((y0 + y) * img.W + x0) * 3, ((y0 + y) * img.W + x0 + w) * 3);
  return { W: w, H: h, data };
}
export function upscale(img, f) {
  const W = img.W * f, H = img.H * f, data = Buffer.alloc(W * H * 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) img.data.copy(data, (y * W + x) * 3, (Math.floor(y / f) * img.W + Math.floor(x / f)) * 3, (Math.floor(y / f) * img.W + Math.floor(x / f)) * 3 + 3);
  return { W, H, data };
}
// differing pixels between two same-size images (any channel off by more than 8)
export function lumDiff(a, b) {
  if (a.W !== b.W || a.H !== b.H) return null;
  let n = 0;
  for (let i = 0; i < a.data.length; i += 3) if (Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]) > 8) n++;
  return n;
}
export const saveJSON = (dir, obj) => writeFileSync(out(dir, "results.json"), JSON.stringify(obj, null, 1));
export const savePNG = (dir, name, buf) => writeFileSync(out(dir, name), buf);
// The pass's tab: by URL when it sits on one of the pass's hosts, else by its CDP target id (cfg.tabId) after a
// probe left it on about:blank (K544's first run did). Never touches another tab.
export async function ownPage(browser) {
  try { return await myPage(browser); } catch { /* fall through */ }
  // CFG.tabId (1098) is the DevTools /json/list id; puppeteer's own target id is a hex string. The orphaned pass tab is the one about:blank page.
  const blanks = browser.targets().filter((t) => t.type() === "page" && t.url() === "about:blank");
  if (blanks.length !== 1) throw new Error("pass tab " + L.CFG.tabId + ": " + blanks.length + " about:blank pages");
  const t = blanks[0];
  const page = await t.page();
  await page.goto(`${head.host}/favicon.svg`, { waitUntil: "load", timeout: 30000 }).catch(() => {});
  await L.emulate(page);
  return page;
}
export const parkTab = (page) => page.goto(`${head.host}/favicon.svg`, { waitUntil: "load", timeout: 30000 }).catch(() => {}); // a static file on the pass's host: the tab stays findable
