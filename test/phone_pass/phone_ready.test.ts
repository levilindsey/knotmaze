import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error a plain .mjs module (the phone kit is not part of the type-checked sources)
import * as ready from "../../scripts/phone_pass/phone_ready.mjs";

// K1142: the phone kit's one readiness check. The fixtures are the lines the check parses, captured from a phone and
// reduced to those lines; every package name but the launcher's and Chrome's is com.example.app.
const repo = resolve(__dirname, "../..");
const { parseState, frontKind, decide, parseInputDevices, watchedPaths, isInputLine, parseDevices, waitReady, QUIET_S, WATCH_RE, STATE_CMD } = ready;

const LAUNCHER = "com.google.android.apps.nexuslauncher";
const CHROME = "com.android.chrome";
const APP = "com.example.app";

const AWAKE = "  mWakefulness=Awake\nmWakefulness=1\n";
const DOZING = "  mWakefulness=Dozing\nmWakefulness=3\n";
const UNLOCKED = "    isKeyguardShowing=false\n";
const LOCKED = "    isKeyguardShowing=true\n";
const top = (pkg: string, activity = ".MainActivity") => `  topResumedActivity=ActivityRecord{1a2b3c4 u0 ${pkg}/${activity} t12}\n`;

const F = {
  launcherQuiet: AWAKE + UNLOCKED + top(LAUNCHER, ".NexusLauncherActivity"),
  appInFront: AWAKE + UNLOCKED + top(APP),
  chromeInFront: AWAKE + UNLOCKED + top(CHROME, "org.chromium.chrome.browser.ChromeTabbedActivity"),
  screenOff: DOZING + LOCKED, // a dozing phone prints no topResumedActivity line
  locked: AWAKE + LOCKED + top(LAUNCHER, ".NexusLauncherActivity"),
  noTopLine: AWAKE + UNLOCKED,
  adbGone: "",
};

const GETEVENT_P = [
  "add device 1: /dev/input/event2",
  '  name:     "synaptics_tcm_touch"',
  "add device 2: /dev/input/event1",
  '  name:     "cs40l26_input"',
  "add device 3: /dev/input/event0",
  '  name:     "gpio_keys"',
  "",
].join("\n");

describe("K1142 phone_ready: reading the state", () => {
  it("parses wakefulness, the keyguard and the top activity", () => {
    expect(parseState(F.launcherQuiet)).toEqual({ reached: true, awake: true, locked: false, top: LAUNCHER });
    expect(parseState(F.screenOff)).toEqual({ reached: true, awake: false, locked: true, top: null });
    expect(parseState(F.chromeInFront).top).toBe(CHROME);
    expect(parseState(F.adbGone)).toEqual({ reached: false, awake: false, locked: false, top: null });
  });

  it("sorts the front into launcher, Chrome, an app, or unknown", () => {
    expect(frontKind(LAUNCHER)).toBe("launcher");
    expect(frontKind("com.android.launcher3")).toBe("launcher");
    expect(frontKind(CHROME)).toBe("chrome");
    expect(frontKind(APP)).toBe("app");
    expect(frontKind(null)).toBe("unknown");
  });

  it("asks for exactly the three reads phone_quiet.mjs made", () => {
    expect(STATE_CMD).toContain("mWakefulness=");
    expect(STATE_CMD).toContain("isKeyguardShowing");
    expect(STATE_CMD).toContain("topResumedActivity");
  });
});

describe("K1142 phone_ready: the state decision", () => {
  it("launcher in front, screen on, unlocked is ready", () => {
    expect(decide(parseState(F.launcherQuiet))).toMatchObject({ ok: true, kind: "launcher" });
  });

  it("an app in front is not ready, and the verdict never names the app", () => {
    const d = decide(parseState(F.appInFront));
    expect(d).toMatchObject({ ok: false, kind: "app" });
    expect(d.text).not.toContain("example");
    expect(d.text).toBe("an app is in front (not the launcher)");
  });

  it("the screen off is not ready", () => {
    expect(decide(parseState(F.screenOff))).toMatchObject({ ok: false, kind: "off", text: "the screen is off" });
  });

  it("a locked phone is not ready, whatever is behind the keyguard", () => {
    expect(decide(parseState(F.locked))).toMatchObject({ ok: false, kind: "locked" });
  });

  // Chrome already in front: refused by default, because the state text cannot tell a page the kit left there (a pass's
  // cleanup closes its tab and leaves Chrome in front) from Levi reading in Chrome, and the cost is not symmetric: a pass
  // run over a person's reading closes nothing of theirs but puts a new tab in front of it, while a refused chained pass is
  // one flag away (bisect2 and run_pass -Cleanup pass allowChrome after their own first pass).
  it("Chrome in front is not ready unless the caller says it left Chrome there", () => {
    expect(decide(parseState(F.chromeInFront))).toMatchObject({ ok: false, kind: "chrome" });
    expect(decide(parseState(F.chromeInFront), { allowChrome: true })).toMatchObject({ ok: true, kind: "chrome" });
    expect(decide(parseState(F.appInFront), { allowChrome: true })).toMatchObject({ ok: false, kind: "app" });
  });

  it("no state at all (adb offline) and an unreadable front are not ready", () => {
    expect(decide(parseState(F.adbGone))).toMatchObject({ ok: false, kind: "gone" });
    expect(decide(parseState(F.noTopLine))).toMatchObject({ ok: false, kind: "unknown" });
  });
});

describe("K1142 phone_ready: the input watch", () => {
  it("watches the touchscreen and the buttons, not the haptics device", () => {
    const devs = parseInputDevices(GETEVENT_P);
    expect(devs).toHaveLength(3);
    expect(watchedPaths(devs)).toEqual(["/dev/input/event2", "/dev/input/event0"]);
  });

  it("keeps watchdog.ps1's device filter", () => {
    const watchdog = readFileSync(join(repo, "scripts", "phone_pass", "watchdog.ps1"), "utf8");
    expect(WATCH_RE.source).toBe("touch|gpio_keys|keys|power");
    expect(watchdog).toContain(`-match '${WATCH_RE.source}'`);
  });

  it("counts an event line from a watched device, with or without a timestamp", () => {
    const watched = ["/dev/input/event2", "/dev/input/event0"];
    expect(isInputLine("/dev/input/event2: EV_ABS       ABS_MT_POSITION_X    000001a4", watched)).toBe(true);
    expect(isInputLine("[   1234.567890] /dev/input/event0: EV_KEY       KEY_POWER            DOWN", watched)).toBe(true);
    expect(isInputLine("/dev/input/event1: EV_FF        FF_GAIN              00000001", watched)).toBe(false);
    expect(isInputLine("add device 1: /dev/input/event2", watched)).toBe(false);
    expect(isInputLine("", watched)).toBe(false);
  });

  it("lists the devices adb reports in state device", () => {
    const text = "List of devices attached\nSERIAL_A\tdevice\nSERIAL_B\toffline\nSERIAL_C\tunauthorized\n\n";
    expect(parseDevices(text)).toEqual(["SERIAL_A"]);
    expect(parseDevices("List of devices attached\n\n")).toEqual([]);
  });
});

// A virtual clock: reads cost 200 ms, a sleep advances time and delivers the touches scheduled inside it.
function fakeIo(opts: { states: (tMs: number) => string; touchesAtS?: number[]; dieAtS?: number }) {
  let now = 0;
  const touches = (opts.touchesAtS ?? []).map((s) => s * 1000).sort((a, b) => a - b);
  let onInput: (() => void) | null = null;
  let opened = 0;
  const advance = (to: number) => {
    while (touches.length && touches[0] <= to) {
      now = touches.shift() as number;
      if (onInput) onInput();
    }
    now = to;
  };
  const io = {
    now: () => now,
    sleep: async (ms: number) => advance(now + ms),
    readState: async () => {
      advance(now + 200);
      return parseState(opts.states(now));
    },
    watchInput: (cb: () => void) => {
      opened++;
      onInput = cb;
      const first = opened === 1;
      return {
        get dead() {
          return first && opts.dieAtS !== undefined && now >= opts.dieAtS * 1000;
        },
        stop() {},
      };
    },
  };
  return { io, opened: () => opened, clock: () => now };
}

describe("K1142 phone_ready: waiting for a quiet launcher", () => {
  it("launcher in front and no touch for the window is ready, after the whole window", async () => {
    const f = fakeIo({ states: () => F.launcherQuiet });
    const r = await waitReady(f.io, { quietS: QUIET_S });
    expect(r).toMatchObject({ ready: true, exit: 0, front: "launcher", line: "phone ready: launcher in front, screen on, no touch for 120 s" });
    expect(r.waitedS).toBeGreaterThanOrEqual(120);
    expect(r.waitedS).toBeLessThan(130);
  });

  it("an app in front fails at once when the caller has no patience", async () => {
    const f = fakeIo({ states: () => F.appInFront });
    const r = await waitReady(f.io, { quietS: QUIET_S, timeoutS: 0 });
    expect(r).toMatchObject({ ready: false, exit: 3, kind: "app", line: "phone not ready: an app is in front (not the launcher)" });
    expect(r.waitedS).toBeLessThan(2);
  });

  it("the screen off, a locked phone and Chrome in front each name what failed", async () => {
    const off = await waitReady(fakeIo({ states: () => F.screenOff }).io, { quietS: QUIET_S });
    expect(off).toMatchObject({ ready: false, exit: 3, line: "phone not ready: the screen is off" });
    const locked = await waitReady(fakeIo({ states: () => F.locked }).io, { quietS: QUIET_S });
    expect(locked).toMatchObject({ ready: false, exit: 3, kind: "locked" });
    const chrome = await waitReady(fakeIo({ states: () => F.chromeInFront }).io, { quietS: QUIET_S });
    expect(chrome).toMatchObject({ ready: false, exit: 3, kind: "chrome" });
    expect(chrome.line).toMatch(/^phone not ready: Chrome is in front/);
  });

  it("a touch inside the window stops a caller with no patience, early", async () => {
    const f = fakeIo({ states: () => F.launcherQuiet, touchesAtS: [60] });
    const r = await waitReady(f.io, { quietS: QUIET_S, timeoutS: 0 });
    expect(r).toMatchObject({ ready: false, exit: 4, kind: "touch" });
    expect(r.line).toMatch(/^phone not ready: touched \d+ s ago \(needs 120 s without a touch\)$/);
    expect(r.waitedS).toBeGreaterThanOrEqual(60);
    expect(r.waitedS).toBeLessThan(75); // not the whole window: no window can still fit
  });

  it("a touch restarts the window for a caller that waits", async () => {
    const f = fakeIo({ states: () => F.launcherQuiet, touchesAtS: [60] });
    const r = await waitReady(f.io, { quietS: QUIET_S, timeoutS: 600 });
    expect(r.ready).toBe(true);
    expect(r.waitedS).toBeGreaterThanOrEqual(180); // 60 s + a whole new window
    expect(r.waitedS).toBeLessThan(195);
  });

  it("a person who keeps touching it wins: gives up at the deadline with the touch class", async () => {
    const f = fakeIo({ states: () => F.launcherQuiet, touchesAtS: [30, 100, 170, 240, 310] });
    const r = await waitReady(f.io, { quietS: QUIET_S, timeoutS: 300 });
    expect(r).toMatchObject({ ready: false, exit: 4, kind: "touch" });
    expect(r.line).toMatch(/waited \d+ (s|min)\)$/);
  });

  it("the quiet window counts from the first ready reading, never from before it", async () => {
    // An app in front for 90 s, then the launcher: the wrong state's minutes are not quiet minutes.
    const f = fakeIo({ states: (t) => (t < 90_000 ? F.appInFront : F.launcherQuiet) });
    const r = await waitReady(f.io, { quietS: QUIET_S, timeoutS: 900 });
    expect(r.ready).toBe(true);
    expect(r.waitedS).toBeGreaterThanOrEqual(90 + 120);
    expect(r.waitedS).toBeLessThan(300);
  });

  it("gives up early when the wrong state outlasts the time a window needs", async () => {
    const f = fakeIo({ states: () => F.appInFront });
    const r = await waitReady(f.io, { quietS: QUIET_S, timeoutS: 180 });
    expect(r).toMatchObject({ ready: false, exit: 3, kind: "app" });
    expect(r.waitedS).toBeLessThan(180); // t + 120 s no longer fits in 180 s
    expect(r.line).toMatch(/^phone not ready: an app is in front \(not the launcher\) \(waited \d+ (s|min)\)$/);
  });

  it("Chrome in front is ready for a caller that left it there", async () => {
    const f = fakeIo({ states: () => F.chromeInFront });
    const r = await waitReady(f.io, { quietS: 30, allowChrome: true });
    expect(r).toMatchObject({ ready: true, front: "chrome" });
  });

  it("an adb that stops answering is the no-phone class", async () => {
    const r = await waitReady(fakeIo({ states: () => F.adbGone }).io, { quietS: QUIET_S });
    expect(r).toMatchObject({ ready: false, exit: 6, kind: "gone" });
  });

  it("an input stream that ended cannot vouch for the quiet: the window restarts", async () => {
    const f = fakeIo({ states: () => F.launcherQuiet, dieAtS: 50 });
    const r = await waitReady(f.io, { quietS: QUIET_S, timeoutS: 600 });
    expect(r.ready).toBe(true);
    expect(f.opened()).toBe(2);
    expect(r.waitedS).toBeGreaterThanOrEqual(170);
  });

  it("a zero window is a state-only read and watches nothing", async () => {
    const f = fakeIo({ states: () => F.launcherQuiet });
    const r = await waitReady(f.io, { quietS: 0 });
    expect(r).toMatchObject({ ready: true, line: "phone ready: launcher in front, screen on, unlocked" });
    expect(f.opened()).toBe(0);
    expect(r.waitedS).toBeLessThan(2);
  });

  it("says what it is waiting for, without a package name", async () => {
    const said: string[] = [];
    const f = fakeIo({ states: (t) => (t < 20_000 ? F.appInFront : F.launcherQuiet), touchesAtS: [] });
    await waitReady(f.io, { quietS: 30, timeoutS: 600, say: (m: string) => said.push(m) });
    expect(said[0]).toBe("waiting: an app is in front (not the launcher)");
    expect(said.some((m) => m.startsWith("launcher in front; quiet "))).toBe(true);
    expect(said.join("\n")).not.toContain("example");
  });
});

// Every tracked script that opens something on the phone goes through the check; scripts/phone.ps1 is Levi's interactive
// tunnel and is exempt. A new opener must call phone_ready.mjs (or be listed here with the reason).
// K170: scripts/phone.ps1 is Levi's interactive tunnel (exempt below); its one key event is opt-in.
describe("K170 phone.ps1: the wake is opt-in", () => {
  const phonePs1 = () => readFileSync(join(repo, "scripts", "phone.ps1"), "utf8");

  // For each `KEYCODE_WAKEUP` / `input keyevent` occurrence in order, was it inside `if ($Wake) { ... }`
  // (or on the same line as the guard)? The before shape (an unconditional wake line) yields [false, false].
  function wakeGuarded(text: string): boolean[] {
    const guarded: boolean[] = [];
    let inWake = false;
    let depth = 0;
    for (const line of text.split(/\r?\n/)) {
      const hits = (line.match(/KEYCODE_WAKEUP|input\s+keyevent/g) ?? []).length;
      if (/if\s*\(\s*\$Wake\s*\)/.test(line)) {
        for (let i = 0; i < hits; i++) guarded.push(true);
        const net = (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length;
        inWake = net > 0;
        depth = net;
        continue;
      }
      if (inWake) {
        for (let i = 0; i < hits; i++) guarded.push(true);
        depth += (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length;
        if (depth <= 0) inWake = false;
        continue;
      }
      for (let i = 0; i < hits; i++) guarded.push(false);
    }
    return guarded;
  }

  it("the param block names -Wake", () => {
    const src = phonePs1();
    const paramBlock = src.slice(src.indexOf("param("), src.indexOf("$ErrorActionPreference"));
    expect(paramBlock).toContain("[switch]$Wake");
  });

  it("the only KEYCODE_WAKEUP and the only input keyevent sit under -Wake", () => {
    const src = phonePs1();
    expect(src.match(/KEYCODE_WAKEUP/g) ?? []).toHaveLength(1);
    expect(src.match(/input\s+keyevent/g) ?? []).toHaveLength(1);
    const guarded = wakeGuarded(src);
    expect(guarded.length).toBe(2);
    expect(guarded).toEqual([true, true]);
  });
});

describe("K1142 phone_ready: no tracked runner opens the phone unguarded", () => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(ps1|mjs)$/.test(name)) files.push(p);
    }
  };
  walk(join(repo, "scripts"));
  const opens = /shell\s+am\s+start|am start -a|shell\s+input\s|input keyevent/;
  const exempt = new Set(["scripts/phone.ps1"]);

  it("the runners that open anything call phone_ready.mjs", () => {
    const openers = files.filter((f) => opens.test(readFileSync(f, "utf8"))).map((f) => relative(repo, f).replace(/\\/g, "/"));
    expect(openers).toContain("scripts/phone_pass.ps1");
    for (const rel of openers) {
      if (exempt.has(rel)) continue;
      expect(readFileSync(join(repo, rel), "utf8"), `${rel} opens the phone without the shared check`).toContain("phone_ready.mjs");
    }
  });

  // .claude/probes/K1040/s3/run_phone.ps1 runs `phone_pass.ps1 -Phase check` and reads two things from its text: the fields
  // /awake=(\w+) locked=(\w+) top=(\S+)/ for its log line and /phone is ready/ as its gate. A reworded check must keep both
  // (or move that runner to the shared module, as the K1142 handoff says).
  it("-Phase check keeps the two texts run_phone.ps1 reads", () => {
    const src = readFileSync(join(repo, "scripts", "phone_pass.ps1"), "utf8");
    expect(src).toContain('Say "phone is ready (');
    expect(src).toMatch(/Say "phone \$\{ser\}: awake=\$\(\$st\.Awake\) locked=\$\(\$st\.Locked\) top=/);
  });

  it("the waiting helpers delegate to the shared check", () => {
    for (const rel of ["scripts/phone_pass/idle_wait.ps1", "scripts/phone_pass/retry_quiet.ps1"]) {
      expect(readFileSync(join(repo, rel), "utf8"), rel).toContain("phone_ready.mjs");
    }
  });
});
