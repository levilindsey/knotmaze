// K1040 S3c: wait until the phone looks left for the probe, read-only. S3c's
// first phone run (08:04) found the phone awake, unlocked and in an app, and
// opened the page over it a second before a person touched it: awake and
// unlocked (scripts/phone_pass.ps1's check) cannot tell a phone left for the
// probe from one in a hand. This waits for awake, unlocked, the LAUNCHER in
// front and no input event for --quiet seconds (getevent, as phone_time.mjs
// watches), and gives up at --until HH:MM. It sends nothing to the phone:
// getevent and dumpsys only, no key, input or intent.
//   node phone_quiet.mjs [--quiet 120] [--until 08:30]
// Exit 0: quiet (run phone_time.mjs now); 3: not by the deadline; 2: no phone.
import { spawn, execFileSync } from "node:child_process";

const ADB = "C:\\Users\\lsl\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Google.PlatformTools_Microsoft.Winget.Source_8wekyb3d8bbwe\\platform-tools\\adb.exe";
const args = process.argv.slice(2);
const val = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const quiet = Number(val("--quiet", 120));
const [hh, mm] = String(val("--until", "08:30")).split(":").map(Number);
const until = new Date();
until.setHours(hh, mm, 0, 0);
const hms = () => new Date().toTimeString().slice(0, 8);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const adb = (...a) => execFileSync(ADB, a, { encoding: "utf8", timeout: 30000, stdio: ["ignore", "pipe", "ignore"] });
const online = adb("devices").split(/\r?\n/).filter((l) => /\tdevice$/.test(l)).map((l) => l.split("\t")[0]);
if (online.length !== 1) {
  console.log(`${hms()} refusing: ${online.length} online adb devices (want exactly one)`);
  process.exit(2);
}
const dev = online[0];
const sh = (cmd) => { try { return adb("-s", dev, "shell", cmd); } catch (e) { return String(e.stdout ?? ""); } };
function state() {
  const o = sh("dumpsys power | grep -E 'mWakefulness='; dumpsys window | grep -E 'isKeyguardShowing'; dumpsys activity activities | grep -m1 topResumedActivity");
  return {
    awake: /mWakefulness=Awake/.test(o),
    locked: /isKeyguardShowing=true/.test(o),
    top: (o.match(/topResumedActivity=ActivityRecord\{\S+ \S+ ([\w.]+)\//) ?? [])[1] ?? "?",
  };
}

let lastInput = Date.now();
let inputs = 0;
const ge = spawn(ADB, ["-s", dev, "shell", "getevent", "-q", "-l"], { stdio: ["ignore", "pipe", "ignore"] });
ge.stdout.on("data", (d) => { if (String(d).trim()) { lastInput = Date.now(); inputs++; } });
let code = 3;
let said = "";
try {
  while (Date.now() < until.getTime()) {
    const s = state();
    const ok = s.awake && !s.locked && /launcher/.test(s.top);
    if (!ok) lastInput = Date.now(); // the quiet window starts once it is left at the launcher
    const q = (Date.now() - lastInput) / 1000;
    const front = /launcher/.test(s.top) ? "the launcher" : s.top === "?" ? "?" : "an app"; // no package names
    const line = `awake ${s.awake}, locked ${s.locked}, in front ${front}`;
    if (line !== said) { console.log(`${hms()} ${line}; input bursts so far ${inputs}`); said = line; }
    if (ok && q >= quiet) {
      console.log(`${hms()} quiet ${q.toFixed(0)} s at the launcher: ready`);
      code = 0;
      break;
    }
    await sleep(5000);
  }
  if (code !== 0) console.log(`${hms()} not left for the probe by ${val("--until", "08:30")}`);
} finally {
  ge.kill();
}
process.exit(code);
