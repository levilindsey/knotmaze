// K1362 c1: the gf build worker. rp=gf's per-frame build (gf_build.ts: the
// lean scene and the tables) runs here, off main: gf_app.ts posts a gathered
// input `{ id, input, aa }` (the sample buffers transferred), and this posts
// back `{ id, T, exportMs, tablesMs }` (the tables' buffers transferred) or
// `{ id, error }`. One build at a time; gf_app.ts posts the next only after
// the last came back, so a build always reads the newest frame. The physics
// worker is untouched: this is a second module worker, rp=gf only.
import type { SceneExportInput } from "../field/scene_export";
import { gfBuild, tablesTransfer } from "./gf_build";

interface Req {
  id: number;
  input: SceneExportInput;
  aa: number;
}

interface WorkerScope {
  postMessage(msg: unknown, options?: { transfer: Transferable[] }): void;
  onmessage: ((e: MessageEvent<Req>) => void) | null;
}
const scope = self as unknown as WorkerScope;
scope.onmessage = (e: MessageEvent<Req>): void => {
  const { id, input, aa } = e.data;
  try {
    const t0 = performance.now();
    const r = gfBuild(input, aa);
    scope.postMessage(
      { id, T: r.T, exportMs: r.exportMs, tablesMs: r.tablesMs, workMs: performance.now() - t0 },
      { transfer: tablesTransfer(r.T) }
    );
  } catch (err) {
    scope.postMessage({ id, error: err instanceof Error ? err.message : String(err) });
  }
};
scope.postMessage({ hello: true });
