// phone_ready.mjs: the phone kit's ONE readiness check (K1142). Every runner that opens anything on the phone calls it first.
//
// The phone is READY only when all of these hold:
//   - the screen is on and the phone is unlocked;
//   - the LAUNCHER (the home screen) is in front. An app in front is a person's, and Chrome in front is refused too unless
//     the caller says it left Chrome there itself (--allow-chrome): a page the kit opened is not the same as Levi reading in
//     Chrome, and the state text cannot tell them apart. A person's open Chrome gets a new tab and a pass's page in front of
//     the one being read; the kit's own leftover (a pass's cleanup closes its tab and leaves Chrome in front) must not stop
//     the next pass of a bisect, so bisect2.mjs and run_pass.ps1 pass the allowance after their own first pass;
//   - nobody has touched the phone for the QUIET WINDOW (120 s without an event from a watched device; any such event restarts it). The window is
//     OBSERVED, not read from the phone's clock: `getevent -l` streams the kernel's input events (touchscreen, keys, power),
//     and a line from a watched device restarts the window. Our CDP traffic and adb `input` inject above the kernel and print
//     none (watchdog.ps1 documents it); mLastUserActivityTime cannot be used, because puppeteer.connect() alone moves it.
//     A state that is not ready holds the window at zero, so only readings that are ready count quiet time.
// The same filter as watchdog.ps1 picks the watched devices (touch|gpio_keys|keys|power: the haptics device prints EV_FF
// whenever anything vibrates, which is not a person); test/phone_pass/phone_ready.test.ts pins both copies.
//
// It is READ-ONLY: `dumpsys` and `getevent` reads and `adb devices`. It never launches, closes, wakes, unlocks or brings
// forward anything and sends no key or input event to make the phone ready; a person decides. It prints what is in front by
// KIND only (launcher, Chrome, an app), never another app's package name, because a package name says what a person was doing
// (K1097's rule). No serial is ever printed.
//
// When not ready it re-checks with backoff (5 s, doubling to 60 s while the state is wrong; every 5 s while it counts the
// window) for up to --timeout-min minutes, which always include one full quiet window, and gives up EARLY once no quiet
// window can still fit before the deadline. The last line it prints is the verdict, one plain line:
//   phone ready: launcher in front, screen on, no touch for 120 s
//   phone not ready: an app is in front (not the launcher)
//
//   node scripts/phone_pass/phone_ready.mjs [--adb <adb.exe>] [--serial <serial>] [--quiet-s 120] [--timeout-min 0]
//        [--allow-chrome] [--progress] [--log <file>]
//   node scripts/phone_pass/phone_ready.mjs --find-adb   (prints the adb path, or the no-adb verdict; opens nothing)
//   --quiet-s       the window in seconds; 0 = a state-only read (screen, lock, front), no input watch
//   --timeout-min   how long to keep re-checking, from the start (default 0: one quiet window, no more patience)
//   --progress      print a line when the state changes, on a touch and once a minute (a long wait); the callers stamp each line
//   --serial        default: $env:ANDROID_SERIAL (adb's own variable), else the one device `adb devices` lists in state "device" (none or several: exit 6)
//   --adb           default: the running adb server's own binary, $env:ADB, adb on PATH, the SDK, the winget platform-tools
// Exit: 0 ready, 3 the phone's state (screen off, locked, an app or Chrome in front, gone), 4 touched (never quiet for the
// window before the deadline), 5 no touchscreen found to watch, 6 no adb or no phone (none, or several without --serial).
// JS callers: `import { ensurePhoneReady } from "./phone_ready.mjs"` (throws PhoneNotReady with .exit and the verdict line).
import { spawn, execFile, execFileSync } from "node:child_process";
import { existsSync, readdirSync, appendFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const QUIET_S = 120; // the quiet window, in seconds
export const POLL_S = 5;
export const MAX_POLL_S = 60;
export const CHROME = "com.android.chrome";
// One adb call that reads the state the decision needs: wakefulness, keyguard, the top resumed activity.
export const STATE_CMD = "dumpsys power | grep -E 'mWakefulness='; dumpsys window | grep -E 'isKeyguardShowing'; dumpsys activity activities | grep -m1 topResumedActivity";
export const WATCH_RE = /touch|gpio_keys|keys|power/; // watchdog.ps1's filter, verbatim
export const EXIT = { READY: 0, STATE: 3, TOUCH: 4, NO_INPUT: 5, NO_PHONE: 6 };

// ----------------------------------------------------------------- pure parts (unit-tested)

// The text STATE_CMD prints -> what the decision reads.
export function parseState(text) {
  const t = String(text ?? "");
  const wake = /mWakefulness=(\w+)/.exec(t);
  const top = /topResumedActivity=ActivityRecord\{\S+ \S+ ([\w.]+)\//.exec(t);
  return {
    reached: !!wake,
    awake: !!wake && wake[1] === "Awake",
    locked: /isKeyguardShowing=true/.test(t),
    top: top ? top[1] : null,
  };
}

// launcher | chrome | app | unknown. The launcher is any package with "launcher" in its name.
export function frontKind(top) {
  if (!top) return "unknown";
  if (top === CHROME) return "chrome";
  if (/launcher/i.test(top)) return "launcher";
  return "app";
}

// The state-only decision. kind names what is wrong (or what is in front when it is fine); text is the plain reason, with
// the front by kind only.
export function decide(state, { allowChrome = false } = {}) {
  if (!state || !state.reached) return { ok: false, kind: "gone", text: "the phone gave no state (offline?)" };
  if (!state.awake) return { ok: false, kind: "off", text: "the screen is off" };
  if (state.locked) return { ok: false, kind: "locked", text: "the phone is locked" };
  const front = frontKind(state.top);
  if (front === "launcher") return { ok: true, kind: "launcher", text: "launcher in front" };
  if (front === "chrome") {
    return allowChrome
      ? { ok: true, kind: "chrome", text: "Chrome in front (the caller left it there)" }
      : { ok: false, kind: "chrome", text: "Chrome is in front (not the launcher; a person may be reading there)" };
  }
  if (front === "app") return { ok: false, kind: "app", text: "an app is in front (not the launcher)" };
  return { ok: false, kind: "unknown", text: "cannot tell what is in front" };
}

// `getevent -p` -> [{path, name}] (only the lines the check parses: "add device N: /dev/input/eventN" and the name).
export function parseInputDevices(text) {
  const out = [];
  let cur = null;
  for (const l of String(text ?? "").split(/\r?\n/)) {
    const d = /^add device \d+: (\/dev\/input\/event\d+)/.exec(l);
    if (d) { cur = d[1]; continue; }
    const n = cur && /^\s*name:\s+"([^"]+)"/.exec(l);
    if (n) { out.push({ path: cur, name: n[1] }); cur = null; }
  }
  return out;
}
export const watchedPaths = (devs) => devs.filter((d) => WATCH_RE.test(d.name)).map((d) => d.path);

// One line of `getevent -l` (or -lt, with its "[  123.456] " prefix) from a watched device?
export function isInputLine(line, watched) {
  const m = /^(?:\[\s*[\d.]+\]\s+)?(\/dev\/input\/event\d+):/.exec(String(line));
  return !!m && watched.includes(m[1]);
}

// `adb devices` -> the serials in state "device".
export function parseDevices(text) {
  return String(text ?? "").split(/\r?\n/).map((l) => /^(\S+)\s+device\s*$/.exec(l)).filter(Boolean).map((m) => m[1]);
}

// io = { now(), sleep(ms), readState() -> parsed state, watchInput(onInput) -> {dead, stop()} }; all ms. Pure given io.
// opts = { quietS, timeoutS, pollS, maxPollS, allowChrome, say(line) }. Returns the verdict:
//   { ready: true, exit: 0, line, front, waitedS } | { ready: false, exit: 3|4|5|6, line, kind, waitedS }
// The quiet clock restarts on an input line and on every reading that is not ready, and a run of ready readings counts from
// its FIRST one (not from the poll before it, which with the backoff can be a minute earlier). The wait always allows one
// whole quiet window, gives up EARLY when no window can still fit before the deadline (a touch late in the wait), and with
// no patience (timeoutS 0) gives up on a wrong state at once.
export async function waitReady(io, opts = {}) {
  const quietS = opts.quietS ?? QUIET_S;
  const timeoutS = opts.timeoutS ?? 0;
  const pollMs = (opts.pollS ?? POLL_S) * 1000;
  const maxPollMs = (opts.maxPollS ?? MAX_POLL_S) * 1000;
  const say = opts.say || (() => {});
  const quietMs = quietS * 1000;
  const start = io.now();
  let deadline = Infinity; // start + the allowance, set at the first reading (a read takes a second, a window must still fit)
  const waited = () => Math.round((io.now() - start) / 1000);
  const waitedTxt = () => (timeoutS > 0 ? `, waited ${waited() >= 90 ? `${Math.round(waited() / 60)} min` : `${waited()} s`}` : "");
  let lastInput = start; // the quiet clock's origin
  let okSince = start; // when the current run of ready readings began
  let prevOk = false;
  let lastTouch = null;
  let seenTouch = null;
  let delay = pollMs;
  let lastKey = "";
  let lastSayAt = -Infinity;
  let watch = null;
  const open = () => { watch = quietMs > 0 ? io.watchInput(() => { lastInput = lastTouch = io.now(); }) : null; };
  try {
    open();
    for (;;) {
      let died = false;
      if (watch && watch.dead) { watch.stop(); open(); died = true; } // adb dropped: the quiet cannot be vouched for
      let d = decide(await io.readState(), { allowChrome: opts.allowChrome });
      if (d.ok && died) d = { ok: false, kind: "watch", text: "cannot watch the touchscreen (the input stream ended)" };
      const t = io.now();
      if (deadline === Infinity) deadline = t + Math.max(timeoutS, quietS) * 1000;
      if (!d.ok || !prevOk) lastInput = t; // a wrong state, or the first ready reading after one, restarts the window
      if (d.ok && !prevOk) okSince = t;
      prevOk = d.ok;
      const q = t - lastInput;
      if (d.ok && q >= quietMs) {
        const text = quietMs > 0 ? `${d.text}, screen on, no touch for ${quietS} s` : `${d.text}, screen on, unlocked`;
        return { ready: true, exit: EXIT.READY, line: `phone ready: ${text}`, front: d.kind, waitedS: waited() };
      }
      const earliest = d.ok ? lastInput + quietMs : t + quietMs; // the soonest it could be ready from here
      if ((!d.ok && timeoutS <= 0) || t >= deadline || earliest > deadline) {
        if (d.ok) {
          const touched = lastTouch !== null && lastTouch >= okSince;
          const why = touched ? `touched ${Math.round((t - lastTouch) / 1000)} s ago` : `${d.text} for only ${Math.round(q / 1000)} s`;
          return { ready: false, exit: EXIT.TOUCH, kind: touched ? "touch" : "late", waitedS: waited(), line: `phone not ready: ${why} (needs ${quietS} s without a touch${waitedTxt()})` };
        }
        const exit = d.kind === "gone" ? EXIT.NO_PHONE : d.kind === "watch" ? EXIT.NO_INPUT : EXIT.STATE;
        return { ready: false, exit, kind: d.kind, waitedS: waited(), line: `phone not ready: ${d.text}${waitedTxt() && ` (${waitedTxt().slice(2)})`}` };
      }
      // Progress, on a change of what is wrong, on a touch, and once a minute.
      if (lastTouch !== seenTouch) { say(`a touch; the ${quietS} s window restarts`); seenTouch = lastTouch; }
      const key = d.ok ? "quiet" : d.kind;
      if (key !== lastKey || t - lastSayAt >= 60000) {
        say(d.ok ? `${d.text}; quiet ${Math.floor(q / 1000)} of ${quietS} s` : `waiting: ${d.text}`);
        lastKey = key; lastSayAt = t;
      }
      let nap;
      if (d.ok) { nap = Math.min(pollMs, quietMs - q); delay = pollMs; }
      else { nap = delay; delay = Math.min(delay * 2, maxPollMs); }
      await io.sleep(Math.max(0, Math.min(nap, deadline - t)));
    }
  } finally {
    if (watch) watch.stop();
  }
}

// ----------------------------------------------------------------- the real phone

export class PhoneNotReady extends Error {
  constructor(line, exit) { super(line); this.name = "PhoneNotReady"; this.line = line; this.exit = exit; }
}

function onPath(name) {
  const exts = process.platform === "win32" ? [".exe", ".cmd", ""] : [""];
  for (const dir of String(process.env.PATH || "").split(process.platform === "win32" ? ";" : ":")) {
    for (const e of exts) { const p = join(dir, name + e); if (dir && existsSync(p)) return p; }
  }
  return null;
}

// The one adb lookup (K1159): the running adb server's own binary first (a client of another version restarts the
// server and drops everybody's connections and tunnels), then $env:ADB, adb on PATH, the SDK, the winget platform-tools.
// Pure picker: probes = { running, envAdb, pathHit, sdk, winget: [...] }, exists(path) says a probe is really there;
// the first probe that exists wins, none gives null.
export function pickAdb(probes, exists) {
  const order = [probes?.running, probes?.envAdb, probes?.pathHit, probes?.sdk, ...(probes?.winget ?? [])];
  for (const c of order) { if (c && exists(c)) return c; }
  return null;
}

export function findAdb() {
  let running = null;
  if (process.platform === "win32") {
    try {
      const p = execFileSync("pwsh", ["-NoProfile", "-Command", "(Get-Process -Name adb -ErrorAction SilentlyContinue | Where-Object { $_.Path } | Select-Object -First 1).Path"], { encoding: "utf8", timeout: 15000, windowsHide: true }).trim();
      if (p) running = p;
    } catch { /* no pwsh or no running server */ }
  }
  const local = process.env.LOCALAPPDATA;
  const sdk = local ? join(local, "Android", "Sdk", "platform-tools", "adb.exe") : null;
  const winget = [];
  if (local) {
    const pk = join(local, "Microsoft", "WinGet", "Packages");
    if (existsSync(pk)) {
      for (const d of readdirSync(pk)) {
        if (!d.startsWith("Google.PlatformTools")) continue;
        winget.push(join(pk, d, "platform-tools", "adb.exe"));
      }
    }
  }
  return pickAdb({ running, envAdb: process.env.ADB || null, pathHit: onPath("adb"), sdk, winget }, existsSync);
}

const adbRun = (adb, args, timeout = 20000) => new Promise((done) => {
  execFile(adb, args, { timeout, windowsHide: true, maxBuffer: 1 << 20 }, (err, stdout, stderr) => done({ err, out: `${stdout || ""}${stderr || ""}` }));
});

export function realIo({ adb, serial, watched }) {
  return {
    now: () => Date.now(),
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    readState: async () => parseState((await adbRun(adb, ["-s", serial, "shell", STATE_CMD])).out),
    watchInput(onInput) {
      const child = spawn(adb, ["-s", serial, "shell", "getevent", "-q", "-l"], { stdio: ["ignore", "pipe", "ignore"], windowsHide: true });
      const w = { dead: false, stop() { process.off("exit", w.stop); try { child.kill(); } catch { /* gone already */ } } };
      let buf = "";
      child.stdout.on("data", (chunk) => {
        buf += chunk;
        const lines = buf.split("\n");
        buf = lines.pop();
        for (const l of lines) if (isInputLine(l.replace(/\r$/, ""), watched)) onInput();
      });
      child.on("exit", () => { w.dead = true; });
      child.on("error", () => { w.dead = true; });
      process.on("exit", w.stop);
      return w;
    },
  };
}

// The whole check against the real phone. Resolves with the verdict, throws PhoneNotReady (.line is the verdict line, .exit
// the code). opts: adb, serial, quietS, timeoutS, allowChrome, say.
export async function ensurePhoneReady(opts = {}) {
  const quietS = opts.quietS ?? QUIET_S;
  const adb = opts.adb || findAdb();
  if (!adb) throw new PhoneNotReady("phone not ready: no adb found (set $env:ADB)", EXIT.NO_PHONE);
  let serial = opts.serial || process.env.ANDROID_SERIAL;
  if (!serial) {
    const devs = parseDevices((await adbRun(adb, ["devices"])).out);
    if (devs.length !== 1) throw new PhoneNotReady(`phone not ready: ${devs.length ? "several phones connected; pass --serial" : "no phone connected"}`, EXIT.NO_PHONE);
    serial = devs[0];
  }
  let watched = [];
  if (quietS > 0) {
    watched = watchedPaths(parseInputDevices((await adbRun(adb, ["-s", serial, "shell", "getevent", "-p"])).out));
    if (!watched.length) throw new PhoneNotReady("phone not ready: no touchscreen found to watch (getevent -p gave none)", EXIT.NO_INPUT);
  }
  const r = await waitReady(realIo({ adb, serial, watched }), { quietS, timeoutS: opts.timeoutS ?? 0, allowChrome: opts.allowChrome, say: opts.say });
  if (!r.ready) throw new PhoneNotReady(r.line, r.exit);
  return r;
}

// ----------------------------------------------------------------- command line

function parseArgs(argv) {
  const o = { quietS: QUIET_S, timeoutS: 0, allowChrome: false, progress: false, findAdb: false };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const val = () => argv[++i];
    if (k === "--adb") o.adb = val();
    else if (k === "--serial") o.serial = val();
    else if (k === "--quiet-s") o.quietS = Number(val());
    else if (k === "--timeout-min") o.timeoutS = Number(val()) * 60;
    else if (k === "--allow-chrome") o.allowChrome = true;
    else if (k === "--progress") o.progress = true;
    else if (k === "--find-adb") o.findAdb = true;
    else if (k === "--log") o.log = val();
    else throw new Error(`unknown argument ${k}`);
  }
  if (!Number.isFinite(o.quietS) || o.quietS < 0 || !Number.isFinite(o.timeoutS) || o.timeoutS < 0) throw new Error("--quiet-s and --timeout-min must be numbers >= 0");
  return o;
}

async function main(argv) {
  let o;
  try { o = parseArgs(argv); } catch (e) { console.log(`phone not ready: ${e.message}`); return EXIT.NO_PHONE; }
  const out = (line) => { console.log(line); if (o.log) appendFileSync(o.log, `${line}\n`); };
  if (o.findAdb) {
    const adb = findAdb();
    if (adb) { out(adb); return EXIT.READY; }
    out("phone not ready: no adb found (set $env:ADB)");
    return EXIT.NO_PHONE;
  }
  const say = o.progress ? (m) => out(`ready-check: ${m}`) : undefined; // unstamped: every caller's Say stamps its lines
  try {
    const r = await ensurePhoneReady({ ...o, say });
    out(r.line);
    return EXIT.READY;
  } catch (e) {
    if (e instanceof PhoneNotReady) { out(e.line); return e.exit; }
    out(`phone not ready: ${String(e.message || e).split("\n")[0]}`);
    return EXIT.NO_PHONE;
  }
}

const isMain = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href.toLowerCase() === import.meta.url.toLowerCase();
if (isMain) main(process.argv.slice(2)).then((code) => { process.exit(code); });
