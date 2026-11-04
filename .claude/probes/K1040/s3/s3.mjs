// K1040 S3: the label pass's page runner. Bundles page.ts with rolldown into
// out/page.js, writes out/page.html (favicon = data URL, so no 404; K1039) and
// runs it in headed, hardware-GPU Chrome launched the way ../run.mjs does
// (off-screen, no occlusion throttling, never --virtual-time-budget).
// Run it under the perf lock: run_locked.ps1 does.
//   node s3.mjs verdict [scene,...] [--stride 1] [--scale 2]   the census
//   node s3.mjs time [scene,...] [--scale 2] [--frames 60]     GPU timer query
// Writes out/<mode>_<scene>.json and out/<mode>_summary.md. The page's errors
// (pageerror, console errors, failed requests, HTTP >= 400) are counted with
// any favicon request filtered out and reported apart (K1039).
import puppeteer from "puppeteer-core";
import { rolldown } from "rolldown";
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, rmSync, appendFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const worktree = resolve(here, "../../../..");
const top = execSync("git rev-parse --show-toplevel", { cwd: process.cwd() }).toString().trim();
const norm = (p) => resolve(p).replace(/\\/g, "/").toLowerCase();
if (norm(top) !== norm(worktree)) {
  console.error(`refusing: git toplevel ${top} is not this probe's worktree ${worktree}`);
  process.exit(2);
}

const SCENES = [
  "muse_hash", "muse_default_tw", "def", "fat", "ring", "user_tw42.lightpaper",
  "g41_def_tw42", "g41_def_tw64", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64",
];
const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const args = process.argv.slice(2);
const mode = args[0];
if (mode !== "verdict" && mode !== "time" && mode !== "many" && mode !== "ab") {
  console.error("usage: node s3.mjs verdict|time|many|ab [scene,...] [--stride n] [--scale s] [--frames n] [--state new|host]");
  process.exit(2);
}
const val = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const pos = args.slice(1).filter((a, i, all) => !a.startsWith("--") && !(i > 0 && all[i - 1].startsWith("--")));
const scenes = pos.length ? pos[0].split(",") : SCENES;
const stride = Number(val("--stride", 1)), scale = Number(val("--scale", 2)), frames = Number(val("--frames", 60));
// --noscan 1 (time only): every merge-scan window emptied, to price the scan.
const noscan = val("--noscan", "0") === "1";
// K1040 S3c: --tent 1 the tent pass (no discard), --lr n its coarser target;
// --tag name: outputs out/<mode>_<tag>_<scene>.json, out/<mode>_<tag>_summary.md.
const tent = val("--tent", "0") === "1";
const lr = Number(val("--lr", 1));
// K1040 S3d: --mode <name> a LabelBMode by name (tentv: the vertex-light tent); overrides --tent.
const passMode = val("--mode", "") || undefined;
// K1040 S3e: --lean 1 the pass's lean fixed part (label_b_pass.ts, option lean);
// --rest 1 (time only) its row diff on a still fabric, not the moving case.
const lean = val("--lean", "0") === "1", rest = val("--rest", "0") === "1";
// --d24 1 (verdict, with --lean 1): D as a DEPTH_COMPONENT24 renderbuffer (probeDepth24).
const d24 = val("--d24", "0") === "1";
// K1040 S3f --state new|host: the live pass with no state queries (K1158;
// verdict: new; time: host, a Pixi host on the page's context). Default: S3e's
// query and restore. ab: the same-state A/B of the two (page.ts ab()).
const state = val("--state", "");
const tag = val("--tag", "");
const pre = tag ? `${mode}_${tag}` : mode;
// K1040 S3d: many --variants a,b,...: page.ts timeMany()'s cost split (render sync only).
const variants = val("--variants", "tent,empty,floor").split(",");
const outDir = join(here, "out");
mkdirSync(outDir, { recursive: true });

// Bundle the page.
const bundle = await rolldown({ input: join(here, "page.ts"), platform: "browser", logLevel: "warn" });
await bundle.write({ file: join(outDir, "page.js"), format: "iife", inlineDynamicImports: true });
await bundle.close();
writeFileSync(
  join(outDir, "page.html"),
  '<!doctype html>\n<html><head><meta charset="utf-8"><title>K1040 S3 label pass</title><link rel="icon" href="data:,"></head>\n<body style="margin:0;background:#151b28"><script src="page.js"></script></body></html>\n',
);

const profile = join(here, `.profile-${process.pid}`);
const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: false,
  userDataDir: profile,
  protocolTimeout: 30 * 60 * 1000,
  defaultViewport: { width: 640, height: 400 },
  args: [
    "--use-angle=d3d11", "--no-first-run", "--no-default-browser-check",
    "--window-position=2200,50", "--window-size=700,500",
    "--disable-features=CalculateNativeWinOcclusion",
    "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding",
  ],
});
const errors = [];
let favicon = 0;
const isFav = (u) => /favicon/i.test(u ?? "");
const stamp = new Date().toISOString();
const summary = [`# ${pre} ${stamp}`, "", `stride ${stride}, scale ${scale}, ${passMode ? `mode ${passMode}` : tent ? "TENT" : "capsule"} pass${lean ? `, LEAN fixed part${d24 ? ", D24" : ""}${mode === "time" ? (rest ? " (at rest)" : " (moving: every used row)") : ""}` : ""}, lr ${lr}${mode === "time" ? `, frames ${frames}${noscan ? ", NO merge scan" : ""}` : ""}${state ? `, state ${state}` : ""}`, ""];
try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const loc = m.location()?.url ?? "";
    if (isFav(loc) || isFav(m.text())) favicon++;
    else errors.push(`console: ${m.text()}`);
  });
  page.on("requestfailed", (r) => (isFav(r.url()) ? favicon++ : errors.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`)));
  page.on("response", (r) => {
    if (r.status() < 400) return;
    if (isFav(r.url())) favicon++;
    else errors.push(`http ${r.status()}: ${r.url()}`);
  });
  await page.goto(pathToFileURL(join(outDir, "page.html")).href);
  await page.waitForFunction(() => !!window.s3, { timeout: 15000 });
  for (const name of scenes) {
    const scene = JSON.parse(readFileSync(join(SCENE_DIR, `${name}.json`), "utf8"));
    scene.name = name;
    const t0 = Date.now();
    if (mode === "many") {
      const many = await page.evaluate((s, o) => window.s3.timeMany(s, o), scene, { variants, scale, frames });
      writeFileSync(join(outDir, `${pre}_${name}.json`), JSON.stringify(many, null, 1));
      const line = `- ${name}: ${many.W}x${many.H}, sync p50/p95 ms: ${variants.map((v) => `${v} ${many.variants[v].sync.p50.toFixed(3)}/${many.variants[v].sync.p95.toFixed(3)}`).join(", ")}; segs ${many.segs}; lost ${many.lost}; ${Date.now() - t0} ms`;
      summary.push(line);
      console.log(line);
      continue;
    }
    if (mode === "ab") {
      const r = await page.evaluate((s, o) => window.s3.ab(s, o), scene, { scale });
      writeFileSync(join(outDir, `${pre}_${name}.json`), JSON.stringify(r, null, 1));
      const line = `- ${name}: label ${r.W}x${r.H}, canvas ${r.canvas.join("x")}, stage drew ${r.drawn} px; setup gl error ${r.setupErr}; px differing from control (max diff, gl error[, error left before the arm]): ${Object.entries(r.arms).map(([a, d]) => `${a} ${d.px} (${d.max}, ${d.err}${d.pre ? `, pre ${d.pre}` : ""})`).join(", ")}; lost ${r.lost}; ${Date.now() - t0} ms`;
      summary.push(line);
      console.log(line);
      continue;
    }
    const res =
      mode === "verdict"
        ? await page.evaluate((s, o) => window.s3.verdict(s, o), scene, { scale, stride, tent, mode: passMode, lr, lean, d24, state })
        : await page.evaluate((s, o) => window.s3.time(s, o), scene, { scale, frames, noscan, tent, mode: passMode, lr, lean, rest, state });
    res.scene = name;
    res.wallMs = Date.now() - t0;
    writeFileSync(join(outDir, `${pre}_${name}.json`), JSON.stringify(res, null, 1));
    if (mode === "verdict") {
      const c = res.counts;
      const cls = ["agree", "boundary", "fade", "DEFECT"].map((k) => `${k} ${c[k] ?? 0}`).join(", ");
      const detail = Object.entries(c).filter(([k]) => k.includes(":")).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join("; ");
      const line = `- ${name}: ${res.W}x${res.H}/${stride}, n ${res.n}, covered ${res.covered} (gpu ${res.gpuCovered}); ${cls}; groups ${res.groups}, segs ${res.segs}, fills ${res.fills}; lost ${res.lost}; ${res.wallMs} ms\n  - ${detail || "(no margins)"}`;
      summary.push(line);
      console.log(line);
    } else {
      const line = `- ${name}: ${res.W}x${res.H}, gpu p50 ${res.gpu.p50?.toFixed(3)} p95 ${res.gpu.p95?.toFixed(3)} ms (n ${res.gpu.n}, timer ${res.timer}); sync p50 ${res.sync.p50.toFixed(3)} p95 ${res.sync.p95.toFixed(3)}; upload p50 ${res.upload.p50.toFixed(3)} ms (${res.upload.bytes} B, sent ${res.sentBytes ?? "-"} B); prep ${res.prepMs.toFixed(2)} ms; segs ${res.segs}, fills ${res.fills}, groups ${res.groups}; builds ${res.instanceBuilds}; lost ${res.lost}`;
      summary.push(line);
      console.log(line);
    }
  }
} finally {
  await browser.close();
  rmSync(profile, { recursive: true, force: true });
}
summary.push("", `renderer errors: ${errors.length} (favicon requests filtered: ${favicon})`, ...errors.slice(0, 20).map((e) => `- ${e}`), "");
appendFileSync(join(outDir, `${pre}_summary.md`), summary.join("\n") + "\n");
console.log(`errors ${errors.length}, favicon ${favicon}`);
for (const e of errors.slice(0, 10)) console.log(e);
