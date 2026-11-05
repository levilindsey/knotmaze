// K307 trace harness (probe code, not app code): which WebGL programs compile
// and link inside the intro's main-thread freezes. Chrome launch and timing
// from K7's k7_frames.mjs (headed, hardware GPU, off-screen, own profile).
// Run under the perf lock (run_k307.ps1).
//
//   node --max-old-space-size=8192 trace_intro.mjs <origin> <label> <path?query|->
//        [--ms 8000]      trace window from navigation (ms)
//        [--max 14]       wrapper/frames window from navigation (s)
//        [--loads 1]      loads in one browser (localStorage cleared between, disk cache kept)
//        [--restart]      then restart Chrome on the same profile and load once more
//        [--angle d3d11]  d3d11 | vulkan | default (no --use-angle flag)
//        [--trace first]  first | all | none: which loads record a performance trace
//        [--profile name] [--keep]  profile dir name under profiles/, keep it afterwards
//        [--vp 1600x900x1.5]
//
// Per load it writes runs/<label>/load<N>.json (frames, programs, slow GL
// calls, the trace summary) and, for traced loads, runs/<label>/load<N>.trace.json.
// The WebGL wrapper (evaluateOnNewDocument) times every WebGL2 call. Each
// program is tied to its sources by FNV hash and Pixi's `#define SHADER_NAME`.
// The first draw per program, uploads and every call over 4 ms are recorded;
// calls over 30 ms keep their JS stack, resolved through the build's source map.
// The trace's renderer main thread is the one carrying the `k307-origin` mark.
// Tasks over 100 ms are listed with their children and the GPU-process events
// that overlap them.
import puppeteer from "puppeteer-core";
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SourceMapConsumer } from "source-map-js";

const here = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const [origin, label, path] = argv;
const opt = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i < 0 ? d : argv[i + 1] ?? true;
};
const flag = (k) => argv.includes(`--${k}`);
const traceMs = Number(opt("ms", 8000));
const maxS = Number(opt("max", 14));
const loads = Number(opt("loads", 1));
const restart = flag("restart");
const angle = String(opt("angle", "d3d11"));
const traceWhich = String(opt("trace", "first"));
const keep = flag("keep");
const profName = String(opt("profile", `${label}-${process.pid}`));
const [vw, vh, dsf] = String(opt("vp", "1600x900x1.5")).split("x").map(Number);
const outDir = join(here, "runs", label);
mkdirSync(outDir, { recursive: true });
const profile = join(here, "profiles", profName);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const url = `${origin}/${path === "-" ? "" : path}`;

const CATEGORIES = [
  "devtools.timeline", "disabled-by-default-devtools.timeline", "gpu",
  "disabled-by-default-gpu.service", "gpu.angle", "v8", "blink", "toplevel",
  "blink.user_timing", "__metadata",
];

// ---------------------------------------------------------------- the page side
function instrument() {
  if (!/^https?:/.test(location.protocol)) return;
  const now = performance.now.bind(performance);
  let ls0 = null;
  try { ls0 = Object.keys(localStorage); } catch { /* no storage */ }
  const K = (window.__k307 = {
    t0: now(), ls0, rows: [], progs: [], slow: [], sources: {}, stats: {}, acc: null,
    exts: null, frameT: -1, inRaf: false,
  });
  try { performance.mark("k307-origin"); } catch { /* old */ }
  const fresh = () => ({ gl: 0, compile: 0, link: 0, status: 0, query: 0, draw: 0, upload: 0, sync: 0, other: 0, calls: 0 });
  K.acc = fresh();
  const hash = (s) => {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return (h >>> 0).toString(16).padStart(8, "0");
  };
  const shaderName = (src) => { const m = /#define SHADER_NAME\s+(\S+)/.exec(src); return m ? m[1] : null; };
  const shInfo = new WeakMap();
  const prInfo = new WeakMap();
  let cur = null;
  const CAT = {
    compileShader: "compile", linkProgram: "link",
    getProgramParameter: "status", getShaderParameter: "status",
    getUniformLocation: "query", getActiveUniform: "query", getActiveAttrib: "query",
    getAttribLocation: "query", getUniformBlockIndex: "query", getActiveUniformBlockParameter: "query",
    getActiveUniforms: "query", getProgramInfoLog: "query", getShaderInfoLog: "query",
    drawElements: "draw", drawArrays: "draw", drawElementsInstanced: "draw",
    drawArraysInstanced: "draw", drawRangeElements: "draw", clear: "draw",
    texImage2D: "upload", texSubImage2D: "upload", texImage3D: "upload", texSubImage3D: "upload",
    texStorage2D: "upload", texStorage3D: "upload", bufferData: "upload", bufferSubData: "upload",
    compressedTexImage2D: "upload", generateMipmap: "upload",
    readPixels: "sync", getError: "sync", finish: "sync", clientWaitSync: "sync", getParameter: "sync",
    checkFramebufferStatus: "sync",
  };
  const wrapProto = (proto) => {
    const gse = proto.getSupportedExtensions;
    for (const name of Object.getOwnPropertyNames(proto)) {
      if (name === "constructor") continue;
      const d = Object.getOwnPropertyDescriptor(proto, name);
      if (!d || typeof d.value !== "function") continue;
      const f = d.value;
      const cat = CAT[name] ?? "other";
      const st = (K.stats[name] = K.stats[name] ?? { n: 0, ms: 0, max: 0 });
      const w = function (...a) {
        if (!K.exts) {
          K.exts = []; try { K.exts = gse.call(this) ?? []; } catch { /* lost */ }
        }
        // Bookkeeping before the call.
        if (name === "useProgram") cur = a[0] ? prInfo.get(a[0]) ?? null : null;
        const s = now();
        const r = f.apply(this, a);
        const dt = now() - s;
        st.n++; st.ms += dt; if (dt > st.max) st.max = dt;
        const A = K.acc; A.gl += dt; A[cat] += dt; A.calls++;
        let prog = null;
        if (name === "createShader") {
          shInfo.set(r, { type: a[0] === 0x8b31 ? "vs" : "fs" });
        } else if (name === "shaderSource") {
          const rec = shInfo.get(a[0]) ?? { type: "?" };
          rec.hash = hash(a[1]); rec.name = shaderName(a[1]); rec.len = a[1].length;
          shInfo.set(a[0], rec);
          if (!K.sources[rec.hash]) K.sources[rec.hash] = a[1];
        } else if (name === "compileShader") {
          const rec = shInfo.get(a[0]);
          if (rec) { rec.compileT = s; rec.compileMs = dt; }
        } else if (name === "attachShader") {
          let p = prInfo.get(a[0]);
          if (!p) {
            p = { id: K.progs.length, frameT: K.frameT, inRaf: K.inRaf, draws: 0, drawMs: 0, queryMs: 0, polls: 0, pollMs: 0 };
            prInfo.set(a[0], p);
            K.progs.push(p);
          }
          const sh = shInfo.get(a[1]);
          if (sh) {
            p[sh.type] = sh.hash; p[`${sh.type}Name`] = sh.name; p[`${sh.type}Len`] = sh.len;
            p.compileMs = (p.compileMs ?? 0) + (sh.compileMs ?? 0);
          }
          p.name = p.fsName ?? p.vsName ?? "?";
        } else if (name === "linkProgram") {
          prog = prInfo.get(a[0]);
          if (prog) { prog.linkT = s; prog.linkMs = dt; prog.frameT = K.frameT; prog.inRaf = K.inRaf; }
        } else if (name === "getProgramParameter") {
          prog = prInfo.get(a[0]);
          if (prog && a[1] === 0x8b82 && prog.statusT === undefined) { prog.statusT = s; prog.statusMs = dt; }
          if (prog && a[1] === 0x91b1) { prog.polls++; prog.pollMs += dt; if (r && prog.doneT === undefined) prog.doneT = s + dt; }
        } else if (cat === "query" && a[0] && prInfo.get(a[0])) {
          prog = prInfo.get(a[0]); prog.queryMs += dt;
        } else if (cat === "draw" && name !== "clear") {
          prog = cur;
          if (cur) {
            if (cur.firstDrawT === undefined) { cur.firstDrawT = s; cur.firstDrawMs = dt; }
            cur.draws++; cur.drawMs += dt;
          }
        }
        if (dt > 4) {
          const ev = [+s.toFixed(2), +dt.toFixed(2), name, prog?.name ?? (cat === "draw" ? cur?.name ?? "" : ""), +K.frameT.toFixed(2)];
          if (dt > 30) ev.push(new Error().stack.split("\n").slice(2, 16).map((l) => l.trim()).join(" | "));
          K.slow.push(ev);
        }
        return r;
      };
      Object.defineProperty(proto, name, { ...d, value: w });
    }
  };
  wrapProto(WebGL2RenderingContext.prototype);
  // Frames (pixi's rAF callback = main.ts ticker + the pixi render): t, cb ms,
  // GL ms by kind, reveal 0/1/2, settle phase, perf state.
  const flush = () => {
    let rev = -1, phase = "", state = "";
    try {
      const r = window.__knotReveal;
      if (r) { const v = r(); rev = v ? (v.done ? 2 : 1) : 0; }
      const s = window.__knotSettle?.(); if (s) phase = s.phase + (s.loaderShown ? "+L" : "");
      const p = window.__knotPerf?.(1); if (p) state = p.state;
    } catch { /* not ready */ }
    const A = K.acc, f2 = (x) => +x.toFixed(2);
    K.rows.push([f2(W.t), f2(W.ms), f2(A.gl), f2(A.compile + A.link), f2(A.status), f2(A.query), f2(A.draw), f2(A.upload), f2(A.sync), f2(A.other), A.calls, rev, phase, state]);
    K.acc = fresh();
  };
  const W = { t: -1, ms: 0 };
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) =>
    raf((t) => {
      if (W.t !== t) { if (W.t >= 0) flush(); W.t = t; W.ms = 0; K.frameT = t; }
      const s = now();
      K.inRaf = true;
      try { cb(t); } finally { K.inRaf = false; W.ms += now() - s; }
    });
}

// ---------------------------------------------------------------- trace analysis
function analyzeTrace(file, k) {
  const raw = JSON.parse(readFileSync(file, "utf8"));
  const evs = Array.isArray(raw) ? raw : raw.traceEvents;
  const pname = new Map(), tname = new Map();
  for (const e of evs) {
    if (e.ph !== "M") continue;
    if (e.name === "process_name") pname.set(e.pid, e.args?.name);
    if (e.name === "thread_name") tname.set(`${e.pid}:${e.tid}`, e.args?.name);
  }
  const mark = evs.find((e) => e.name === "k307-origin" && e.ts);
  if (!mark) return { error: "no k307-origin mark in the trace" };
  const rpid = mark.pid, rtid = mark.tid;
  const gpuPid = [...pname].find(([, n]) => n === "GPU Process")?.[0];
  // Page ms -> trace us, and back.
  const toUs = (ms) => mark.ts + (ms - k.t0) * 1000;
  const toMs = (us) => +((us - mark.ts) / 1000 + k.t0).toFixed(1);
  // Normalize B/E pairs to complete events per thread.
  const byThread = new Map();
  for (const e of evs) {
    if (e.ph !== "X" && e.ph !== "B" && e.ph !== "E") continue;
    const key = `${e.pid}:${e.tid}`;
    if (!byThread.has(key)) byThread.set(key, []);
    byThread.get(key).push(e);
  }
  const complete = new Map();
  for (const [key, list] of byThread) {
    list.sort((a, b) => a.ts - b.ts);
    const out = [], stack = [];
    for (const e of list) {
      if (e.ph === "X") out.push(e);
      else if (e.ph === "B") stack.push(e);
      else { const b = stack.pop(); if (b) out.push({ ...b, ph: "X", dur: e.ts - b.ts }); }
    }
    complete.set(key, out);
  }
  const main = complete.get(`${rpid}:${rtid}`) ?? [];
  // Top-level tasks only: a RunTask nested in another listed one is the same task.
  const tasks = main.filter((e) => (e.name === "RunTask" || e.name === "ThreadControllerImpl::RunTask") && e.dur > 100000)
    .sort((a, b) => a.ts - b.ts || b.dur - a.dur)
    .filter((e, i, xs) => !xs.slice(0, i).some((o) => o.ts <= e.ts && o.ts + o.dur >= e.ts + e.dur));
  const res = { rendererPid: rpid, gpuPid, tasks: [] };
  for (const t of tasks) {
    const t0 = t.ts, t1 = t.ts + t.dur;
    const kids = new Map();
    for (const e of main) {
      if (e === t || e.ts < t0 || e.ts + (e.dur ?? 0) > t1 + 1) continue;
      let n = e.name;
      if (n === "FunctionCall" && e.args?.data) n += ` ${e.args.data.functionName || "?"}@${(e.args.data.url || "").split("/").pop()}`;
      const v = kids.get(n) ?? { ms: 0, n: 0 };
      v.ms += (e.dur ?? 0) / 1000; v.n++;
      kids.set(n, v);
    }
    const gpu = new Map();
    let gpuMainBusy = 0;
    if (gpuPid !== undefined) {
      for (const [key, list] of complete) {
        if (!key.startsWith(`${gpuPid}:`)) continue;
        const th = tname.get(key) ?? key;
        // Top-level busy time on the GPU main thread (non-nested union).
        let lastEnd = -Infinity;
        for (const e of list) {
          const a = Math.max(e.ts, t0), b = Math.min(e.ts + (e.dur ?? 0), t1);
          if (b <= a) continue;
          if (th === "CrGpuMain" && e.ts >= lastEnd) { gpuMainBusy += b - a; lastEnd = e.ts + e.dur; }
          const n = `${th} | ${e.name}`;
          const v = gpu.get(n) ?? { ms: 0, n: 0 };
          v.ms += (b - a) / 1000; v.n++;
          gpu.set(n, v);
        }
      }
    }
    const top = (m, n) => [...m].sort((a, b) => b[1].ms - a[1].ms).slice(0, n).map(([k2, v]) => `${k2}: ${v.ms.toFixed(1)} ms x${v.n}`);
    res.tasks.push({
      startMs: toMs(t0), ms: +(t.dur / 1000).toFixed(1),
      children: top(kids, 14), gpu: top(gpu, 22), gpuMainBusyMs: +(gpuMainBusy / 1000).toFixed(1),
    });
  }
  // The GPU-side compile/link-looking events over the whole window, in order.
  const gpuCompile = [];
  if (gpuPid !== undefined) {
    for (const [key, list] of complete) {
      if (!key.startsWith(`${gpuPid}:`)) continue;
      for (const e of list) {
        if (!/link|compile|translat|program|shader|D3DCompile|HLSL|Executable/i.test(e.name)) continue;
        if ((e.dur ?? 0) < 20000) continue;
        gpuCompile.push([toMs(e.ts), +(e.dur / 1000).toFixed(1), `${tname.get(key) ?? key} | ${e.name}`]);
      }
    }
  }
  gpuCompile.sort((a, b) => a[0] - b[0]);
  res.gpuCompileOver20ms = gpuCompile.slice(0, 120);
  res.toUsSample = toUs(0);
  return res;
}

// ---------------------------------------------------------------- stacks
const maps = new Map();
async function resolveStack(stack) {
  const out = [];
  for (const fr of stack.split(" | ")) {
    const m = /(?:at\s+(.*?)\s+\()?(https?:\/\/[^\s)]+):(\d+):(\d+)\)?$/.exec(fr);
    if (!m) { out.push(fr); continue; }
    const [, fn, u, line, col] = m;
    if (!maps.has(u)) {
      try { const r = await fetch(`${u}.map`); maps.set(u, r.ok ? new SourceMapConsumer(await r.json()) : null); } catch { maps.set(u, null); }
    }
    const c = maps.get(u);
    const p = c?.originalPositionFor({ line: +line, column: +col - 1 });
    out.push(p?.source ? `${p.source.replace(/^.*node_modules\//, "~").replace(/^(\.\.\/)+/, "")}:${p.line}${p.name ? ` ${p.name}` : ""}` : `${fn ?? "?"}@${u.split("/").pop()}:${line}`);
  }
  return out;
}

// ---------------------------------------------------------------- the browser
async function launch() {
  const args = [
    "--no-first-run", "--no-default-browser-check",
    "--window-position=2200,50", "--window-size=1720,1060",
    "--disable-features=CalculateNativeWinOcclusion",
    "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding",
  ];
  if (angle !== "default") args.unshift(`--use-angle=${angle}`);
  return puppeteer.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: false, userDataDir: profile, protocolTimeout: 300000, args,
  });
}

async function oneLoad(browser, page, n, trace) {
  const tracePath = join(outDir, `load${n}.trace.json`);
  const errors = [];
  page.removeAllListeners("pageerror");
  page.on("pageerror", (e) => errors.push(e.message));
  if (trace) await page.tracing.start({ path: tracePath, categories: CATEGORIES });
  const wall0 = Date.now();
  await page.goto(url, { waitUntil: "load", timeout: 60000 });
  await page.bringToFront();
  const pnow = () => page.evaluate(() => performance.now());
  let traced = !trace;
  for (;;) {
    const t = await pnow();
    if (!traced && t >= traceMs) { await page.tracing.stop(); traced = true; }
    if (t >= maxS * 1000 && traced) break;
    await sleep(500);
  }
  const got = await page.evaluate(() => {
    const K = window.__k307;
    let renderer = "";
    try {
      const gl = document.createElement("canvas").getContext("webgl2");
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    } catch { /* none */ }
    let daily = null;
    try { const d = window.__knotDaily?.(); daily = d ? { n: d.daily, today: d.today, saved: !!d.saved, badge: d.badge, moves: d.moves.length } : null; } catch { /* none */ }
    return {
      K: { t0: K.t0, ls0: K.ls0, rows: K.rows, progs: K.progs, slow: K.slow, stats: K.stats, sources: K.sources,
        parallel: (K.exts ?? []).includes("KHR_parallel_shader_compile"), exts: K.exts },
      renderer, daily, settle: window.__knotSettle?.() ?? null, proto: window.__k307Proto?.() ?? null,
      stamp: [...document.querySelectorAll("div")].map((d) => d.textContent ?? "").find((t) => /^P\d/.test(t)) ?? "",
      canvas: (() => { const c = document.querySelector("canvas"); return c ? `${c.width}x${c.height}` : ""; })(),
    };
  });
  const k = got.K;
  const rows = k.rows;
  // rows: [t, cb, gl, compile+link, status, query, draw, upload, sync, other, calls, rev, phase, state]
  const first = (pred) => { for (let i = 0; i < rows.length; i++) if (pred(rows[i])) return i; return -1; };
  const iRev = first((r) => r[11] === 1);
  const iVis = iRev >= 0 ? iRev : first((r) => r[13] === "live");
  const sec = (ms) => +(ms / 1000).toFixed(3);
  const longest = rows.map((r, i) => [i, r]).sort((a, b) => b[1][1] - a[1][1]).slice(0, 6)
    .map(([, r]) => ({ t: sec(r[0]), cb: Math.round(r[1]), gl: Math.round(r[2]), status: Math.round(r[4]), query: Math.round(r[5]), draw: Math.round(r[6]), upload: Math.round(r[7]), sync: Math.round(r[8]), calls: r[10], rev: r[11], phase: r[12] }));
  const progs = k.progs.map((p) => ({
    id: p.id, name: p.name, vs: p.vs, fs: p.fs, vsLen: p.vsLen, fsLen: p.fsLen,
    frame: sec(p.frameT), inRaf: p.inRaf, linkT: p.linkT !== undefined ? sec(p.linkT) : null,
    statusMs: p.statusMs !== undefined ? +p.statusMs.toFixed(1) : null,
    queryMs: +p.queryMs.toFixed(1), firstDrawT: p.firstDrawT !== undefined ? sec(p.firstDrawT) : null,
    firstDrawMs: p.firstDrawMs !== undefined ? +p.firstDrawMs.toFixed(2) : null, draws: p.draws,
    polls: p.polls, doneT: p.doneT !== undefined ? sec(p.doneT) : null,
  }));
  const slow = [];
  for (const ev of k.slow) {
    const o = { t: sec(ev[0]), ms: ev[1], call: ev[2], prog: ev[3], frame: sec(ev[4]) };
    if (ev[5]) o.stack = await resolveStack(ev[5]);
    slow.push(o);
  }
  let traceSummary = null;
  if (trace && existsSync(tracePath)) {
    traceSummary = analyzeTrace(tracePath, k);
    traceSummary.traceMB = +(statSync(tracePath).size / 1e6).toFixed(1);
  }
  const res = {
    label, load: n, url, angle, at: new Date().toISOString(), wallMs: Date.now() - wall0, t0: k.t0,
    stamp: got.stamp.split(" | ")[0], canvas: got.canvas, renderer: got.renderer, parallel: k.parallel,
    ls0: k.ls0, daily: got.daily,
    firstVisibleS: iVis >= 0 ? sec(rows[iVis][0]) : null,
    presettle: got.settle?.presettle ?? null, proto: got.proto,
    longest, programs: progs, slow, trace: traceSummary, errors,
    glTop: Object.entries(k.stats).filter(([, v]) => v.ms > 5).sort((a, b) => b[1].ms - a[1].ms).slice(0, 14)
      .map(([n2, v]) => `${n2}: ${v.ms.toFixed(0)} ms x${v.n} max ${v.max.toFixed(0)}`),
  };
  writeFileSync(join(outDir, `load${n}.json`), JSON.stringify({ ...res, rows, sources: k.sources }, null, 0));
  return res;
}

function brief(r) {
  const lines = [];
  lines.push(`== ${r.label} load${r.load} ${r.stamp} ${r.canvas} ${r.angle} | ${r.renderer} | parallel ${r.parallel}`);
  lines.push(`   ls0 [${(r.ls0 ?? []).join(",")}] daily ${JSON.stringify(r.daily)} | firstVisible ${r.firstVisibleS}s presettle ${r.presettle ? `${Math.round(r.presettle.ms)}ms ${r.presettle.endedBy} loader ${r.presettle.loader}` : "-"}`);
  for (const f of r.longest.slice(0, 4)) lines.push(`   frame ${f.t}s cb ${f.cb} gl ${f.gl} (status ${f.status} query ${f.query} draw ${f.draw} upload ${f.upload} sync ${f.sync}) rev ${f.rev} ${f.phase}`);
  for (const p of r.programs) lines.push(`   prog#${p.id} ${p.name} vs ${p.vs} fs ${p.fs}(${p.fsLen}) frame ${p.frame}s link@${p.linkT} status ${p.statusMs} ms query ${p.queryMs} firstDraw@${p.firstDrawT} ${p.firstDrawMs} ms draws ${p.draws}${p.polls ? ` polls ${p.polls} done@${p.doneT}` : ""}`);
  if (r.trace?.tasks) for (const t of r.trace.tasks) lines.push(`   TASK @${t.startMs}ms ${t.ms}ms gpuMainBusy ${t.gpuMainBusyMs}ms`);
  if (r.proto) lines.push(`   PROTO ${JSON.stringify(r.proto)}`);
  if (r.errors.length) lines.push(`   ERRORS ${r.errors.join(" ; ")}`);
  return lines.join("\n");
}

// ---------------------------------------------------------------- main
// `node trace_intro.mjs --reanalyze runs/<label>`: redo the trace summaries
// of a finished run from its saved traces (no browser).
if (argv[0] === "--reanalyze") {
  const dir = join(here, argv[1].replace(/^.*runs[\\/]/, "runs/"));
  for (let n = 1; existsSync(join(dir, `load${n}.json`)); n++) {
    const tf = join(dir, `load${n}.trace.json`);
    if (!existsSync(tf)) continue;
    const j = JSON.parse(readFileSync(join(dir, `load${n}.json`), "utf8"));
    j.trace = analyzeTrace(tf, { t0: j.t0 });
    j.trace.traceMB = +(statSync(tf).size / 1e6).toFixed(1);
    writeFileSync(join(dir, `load${n}.json`), JSON.stringify(j));
    console.log(brief(j));
    for (const t of j.trace.tasks ?? []) console.log(JSON.stringify(t, null, 1));
  }
  process.exit(0);
}
const results = [];
let browser = await launch();
try {
  let page = (await browser.pages())[0] ?? (await browser.newPage());
  const setup = async (pg) => {
    await pg.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
    await pg.setViewport({ width: vw, height: vh, deviceScaleFactor: dsf });
    await pg.evaluateOnNewDocument(instrument);
  };
  await setup(page);
  const clearLs = async () => {
    await page.goto("about:blank");
    const c = await page.createCDPSession();
    await c.send("Storage.clearDataForOrigin", { origin, storageTypes: "local_storage" });
    await c.detach();
  };
  for (let n = 1; n <= loads; n++) {
    if (n > 1) await clearLs();
    const trace = traceWhich === "all" || (traceWhich === "first" && n === 1);
    const r = await oneLoad(browser, page, n, trace);
    results.push(r);
    console.log(brief(r));
  }
  if (restart) {
    await clearLs();
    await browser.close();
    await sleep(1500);
    browser = await launch();
    page = (await browser.pages())[0] ?? (await browser.newPage());
    await setup(page);
    const r = await oneLoad(browser, page, loads + 1, traceWhich === "all");
    r.restarted = true;
    results.push(r);
    console.log(brief(r));
  }
} finally {
  await browser.close();
  if (!keep) { await sleep(500); try { rmSync(profile, { recursive: true, force: true }); } catch { /* best effort */ } }
}
writeFileSync(join(outDir, "summary.json"), JSON.stringify(results.map(({ programs, slow, ...r }) => ({ ...r, programs, slow })), null, 1));
