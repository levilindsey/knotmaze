// K1040 S3b step 4: the label pass's render sync on the phone (its PowerVR
// has no timer query, so `sync` is the time: the draw plus pass.sync(), wall).
// Bundles page.ts into out/phone.js, serves out/phone.html and phone.js on
// 127.0.0.1:<port>, tunnels that port to the phone (adb reverse) and its
// Chrome's DevTools to 9222 (adb forward), adding only what is missing, opens
// the page with `am start` (an intent, as K923's kit does: no key or input
// event), drives window.s3.time per scene over CDP, then closes its own tab
// while Chrome is in front and removes only what it added.
// The phone stays untouched: a getevent watch (-q, events only) stops the run
// at the first input event (a person picked the phone up).
// Never prints or writes the device serial or an address: the device is the
// one online adb device (it refuses when there are several).
// Run it under both locks: run_phone.ps1 does.
//   node phone_time.mjs [scene,...] [--scale 2] [--frames 60] [--port 5403]
// Writes out/phone_time_<scene>.json and appends to out/phone_time_summary.md.
import puppeteer from "puppeteer-core";
import { rolldown } from "rolldown";
import { execFileSync, spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdirSync, appendFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ensurePhoneReady, PhoneNotReady } from "../../../../scripts/phone_pass/phone_ready.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const ADB = "C:\\Users\\lsl\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Google.PlatformTools_Microsoft.Winget.Source_8wekyb3d8bbwe\\platform-tools\\adb.exe";
const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const SCENES = [
  "muse_hash", "muse_default_tw", "def", "fat", "ring", "user_tw42.lightpaper",
  "g41_def_tw42", "g41_def_tw64", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64",
];
const args = process.argv.slice(2);
const val = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
// --b2b and --floor take no value (K923's method: page.ts time()'s opts).
const BOOL = new Set(["--b2b", "--floor", "--noscan", "--tent", "--lean", "--rest"]);
const pos = args.filter((a, i, all) => !a.startsWith("--") && !(i > 0 && all[i - 1].startsWith("--") && !BOOL.has(all[i - 1])));
const scenes = pos.length ? pos[0].split(",") : SCENES;
const scale = Number(val("--scale", 2)), frames = Number(val("--frames", 60)), port = Number(val("--port", 5403));
// --fit 411x753: K923's bbox fit on that CSS canvas (the Pixel's window);
// --b2b: the frames back to back after 10 warm-ups; --floor: readback only.
const fitArg = val("--fit", null);
const fit = fitArg ? fitArg.split("x").map(Number) : undefined;
// --noscan: the merge scan off (every window empty), as s3.mjs's.
const b2b = args.includes("--b2b"), floor = args.includes("--floor"), noscan = args.includes("--noscan");
// K1040 S3c: --tent the tent pass (no discard), --lr n its coarser target.
const tent = args.includes("--tent"), lr = Number(val("--lr", 1));
// K1040 S3d: --mode <name> a LabelBMode by name (tentv: the vertex-light tent); overrides --tent.
const passMode = val("--mode", null) ?? undefined;
// K1040 S3e: --lean the pass's lean fixed part (label_b_pass.ts, option lean);
// --rest its row diff on a still fabric (no upload after the first), not the
// moving case (every used row each frame, what the gate times).
const lean = args.includes("--lean"), rest = args.includes("--rest");
// K1040 S3f: --state host the live pass with no state queries and a Pixi host
// on the page's context (K1158; page.ts probeHost()); default S3e's query and
// restore. With --floor it is the new sync alone (the host floor).
const state = val("--state", "");
// K1040 S3d: --variants a,b,... page.ts timeMany()'s cost split (tent pass
// variants interleaved in --rounds rounds on each scene); each variant's
// outputs are named <label><variant>, so phone_table.ps1 reads them.
const variantsArg = val("--variants", null), rounds = Number(val("--rounds", 3));
// --glsl <file>: bundle that file in place of src/render/field/label_b_glsl.ts
// (an older pass on the same page, e.g. `git show <sha>:<path>`); --label
// names its outputs.
const glslSwap = val("--glsl", null);
const runLabel = val("--label", glslSwap ? "swap" : "");
const outDir = join(here, "out");
mkdirSync(outDir, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const hms = () => new Date().toTimeString().slice(0, 8);
// adb's errors quote their command line, which holds the serial (an
// address over wireless adb): every logged or written message goes through it.
let maskStr = (s) => String(s);
const log = (m) => console.log(`${hms()} ${maskStr(m)}`);
const adb = (dev, ...a) =>
  execFileSync(ADB, dev ? ["-s", dev, ...a] : a, { encoding: "utf8", timeout: 30000, stdio: ["ignore", "pipe", "ignore"] });

const online = adb(null, "devices").split(/\r?\n/).filter((l) => /\tdevice$/.test(l)).map((l) => l.split("\t")[0]);
if (online.length !== 1) {
  log(`refusing: ${online.length} online adb devices (want exactly one)`);
  process.exit(4);
}
const dev = online[0];
maskStr = (s) => String(s).split(dev).join("<device>");
const sh =(cmd) => { try { return adb(dev, "shell", cmd); } catch (e) { return String(e.stdout ?? ""); } };
function phoneState() {
  const thermal = (sh("dumpsys thermalservice | grep -m1 'Thermal Status'").match(/Thermal Status:\s*(\d+)/) ?? [])[1] ?? "?";
  const bt = (sh("dumpsys battery | grep -m1 temperature").match(/temperature:\s*(\d+)/) ?? [])[1];
  const media = [...sh("dumpsys media_session | grep -E 'state=PlaybackState'").matchAll(/state=PlaybackState \{state=([A-Z_]+)/g)].map((m) => m[1]);
  const top = sh("dumpsys activity activities | grep -m1 topResumedActivity");
  return {
    thermal,
    battery: bt ? (Number(bt) / 10).toFixed(1) : "?",
    media: media.includes("PLAYING") ? "a session playing" : "none playing",
    chromeFront: /com\.android\.chrome/.test(top),
    topPkg: (top.match(/u0 ([\w.]+)\//) ?? [])[1] ?? "?",
  };
}
// What is in front, by kind only: an app's package name says what a person was doing (S3c).
const front = (p) => (/launcher/.test(p) ? "the launcher" : /^com\.android\.chrome$/.test(p) ? "Chrome" : p === "?" ? "?" : "an app");
const fmtState = (s) => `thermal ${s.thermal}, battery ${s.battery} C, media ${s.media}, in front ${front(s.topPkg)}`;
const within = (p, ms, what) => Promise.race([p, sleep(ms).then(() => { throw new Error(`${what} timed out (${ms / 1000} s)`); })]);

// The page.
let swapped = 0;
const plugins = glslSwap
  ? [{ name: "glsl-swap", load(id) { if (id.replace(/\\/g, "/").endsWith("src/render/field/label_b_glsl.ts")) { swapped++; return readFileSync(glslSwap, "utf8"); } } }]
  : [];
const bundle = await rolldown({ input: join(here, "page.ts"), platform: "browser", logLevel: "warn", plugins });
await bundle.write({ file: join(outDir, "phone.js"), format: "iife", inlineDynamicImports: true });
await bundle.close();
if (glslSwap && swapped !== 1) { log(`refusing: the GLSL swap matched ${swapped} modules`); process.exit(5); }
const html =
  '<!doctype html>\n<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">' +
  '<title>K1040 S3b label pass (phone)</title><link rel="icon" href="data:,"></head>\n' +
  '<body style="margin:0;background:#151b28;color:#ccd;font:16px sans-serif"><p style="padding:16px">K1040 label pass timing</p>' +
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

const stamp = new Date().toISOString();
const summary = [`# phone time ${stamp}${runLabel ? ` (${runLabel})` : ""}`, "", `scale ${scale}, frames ${frames}${fit ? `, fit ${fit.join("x")} (K923's bbox fit)` : ", the scene's camera"}${b2b ? ", back to back after 10 warm-ups (K923)" : ", one a rAF"}${floor ? ", FLOOR (readback only)" : ""}${noscan ? ", the scan OFF" : ""}${tent ? ", TENT pass" : ""}${passMode ? `, mode ${passMode}` : ""}${lean ? `, LEAN fixed part${rest ? " (at rest)" : " (moving: every used row)"}` : ""}${lr !== 1 ? `, lr ${lr}` : ""}, render sync (no timer query); label_b_glsl.ts: ${glslSwap ? `swapped for ${glslSwap.replace(/\\/g, "/").split("/").pop()}` : "the worktree's"}`];
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
  // K1040 S3c: an app in front may be in a hand (S3c's first run, 08:04, opened
  // the page over one a second before a touch): only from the launcher.
  // K1142 (adopted in S3d): the shared check, state only (screen on, unlocked,
  // the launcher in front), right before the page opens; run_phone.ps1 ran
  // the full one (the quiet window) with both locks held.
  try {
    await ensurePhoneReady({ adb: ADB, serial: dev, quietS: 0 });
  } catch (e) {
    throw new Error(e instanceof PhoneNotReady ? e.line : `ready check failed: ${String(e.message || e).split("\n")[0]}`);
  }

  // The input watch: any event line means a person is handling the phone.
  ge = spawn(ADB, ["-s", dev, "shell", "getevent", "-q", "-l"], { stdio: ["ignore", "pipe", "ignore"] });
  ge.stdout.on("data", (d) => { if (!touched && String(d).trim()) { touched = hms(); log(`INPUT EVENT at ${touched}: stopping`); } });
  await sleep(1500);
  if (touched) throw new Error("input events before the run");

  const url = `http://localhost:${port}/phone.html?k1097=${Date.now()}&snd=none`;
  sh(`am start -a android.intent.action.VIEW -d '${url}' com.android.chrome`);
  log("page opened with am start");
  let ok = false;
  for (let i = 0; i < 40 && !ok; i++) { try { ok = (await fetch("http://127.0.0.1:9222/json/version")).ok; } catch { await sleep(500); } }
  if (!ok) throw new Error("no DevTools on 9222");
  browser = await puppeteer.connect({ browserURL: "http://127.0.0.1:9222", defaultViewport: null, protocolTimeout: 10 * 60 * 1000 });
  // Only our tab is attached (browser.pages() would attach every tab, and a
  // frozen background tab times out).
  const target = await browser.waitForTarget((t) => t.type() === "page" && t.url() === url, { timeout: 30000 });
  page = await target.page();
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`console: ${m.text()}`); });
  await page.waitForFunction(() => !!window.s3, { timeout: 30000 });
  const env = await page.evaluate(() => ({ r: window.s3.renderer(), w: innerWidth, h: innerHeight, dpr: devicePixelRatio, vis: document.visibilityState }));
  log(`renderer ${env.r}; window ${env.w}x${env.h} dpr ${env.dpr}; ${env.vis}`);
  summary.push(`renderer ${env.r}; window ${env.w}x${env.h} at dpr ${env.dpr} (${env.vis}); the pass renders its own ${scale}x target`, "");

  for (const name of scenes) {
    if (touched) break;
    const st = phoneState();
    const scene = JSON.parse(readFileSync(join(SCENE_DIR, `${name}.json`), "utf8"));
    scene.name = name;
    const t0 = Date.now();
    if (variantsArg) {
      const variants = variantsArg.split(",");
      const many = await within(page.evaluate((s, o) => window.s3.timeMany(s, o), scene, { variants, scale, frames, rounds, fit }), 300000, name);
      const wallMs = Date.now() - t0;
      const cells = [];
      for (const v of variants) {
        const r = many.variants[v];
        const one = { scene: name, variant: v, lost: many.lost, renderer: many.renderer, W: many.W, H: many.H, segs: many.segs, fills: many.fills, groups: many.groups, prepMs: many.prepMs, rounds: many.rounds, frames: many.frames, sync: r.sync, upload: { ...r.upload, bytes: many.bytes }, wallMs, phone: st, touchedDuring: touched };
        writeFileSync(join(outDir, `phone_time_${runLabel}${v}_${name}.json`), JSON.stringify(one, null, 1));
        cells.push(`${v} ${r.sync.p50.toFixed(1)}/${r.sync.p95.toFixed(1)}`);
      }
      const line = `- ${name}: ${many.W}x${many.H}, sync p50/p95 ms (n ${many.frames} in ${many.rounds} rounds): ${cells.join(", ")}; prep ${many.prepMs.toFixed(1)} ms; segs ${many.segs}, fills ${many.fills}; lost ${many.lost}; before it: thermal ${st.thermal}, battery ${st.battery} C, media ${st.media}; ${wallMs} ms${touched ? " (INPUT EVENT during it: void)" : ""}`;
      summary.push(line);
      log(line);
      continue;
    }
    const res = await within(page.evaluate((s, o) => window.s3.time(s, o), scene, { scale, frames, fit, b2b, floor, noscan, tent, mode: passMode, lr, lean, rest, state }), 180000, name);
    res.scene = name;
    res.wallMs = Date.now() - t0;
    res.phone = st;
    res.touchedDuring = touched;
    writeFileSync(join(outDir, `phone_time_${runLabel ? runLabel + "_" : ""}${name}.json`), JSON.stringify(res, null, 1));
    const line = `- ${name}: ${res.W}x${res.H}, sync p50 ${res.sync.p50.toFixed(1)} p95 ${res.sync.p95.toFixed(1)} ms (n ${frames}, timer ${res.timer}, state ${res.state}); upload p50 ${res.upload.p50.toFixed(1)} ms (${res.upload.bytes} B); prep ${res.prepMs.toFixed(1)} ms; segs ${res.segs}, fills ${res.fills}, groups ${res.groups}; lost ${res.lost}; before it: thermal ${st.thermal}, battery ${st.battery} C, media ${st.media}; ${res.wallMs} ms${touched ? " (INPUT EVENT during it: void)" : ""}`;
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
  // Leave the phone as found: the launcher was in front, so a HOME intent (an
  // intent like the one that opened the page, not a key event) puts it back.
  // Never after an input event: a person is using the phone then.
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
