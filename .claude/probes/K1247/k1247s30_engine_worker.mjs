// K1247 s30 (2): runs the bundled bench (k1247s30_engine_entry.ts) in a module worker.
import { bench } from "./out/s30/engine/engine_bundle.mjs";
self.onmessage = async (e) => {
  const frames = await Promise.all(e.data.urls.map((u) => fetch(u).then((r) => r.json())));
  self.postMessage(bench(frames, e.data.warm, e.data.reps));
};
