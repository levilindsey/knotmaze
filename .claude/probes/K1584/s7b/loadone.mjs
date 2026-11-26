// K1584 s7b: one gf load, timed to its first gf frame. Same browser flags, viewport and DSF as cap40pin.mjs.
//   node loadone.mjs <url> <profileDir> [timeoutS=420]
// Prints a row whenever the gf compile state changes (and every 15 s): seconds since launch, the app state, the
// compile worker, compile issued/ready, composites, context losses, and the GPU process (pid, cpu s) from
// SystemInfo.getProcessInfo, so a GPU process replaced mid-load shows. Ends at the first gf frame (switchedMs > 0
// and composites > 0) or the timeout, then prints the full __knotGf.stats and the profile's Crashpad report count.
import puppeteer from "puppeteer-core";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
const [, , url, prof, secs = "420"] = process.argv;
const b = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: prof, protocolTimeout: 900000,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1660,1060",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
const t0 = Date.now(); const T = () => ((Date.now() - t0) / 1000).toFixed(1).padStart(6);
const cdp = await b.target().createCDPSession();
const gpu = async () => { try { const r = await cdp.send("SystemInfo.getProcessInfo"); const g = r.processInfo.filter((p) => p.type === "GPU"); return g.map((p) => `${p.id}:${p.cpuTime.toFixed(1)}`).join(","); } catch (e) { return "?"; } };
const p = await b.newPage();
await p.evaluateOnNewDocument(() => {
  window.__knotLoopMode = "continuous"; window.__lost = 0;
  try { localStorage.setItem("knotmaze.panelOpen", "0"); } catch {}
  const gc = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (...a) { if (!this.__h) { this.__h = 1; this.addEventListener("webglcontextlost", () => { if (this.isConnected) window.__lost++; console.log("CTXLOST"); }); } return gc.apply(this, a); };
});
p.on("console", (m) => { const t = m.text(); if (m.type() === "error" || /CTXLOST|KnotMaze P4/.test(t)) console.log(T(), "console." + m.type(), t.slice(0, 300)); });
p.on("pageerror", (e) => console.log(T(), "pageerror", e.message.slice(0, 300)));
await p.setViewport({ width: 1600, height: 900, deviceScaleFactor: 2 });
const g0 = await gpu();
console.log(T(), "start gpu", g0);
await p.goto(url, { waitUntil: "load", timeout: 900000 });
await p.bringToFront();
console.log(T(), "load event");
let last = ""; let first = null;
for (let i = 0; i < +secs; i++) {
  await new Promise((r) => setTimeout(r, 1000));
  const s = await p.evaluate(() => { const st = globalThis.__knotGf?.stats; const ps = window.__knotPerf?.()?.state; if (!st) return { ps }; return { ps, cw: st.compileWorker, warmed: st.compileWarmed, iss: st.compileIssued, rdy: st.compileReady, firstMs: st.compileFirstMs != null ? Math.round(st.compileFirstMs) : null, sw: st.switchedMs ? Math.round(st.switchedMs) : 0, c: st.composites ?? 0, fb: st.fallback ?? null, lost: window.__lost }; }).catch((e) => ({ err: e.message.slice(0, 80) }));
  const gp = await gpu();
  const key = JSON.stringify(s);
  if (key !== last || i % 15 === 0) console.log(T(), key, "gpu", gp);
  last = key;
  if (s.sw > 0 && s.c > 0) { first = T(); break; }
  if (s.fb) break;
}
console.log(T(), first ? `FIRST GF FRAME at ${first.trim()} s` : "NO GF FRAME");
const all = await p.evaluate(() => { const st = { ...(globalThis.__knotGf?.stats ?? {}) }; for (const k of Object.keys(st)) if (Array.isArray(st[k]) && st[k].length > 8) st[k] = `[${st[k].length} items]`; return JSON.stringify(st); }).catch((e) => e.message);
console.log("stats", all.slice(0, 2000));
console.log("gpu end", await gpu());
const cp = join(prof, "Crashpad", "reports");
console.log("crashpad reports", existsSync(cp) ? readdirSync(cp).length : 0);
await b.close();
