// K1040 S4a: label alone against label + band, render sync on the phone (its
// PowerVR has no timer query, so the time is the draw plus 1-px readbacks of
// L and the canvas, wall; page.ts time(), the desktop's method).
// s3's phone_time.mjs cut down to this page: it bundles page.ts into
// out/phone.js, serves out/phone.html and phone.js on 127.0.0.1:<port>,
// tunnels that port to the phone (adb reverse) and its Chrome's DevTools to
// 9222 (adb forward), adding only what is missing, opens the page with
// `am start` (an intent: no key or input event), drives window.s4a.time per
// scene over CDP, then closes its own tab while Chrome is in front and removes
// only what it added. A getevent watch stops the run at the first input event.
// The device is the one online adb device, or $env:ANDROID_SERIAL's of several.
// Never prints or writes the device serial or an address. Run it under both
// locks: run_phone.ps1 does (phone_batch.ps1 runs a batch of it).
//   node phone_time.mjs [scene,...] [--scale 2] [--frames 40] [--rounds 5]
//        [--fit 411x753] [--port 5963] [--label name] [--dry]
// --dry bundles the page (to out/phone_dry.js) and prints the run, touching no
// phone: no adb call at all, no server.
// Writes out/phone_time_<label>_<scene>.json and appends to out/phone_time_summary.md.
import puppeteer from "puppeteer-core";
import { rolldown } from "rolldown";
import { execFileSync, spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdirSync, appendFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const ADB = "C:\\Users\\lsl\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Google.PlatformTools_Microsoft.Winget.Source_8wekyb3d8bbwe\\platform-tools\\adb.exe";
const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const SCENES = [
  "muse_hash", "muse_default_tw", "def", "fat", "ring", "user_tw42.lightpaper",
  "g41_def_tw42", "g41_def_tw64", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64",
];
const args = process.argv.slice(2);
const val = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const BOOL = new Set(["--dry"]);
const dry = args.includes("--dry");
const pos = args.filter((a, i, all) => !a.startsWith("--") && !(i > 0 && all[i - 1].startsWith("--") && !BOOL.has(all[i - 1])));
const scenes = pos.length ? pos[0].split(",") : SCENES;
const scale = Number(val("--scale", 2)), frames = Number(val("--frames", 40)), rounds = Number(val("--rounds", 5)), port = Number(val("--port", 5963));
const fitArg = val("--fit", null);
const fit = fitArg ? fitArg.split("x").map(Number) : undefined;
const runLabel = val("--label", "");
const outDir = join(here, "out");
mkdirSync(outDir, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const hms = () => new Date().toTimeString().slice(0, 8);
let maskStr = (s) => String(s);
const log = (m) => console.log(`${hms()} ${maskStr(m)}`);
const adb = (dev, ...a) =>
  execFileSync(ADB, dev ? ["-s", dev, ...a] : a, { encoding: "utf8", timeout: 30000, stdio: ["ignore", "pipe", "ignore"] });
const within = (p, ms, what) => Promise.race([p, sleep(ms).then(() => { throw new Error(`${what} timed out (${ms / 1000} s)`); })]);

// The page first: a dry run stops after it.
const bundle = await rolldown({ input: join(here, "page.ts"), platform: "browser", logLevel: "warn" });
await bundle.write({ file: join(outDir, dry ? "phone_dry.js" : "phone.js"), format: "iife", inlineDynamicImports: true });
await bundle.close();
for (const n of scenes) readFileSync(join(SCENE_DIR, `${n}.json`), "utf8");
if (dry) {
  log(`dry run, no phone: bundled out/phone_dry.js; label ${runLabel || "-"}, ${scenes.length} scenes (${scenes.join(",")}), scale ${scale}, frames ${frames} x rounds ${rounds} per arm, fit ${fit ? fit.join("x") : "none (the scene's camera)"}, port ${port}`);
  process.exit(0);
}

const { ensurePhoneReady, PhoneNotReady } = await import("../../../../scripts/phone_pass/phone_ready.mjs");
// $env:ANDROID_SERIAL (adb's own variable) picks one of several: the phone over USB and wireless adb at once (5ace293a).
const want = process.env.ANDROID_SERIAL;
const listed = adb(null, "devices").split(/\r?\n/).filter((l) => /\tdevice$/.test(l)).map((l) => l.split("\t")[0]);
const online = want ? listed.filter((d) => d === want) : listed;
if (online.length !== 1) {
  log(`refusing: ${online.length} online adb devices (want exactly one${want ? "; ANDROID_SERIAL is not listed" : ""})`);
  process.exit(4);
}
const dev = online[0];
maskStr = (s) => String(s).split(dev).join("<device>");
const sh = (cmd) => { try { return adb(dev, "shell", cmd); } catch (e) { return String(e.stdout ?? ""); } };
function phoneState() {
  const thermal = (sh("dumpsys thermalservice | grep -m1 'Thermal Status'").match(/Thermal Status:\s*(\d+)/) ?? [])[1] ?? "?";
  const bt = (sh("dumpsys battery | grep -m1 temperature").match(/temperature:\s*(\d+)/) ?? [])[1];
  const media = [...sh("dumpsys media_session | grep -E 'state=PlaybackState'").matchAll(/state=PlaybackState \{state=([A-Z_]+)/g)].map((m) => m[1]);
  const top = sh("dumpsys activity activities | grep -m1 topResumedActivity");
  return {
    thermal,
    battery: bt ? (Number(bt) / 10).toFixed(1) : "?",
    media: media.includes("PLAYING") ? "a session playing" : "none playing",
    topPkg: (top.match(/u0 ([\w.]+)\//) ?? [])[1] ?? "?",
  };
}
const front = (p) => (/launcher/.test(p) ? "the launcher" : /^com\.android\.chrome$/.test(p) ? "Chrome" : p === "?" ? "?" : "an app");
const fmtState = (s) => `thermal ${s.thermal}, battery ${s.battery} C, media ${s.media}, in front ${front(s.topPkg)}`;

const html =
  '<!doctype html>\n<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">' +
  '<title>K1040 S4a band pass (phone)</title><link rel="icon" href="data:,"></head>\n' +
  '<body style="margin:0;background:#151b28;color:#ccd;font:16px sans-serif"><p style="padding:16px">K1040 band pass timing</p>' +
  '<script src="phone.js"></script></body></html>\n';
writeFileSync(join(outDir, "phone.html"), html);
const files = {
  "/phone.html": ["text/html; charset=utf-8", html],
  "/phone.js": ["text/javascript; charset=utf-8", readFileSync(join(outDir, "phone.js"))],
};
const server = createServer((req, res) => {
  const p = (req.url ?? "/").split("?")[0];
  const f = files[p];
  if (!f) { res.writeHead(/favicon/.test(p) ? 204 : 404); res.end(); return; }
  res.writeHead(200, { "content-type": f[0], "cache-control": "no-store" });
  res.end(f[1]);
});
await new Promise((ok, no) => { server.once("error", no); server.listen(port, "127.0.0.1", ok); });
log(`serving out/phone.html on 127.0.0.1:${port}`);

const summary = [`# phone time ${new Date().toISOString()}${runLabel ? ` (${runLabel})` : ""}`, "", `scale ${scale}, frames ${frames} x rounds ${rounds} per arm (interleaved), ${fit ? `fit ${fit.join("x")} (K923's bbox fit)` : "the scene's camera"}, render sync (no timer query)`];
const errors = [];
let addedRev = false, addedFwd = false, touched = null, browser = null, page = null, ge = null, s0 = null;
try {
  if (!adb(dev, "reverse", "--list").includes(`tcp:${port}`)) { adb(dev, "reverse", `tcp:${port}`, `tcp:${port}`); addedRev = true; log(`added adb reverse tcp:${port}`); }
  const fwd = adb(null, "forward", "--list").split(/\r?\n/).filter((l) => l.includes("tcp:9222"));
  if (fwd.length === 0) { adb(dev, "forward", "tcp:9222", "localabstract:chrome_devtools_remote"); addedFwd = true; log("added adb forward tcp:9222"); }
  else if (!fwd.every((l) => l.startsWith(dev + " ") && l.includes("chrome_devtools_remote"))) throw new Error("tcp:9222 is forwarded elsewhere; left alone");
  s0 = phoneState();
  log(`phone at start: ${fmtState(s0)}`);
  summary.push(`start ${hms()}: ${fmtState(s0)}`);
  try {
    await ensurePhoneReady({ adb: ADB, serial: dev, quietS: 0 });
  } catch (e) {
    throw new Error(e instanceof PhoneNotReady ? e.line : `ready check failed: ${String(e.message || e).split("\n")[0]}`);
  }
  ge = spawn(ADB, ["-s", dev, "shell", "getevent", "-q", "-l"], { stdio: ["ignore", "pipe", "ignore"] });
  ge.stdout.on("data", (d) => { if (!touched && String(d).trim()) { touched = hms(); log(`INPUT EVENT at ${touched}: stopping`); } });
  await sleep(1500);
  if (touched) throw new Error("input events before the run");

  const url = `http://localhost:${port}/phone.html?k1040s4a=${Date.now()}`;
  sh(`am start -a android.intent.action.VIEW -d '${url}' com.android.chrome`);
  log("page opened with am start");
  let ok = false;
  for (let i = 0; i < 40 && !ok; i++) { try { ok = (await fetch("http://127.0.0.1:9222/json/version")).ok; } catch { await sleep(500); } }
  if (!ok) throw new Error("no DevTools on 9222");
  browser = await puppeteer.connect({ browserURL: "http://127.0.0.1:9222", defaultViewport: null, protocolTimeout: 10 * 60 * 1000 });
  const target = await browser.waitForTarget((t) => t.type() === "page" && t.url() === url, { timeout: 30000 });
  page = await target.page();
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`console: ${m.text()}`); });
  await page.waitForFunction(() => !!window.s4a, { timeout: 30000 });
  const env = await page.evaluate(() => ({ r: window.s4a.renderer(), w: innerWidth, h: innerHeight, dpr: devicePixelRatio, vis: document.visibilityState }));
  log(`renderer ${env.r}; window ${env.w}x${env.h} dpr ${env.dpr}; ${env.vis}`);
  summary.push(`renderer ${env.r}; window ${env.w}x${env.h} at dpr ${env.dpr} (${env.vis}); the page renders its own ${scale}x canvas`, "");

  for (const name of scenes) {
    if (touched) break;
    const st = phoneState();
    const scene = JSON.parse(readFileSync(join(SCENE_DIR, `${name}.json`), "utf8"));
    scene.name = name;
    const t0 = Date.now();
    const res = await within(page.evaluate((s, o) => window.s4a.time(s, o), scene, { scale, frames, rounds, fit }), 300000, name);
    res.scene = name;
    res.wallMs = Date.now() - t0;
    res.phone = st;
    res.touchedDuring = touched;
    writeFileSync(join(outDir, `phone_time_${runLabel ? runLabel + "_" : ""}${name}.json`), JSON.stringify(res, null, 1));
    const line = `- ${name}: ${res.W}x${res.H}, render sync p50/p95 ms: label ${res.label.p50.toFixed(1)}/${res.label.p95.toFixed(1)}, label+band ${res.band.p50.toFixed(1)}/${res.band.p95.toFixed(1)} (band +${(res.band.p50 - res.label.p50).toFixed(1)}); strips ${res.strips}; prep label ${res.prepLabelMs.toFixed(1)} band ${res.prepBandMs.toFixed(1)} ms; lost ${res.lost}; before it: thermal ${st.thermal}, battery ${st.battery} C, media ${st.media}; ${res.wallMs} ms${touched ? " (INPUT EVENT during it: void)" : ""}`;
    summary.push(line);
    log(line);
  }
  const s1 = phoneState();
  summary.push("", `end ${hms()}: ${fmtState(s1)}`);
  log(`phone at end: ${fmtState(s1)}`);
} catch (e) {
  errors.push(`runner: ${e.message}`);
  log(`ERROR ${e.message}`);
} finally {
  if (page) { try { await within(page.close(), 15000, "closing my tab"); log("closed my tab"); } catch (e) { log(`closing my tab failed: ${e.message}`); } }
  if (browser) { try { browser.disconnect(); } catch {} }
  if (page && !touched && s0 && /launcher/.test(s0.topPkg)) {
    sh("am start -a android.intent.action.MAIN -c android.intent.category.HOME");
    log("launcher back in front (HOME intent)");
  }
  if (ge) ge.kill();
  if (addedRev) { try { adb(dev, "reverse", "--remove", `tcp:${port}`); log(`removed adb reverse tcp:${port}`); } catch (e) { log(`reverse remove failed: ${e.message}`); } }
  if (addedFwd) { try { adb(dev, "forward", "--remove", "tcp:9222"); log("removed adb forward tcp:9222"); } catch (e) { log(`forward remove failed: ${e.message}`); } }
  server.close();
}
summary.push("", `input events: ${touched ? `one at ${touched}, run stopped` : "none"}`, `errors: ${errors.length}`, ...errors.slice(0, 20).map((e) => `- ${maskStr(e)}`), "");
appendFileSync(join(outDir, "phone_time_summary.md"), summary.join("\n") + "\n");
process.exit(errors.length || touched ? 1 : 0);
