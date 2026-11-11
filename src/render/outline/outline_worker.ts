// K1240 S4: the redesign's builds off the main thread (rp=outline).
// One module worker, one OutlineModel: a scene comes in, the draw's arrays
// go back (transferred). A new diagram (diagramKey), or a frame the carried
// structure cannot take (paintFrame's "run count changed" when an arm's s
// moves), restructures. Why a worker of its own and not main or K7's
// physics worker: outline_app.ts's header.
import { OutlineModel, diagramKey } from "./outline_model";
import type { SceneIn } from "./outline";

export interface OutlineRequest {
  id: number;
  scene: SceneIn;
}

/** One frame's draw data. idx and run come only with a new structure. */
export interface OutlineReply {
  id: number;
  error?: string;
  restructured: boolean;
  key: string;
  ks: number;
  /** Worker wall ms: this message, the model's structure, its last frame. */
  ms: number;
  structureMs: number;
  frameMs: number;
  idx: Uint32Array | null;
  run: Int32Array | null;
  pos: Float32Array;
  pkey: Float32Array;
  w: Float32Array;
  s: Float32Array;
  tex: Float32Array;
  texW: number;
  texH: number;
  bandPos: Float32Array;
  bandCol: Float32Array;
  bandAlpha: Float32Array;
  bandCount: number;
}

interface Scope {
  onmessage: ((e: MessageEvent<OutlineRequest>) => void) | null;
  postMessage(m: unknown, transfer: Transferable[]): void;
}
const scope = self as unknown as Scope;
let model: OutlineModel | null = null;

scope.onmessage = (e: MessageEvent<OutlineRequest>): void => {
  const { id, scene } = e.data;
  const t0 = performance.now();
  try {
    let restructured = false;
    if (!model || model.key !== diagramKey(scene)) {
      model = new OutlineModel(scene);
      restructured = true;
    } else {
      try {
        model.update(scene);
      } catch {
        model = new OutlineModel(scene);
        restructured = true;
      }
    }
    const m = model;
    const pd = m.pd;
    // The paint arrays are the model's own (paintFrame writes them in
    // place): copies go; the band is new each frame and goes itself.
    const r: OutlineReply = {
      id,
      restructured,
      key: m.key,
      ks: m.ks,
      ms: performance.now() - t0,
      structureMs: m.structureMs,
      frameMs: restructured ? 0 : m.frameMs,
      idx: restructured ? pd.idx.slice() : null,
      run: restructured ? pd.run.slice() : null,
      pos: pd.pos.slice(),
      pkey: pd.key.slice(),
      w: pd.w.slice(),
      s: pd.s.slice(),
      tex: pd.tex.slice(),
      texW: pd.texW,
      texH: pd.texH,
      bandPos: m.band.bandPos,
      bandCol: m.band.bandCol,
      bandAlpha: m.band.bandAlpha,
      bandCount: m.band.bandCount,
    };
    const tr: Transferable[] = [r.pos.buffer, r.pkey.buffer, r.w.buffer, r.s.buffer, r.tex.buffer, r.bandPos.buffer, r.bandCol.buffer, r.bandAlpha.buffer];
    if (r.idx) tr.push(r.idx.buffer);
    if (r.run) tr.push(r.run.buffer);
    scope.postMessage(r, tr);
  } catch (err) {
    model = null;
    scope.postMessage({ id, error: err instanceof Error ? err.message : String(err) }, []);
  }
};
