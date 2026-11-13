// K1247 s35: is the pool's K-way slowdown Chrome's or the machine's? Runs the SAME worker bundle the pool page
// runs (out/s35/pool/outline_worker_bundle.mjs, the app's outline_worker.ts) in K Node worker_threads, each
// updating back to back over a capture drag (ping-pong, sub=1, its own start offset), with no 60 Hz input cap
// and no main-thread clone (each worker reads the frames itself; the reply is kept, not posted). Reports the
// per-update ms (the reply's own ms) p50 / p95 over all workers, total updates/s, and the GC share (perf_hooks
// gc entries over the measured wall). ygen=<MB> sets each worker's young generation (fewer scavenges).
//   node .claude/probes/K1247/k1247s35_contend.mjs <dragDir> [ks=1,2,4,6,8,12] [sec=6] [warm=2] [ygen=0]
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PerformanceObserver, performance } from "node:perf_hooks";

const here = dirname(fileURLToPath(import.meta.url));
const qt = (a, p) => { if (!a.length) return NaN; const b = [...a].sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(p * b.length))]; };

if (isMainThread) {
  const root = resolve(here, "../../..");
  const arg = (k, d) => process.argv.find((a) => a.startsWith(`${k}=`))?.slice(k.length + 1) ?? d;
  const dragDir = resolve(root, process.argv[2]);
  const ks = arg("ks", "1,2,4,6,8,12").split(",").map(Number);
  const sec = +arg("sec", "6"); const warm = +arg("warm", "2"); const ygen = +arg("ygen", "0");
  console.log(`node ${process.version}; ${dragDir}; ${sec} s measured after ${warm} s warm; young gen ${ygen || "default"} MB`);
  console.log("K   upd ms p50/p95   updates/s   per-worker/s   gc share p50 (max)");
  for (const K of ks) {
    const ws = []; const done = [];
    for (let k = 0; k < K; k++) {
      const w = new Worker(fileURLToPath(import.meta.url), { workerData: { dragDir, k, sec, warm }, ...(ygen ? { resourceLimits: { maxYoungGenerationSizeMb: ygen } } : {}) });
      ws.push(w);
      done.push(new Promise((res, rej) => { w.on("message", (m) => { if (m.ready) w.ready = true; else res(m); }); w.on("error", rej); }));
    }
    await new Promise((res) => { const chk = () => (ws.every((w) => w.ready) ? res() : setTimeout(chk, 20)); chk(); });
    ws.forEach((w) => w.postMessage("go"));
    const rs = await Promise.all(done);
    ws.forEach((w) => w.terminate());
    const ms = rs.flatMap((r) => r.ms); const n = rs.reduce((a, r) => a + r.ms.length, 0);
    const gcs = rs.map((r) => r.gc);
    console.log(`${String(K).padEnd(3)} ${qt(ms, 0.5).toFixed(1)}/${qt(ms, 0.95).toFixed(1)}   ${(n / sec).toFixed(1).padStart(6)}   ${(n / sec / K).toFixed(2).padStart(6)}   ${(100 * qt(gcs, 0.5)).toFixed(1)}% (${(100 * Math.max(...gcs)).toFixed(1)}%)`);
  }
} else {
  const { dragDir, k, sec, warm } = workerData;
  let last = null;
  globalThis.self = { postMessage: (d) => { last = d; }, onmessage: null };
  await import(pathToFileURL(join(here, "out/s35/pool/outline_worker_bundle.mjs")).href);
  const files = readdirSync(dragDir).filter((f) => /^f\d+\.json$/.test(f)).sort();
  const cap = files.map((f) => JSON.parse(readFileSync(join(dragDir, f), "utf8")));
  for (const S of cap) { S.look.ctrlArc ??= 0.47; S.look.fillRec = 2; S.look.bandRec = 1; S.look.bandRecGpu = 1; }
  const seq = [...cap, ...cap.slice(1, -1).reverse()];
  // a fresh clone per update, as a posted scene arrives (structured clone on the worker side)
  const run = (i) => { self.onmessage({ data: { id: i, scene: structuredClone(seq[i % seq.length]) } }); if (last.error) throw new Error(last.error); return last; };
  run(0);
  let gcMs = 0; let measuring = false;
  const obs = new PerformanceObserver((l) => { if (measuring) for (const e of l.getEntries()) gcMs += e.duration; });
  obs.observe({ entryTypes: ["gc"] });
  parentPort.postMessage({ ready: true });
  await new Promise((r) => parentPort.once("message", r));
  const ms = []; let i = 1 + 7 * k; const t0 = performance.now();
  let tm = 0;
  while (true) {
    const now = performance.now();
    if (!measuring && now - t0 >= warm * 1000) { measuring = true; tm = now; }
    if (now - t0 >= (warm + sec) * 1000) break;
    const r = run(i++);
    if (measuring) ms.push(r.ms);
  }
  const wall = performance.now() - tm;
  await new Promise((r) => setTimeout(r, 50)); // let the observer flush
  obs.disconnect();
  parentPort.postMessage({ ms, gc: gcMs / wall });
}
