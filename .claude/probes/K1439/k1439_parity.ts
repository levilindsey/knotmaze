// K1439: GPU = mirror with home membership on. The probe program (gf_glsl.ts, read back through GfTarget) drawn by
// GfPass { home: true } at pass.homeFade = fl, against eval.ts's GfEval on float32-rounded tables with homeOn and
// fadeLength = fl, pixel by pixel over the whole scene (K1362 s2's bridge: a headed Chrome on the worktree's Vite dev
// server; tables and pixels cross over a local HTTP server). The same pass with home off against the mirror with home
// off is the control (the parity the stage started from), and `home` counts the pixels where the mirror's home on and
// off differ (what the comparison covers). Under the perf lock (the caller's):
//   $env:BASE = 'http://127.0.0.1:5521/'
//   node scripts/run_node.mjs .claude/probes/K1439/k1439_parity.ts <tag> --scene=def,muse_hash --fl=0,0.14,1.2 --ppu=80
// Output: .claude/probes/K1439/out/parity_<tag>.json and a line per scene and fl.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer, { type Browser, type Page } from "puppeteer-core";
import { loadScene } from "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K1314/k1314_census.ts";
import { GfEval } from "../../../src/render/gpu_field/eval";
import { buildTables, type GfTables } from "../../../src/render/gpu_field/tables";

const here = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE ?? "http://127.0.0.1:5521/";
let server: Server | null = null; let port = 0; let browser: Browser | null = null; let page: Page | null = null; let profile = "";
let blob: Buffer = Buffer.alloc(0); const posts = new Map<number, Buffer>(); let tileId = 0;

function tablesBlob(T: GfTables): Buffer {
  const meta: { n: string; t: string; off: number; len: number }[] = []; const sc: Record<string, unknown> = {};
  const parts: Buffer[] = []; let off = 0;
  for (const [k, v] of Object.entries(T)) {
    if (ArrayBuffer.isView(v)) {
      const b = Buffer.from(v.buffer, v.byteOffset, v.byteLength); const pad = (8 - (b.length % 8)) % 8;
      meta.push({ n: k, t: v.constructor.name, off, len: (v as unknown as { length: number }).length });
      parts.push(b); if (pad) parts.push(Buffer.alloc(pad)); off += b.length + pad;
    } else if (typeof v !== "function") sc[k] = v;
  }
  const head = Buffer.from(JSON.stringify({ meta, sc })); const hl = Buffer.alloc(8); hl.writeUInt32LE(head.length, 0);
  return Buffer.concat([hl, head, Buffer.alloc((8 - (head.length % 8)) % 8), ...parts]);
}
async function gpuStart(): Promise<string> {
  server = createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (req.method === "OPTIONS") { res.setHeader("Access-Control-Allow-Headers", "*"); res.end(); return; }
    if (req.method === "GET") { res.end(blob); return; }
    const id = Number(new URL(req.url ?? "/", "http://x").searchParams.get("id"));
    const parts: Buffer[] = []; req.on("data", (d: Buffer) => parts.push(d)); req.on("end", () => { posts.set(id, Buffer.concat(parts)); res.end("ok"); });
  });
  await new Promise<void>((r) => server!.listen(0, "127.0.0.1", r));
  port = (server.address() as { port: number }).port;
  profile = mkdtempSync(join(tmpdir(), "k1439-parity-"));
  browser = await puppeteer.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: profile,
    args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=600,400",
      "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
  });
  page = await browser.newPage();
  page.on("pageerror", (e) => console.error("pageerror", String(e)));
  await page.goto(`${BASE}@vite/client`, { waitUntil: "load" });
  return page.evaluate(async () => {
    const W = window as unknown as Record<string, unknown>;
    const mod = await (new Function("p", "return import(p)") as (p: string) => Promise<any>)("/src/render/gpu_field/gf_pass.ts");
    const cv = document.createElement("canvas"); cv.width = 4; cv.height = 4;
    cv.addEventListener("webglcontextlost", () => { W.__lost = ((W.__lost as number) ?? 0) + 1; });
    const gl = cv.getContext("webgl2", { antialias: false })!;
    W.__gf = { gl, off: new mod.GfPass(gl, true), on: new mod.GfPass(gl, true, undefined, undefined, false, { home: true }), tg: new mod.GfTarget(gl, 3, true) };
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    return dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : "?";
  });
}
async function gpuStop(): Promise<void> {
  try { await browser?.close(); } catch { /* closing */ }
  server?.close();
  if (profile) try { rmSync(profile, { recursive: true, force: true }); } catch { /* locked */ }
}
async function gpuTables(T: GfTables): Promise<void> {
  blob = tablesBlob(T);
  await page!.evaluate(async (pt: number) => {
    const W = window as unknown as Record<string, any>;
    const ab = await (await fetch(`http://127.0.0.1:${pt}/t`)).arrayBuffer();
    const hl = new DataView(ab).getUint32(0, true);
    const head = JSON.parse(new TextDecoder().decode(new Uint8Array(ab, 8, hl)));
    const base = 8 + hl + ((8 - (hl % 8)) % 8);
    const T: Record<string, unknown> = { ...head.sc };
    for (const q of head.meta) T[q.n] = new (globalThis as any)[q.t](ab, base + q.off, q.len);
    W.__gf.off.upload(T); W.__gf.on.upload(T);
  }, port);
}
async function gpuTile(which: "on" | "off", fl: number, c0: number, r0: number, Wd: number, Hd: number, ppu: number): Promise<Float32Array> {
  const id = ++tileId;
  const res = await page!.evaluate(async (a: { pt: number; id: number; which: string; fl: number; c0: number; r0: number; Wd: number; Hd: number; ppu: number }) => {
    const W = window as unknown as Record<string, any>; const { gl, tg } = W.__gf; const pass = W.__gf[a.which];
    pass.homeFade = a.fl;
    tg.resize(a.Wd, a.Hd);
    pass.draw(tg, [1 / a.ppu, a.c0 / a.ppu, 1 / a.ppu, a.r0 / a.ppu], [0, 0, a.Wd, a.Hd], false);
    const n = a.Wd * a.Hd * 4; const buf = new Float32Array(3 * n);
    for (let i = 0; i < 3; i++) tg.read(i, buf.subarray(i * n, (i + 1) * n));
    await fetch(`http://127.0.0.1:${a.pt}/p?id=${a.id}`, { method: "POST", body: buf });
    return { lost: (W.__lost as number) ?? 0, err: gl.getError() as number };
  }, { pt: port, id, which, fl, c0, r0, Wd, Hd, ppu });
  if (res.lost) throw new Error(`webglcontextlost (${res.lost})`);
  if (res.err) throw new Error(`GL error ${res.err}`);
  const raw = posts.get(id); posts.delete(id);
  if (!raw || raw.length !== 3 * Wd * Hd * 16) throw new Error(`tile ${id}: ${raw?.length} bytes`);
  return new Float32Array(new Uint8Array(raw).buffer);
}
function t32(T: GfTables): GfTables {
  const o: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(T)) o[k] = v instanceof Float64Array ? Float64Array.from(new Float32Array(v)) : typeof v === "number" ? Math.fround(v) : v;
  return o as unknown as GfTables;
}
type Chan = { max: number; at: number[]; over: number[] };
const chan = (): Chan => ({ max: 0, at: [0, 0], over: [0, 0, 0] });
function newDiff() { return { px: 0, ink: chan(), cov: chan(), s: chan(), chainMis: 0, chainMisAt: [] as number[][], winMis: 0, segMis: 0, kMis: 0, home: 0, homeInk: 0 }; }
function add(c: Chan, d: number, x: number, y: number): void {
  if (d > c.max) { c.max = d; c.at = [+x.toFixed(4), +y.toFixed(4)]; }
  if (d > 1e-3) c.over[0]++; if (d > 1e-2) c.over[1]++; if (d > 1e-1) c.over[2]++;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const tag = args.find((a) => !a.startsWith("--")) ?? "p";
  const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
  const scenes = (opt("scene") ?? "def,muse_hash").split(",");
  const fls = (opt("fl") ?? "0,0.14,1.2").split(",").map(Number);
  const ppu = Number(opt("ppu") ?? 80);
  const TILE = 1024;
  const renderer = await gpuStart();
  console.log(`renderer ${renderer}`);
  const out: Record<string, unknown>[] = [];
  for (const nm of scenes) {
    const sc = loadScene(nm) as never as { look: { halfWidth: number }; chains: { pts: number[] }[]; camera: { pxPerUnit: number } };
    const T = buildTables(sc as never, { aa: 0.5 / (sc.camera.pxPerUnit * 2) });
    await gpuTables(T);
    const T32 = t32(T); const T32h: GfTables = { ...T32, homeOn: true };
    const h = sc.look.halfWidth;
    let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
    for (const c of sc.chains) for (let i = 0; i < c.pts.length; i += 2) { x0 = Math.min(x0, c.pts[i]); x1 = Math.max(x1, c.pts[i]); y0 = Math.min(y0, c.pts[i + 1]); y1 = Math.max(y1, c.pts[i + 1]); }
    const g0 = Math.floor((x0 - 3 * h) * ppu); const q0 = Math.floor((y0 - 3 * h) * ppu);
    const GW = Math.ceil((x1 + 3 * h) * ppu) - g0; const GH = Math.ceil((y1 + 3 * h) * ppu) - q0;
    const runs: { which: "on" | "off"; fl: number }[] = [{ which: "off", fl: 0.14 }, ...fls.map((fl) => ({ which: "on" as const, fl }))];
    for (const run of runs) {
      const t0 = Date.now();
      const D = newDiff();
      const E = new GfEval(run.which === "on" ? T32h : T32); E.fadeLength = run.fl;
      const Eo = run.which === "on" ? new GfEval(T32) : null;
      for (let ty = 0; ty < GH; ty += TILE) for (let tx = 0; tx < GW; tx += TILE) {
        const c0 = g0 + tx; const r0 = q0 + ty; const Wd = Math.min(TILE, GW - tx); const Hd = Math.min(TILE, GH - ty);
        const G = await gpuTile(run.which, run.fl, c0, r0, Wd, Hd, ppu);
        const n4 = 4 * Wd * Hd;
        for (let r = 0; r < Hd; r++) for (let c = 0; c < Wd; c++) {
          const i = 4 * (r * Wd + c); const x = (c0 + c + 0.5) / ppu; const y = (r0 + r + 0.5) / ppu;
          const gInk = G[i]; const gCov = G[i + 1]; const gCh = Math.round(G[i + 2]); const gS = G[i + 3];
          const gWk = Math.round(G[n4 + i]); const gSeg = Math.round(G[n4 + i + 3]); const gK = Math.round(G[2 * n4 + i]);
          const ev = E.eval(x, y); D.px++;
          add(D.ink, Math.abs(gInk - ev.ink), x, y); add(D.cov, Math.abs(gCov - ev.cov), x, y);
          if (gCh !== ev.chain) { D.chainMis++; if (D.chainMisAt.length < 24) D.chainMisAt.push([+x.toFixed(4), +y.toFixed(4), gCh, ev.chain]); }
          else if (gCh >= 0) add(D.s, Math.abs(gS - ev.s), x, y);
          if (gWk !== ev.winKind) D.winMis++; if (gSeg !== ev.nSeg) D.segMis++; if (gK !== ev.nK) D.kMis++;
          if (Eo) {
            const eInk = ev.ink; const eCh = ev.chain; const o = Eo.eval(x, y);
            if (o.chain !== eCh || Math.abs(o.ink - eInk) > 1e-3) D.home++;
            if (Math.abs(o.ink - eInk) > 1e-2) D.homeInk++;
          }
        }
      }
      const rec = { scene: nm, ppu, which: run.which, fl: run.fl, ...D, ms: Date.now() - t0 };
      out.push(rec);
      console.log(`${nm} ${run.which} fl ${run.fl}: ${D.px} px; ink max ${D.ink.max.toExponential(2)} at ${D.ink.at} (>1e-3 ${D.ink.over[0]}, >1e-2 ${D.ink.over[1]}, >0.1 ${D.ink.over[2]}); cov max ${D.cov.max.toExponential(2)} (>1e-2 ${D.cov.over[1]}); chainMis ${D.chainMis}; s max ${D.s.max.toExponential(2)}; win/seg/k mis ${D.winMis}/${D.segMis}/${D.kMis}; home-changed px ${D.home} (ink >1e-2 ${D.homeInk}); ${rec.ms} ms`);
    }
  }
  const dir = join(here, "out"); mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `parity_${tag}.json`), JSON.stringify({ renderer, base: BASE, out }, null, 1));
}
void main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => gpuStop());
